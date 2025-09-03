---
title: Proxmox 9 Upgrade
author: aj
date: 2025-09-03
image: /images/proxmox-logo.jpg
categories:
  - Proxmox
  - Virtual Machines
  - Linux
tags:
  - proxmox
  - homelab
  - virtual machine
---

In my homelab, Proxmox is the main operating system that I use for servers. It is Debian Linux with some extra packages related to virtual machines and managing virtual machines. If you are not using Proxmox, I recommend checking out a [previous post][1] that introduces Proxmox and how to install it.

I am performing an in-place upgrade of a Proxmox VE 8.x node to 9.x.

If you are following along, before you begin, create a verified backup of all your VMs and containers. An upgrade failure without a backup can result in data loss.

---

## 1. Prerequisites & Pre-Upgrade Checks

Complete these steps on each node you intend to upgrade.

### On Your Proxmox Node:

1.  **Use a Stable Connection:**
    *   Connect directly via a physical console or a remote management interface (IPMI, iDRAC, iLO). In my case, none of my low power systems have this available.
    *   If you use SSH, run the entire process inside a terminal multiplexer like `tmux` or `screen` to prevent a disconnected session from disrupting the upgrade.
        ```bash
        # Install tmux if you don't have it
        apt install tmux

        # Start a new session
        tmux
        ```

2.  **Check for Issues with the Upgrade Checker:**
    *   Proxmox provides a tool to check for common problems. Run it with the `--full` flag to get a complete report.
        ```bash
        pve8to9 --full
        ```
    *   Address any `ERROR` or `WARNING` items before proceeding. Re-run the check after fixing an issue to confirm it's resolved.

3.  **Update Your System to the Latest 8.x Version:**
    ```bash
    apt update
    apt dist-upgrade -y
    ```
    *   Ensure your system reports a version of `8.4.1` or newer.
        ```bash
        pveversion
        ```


---

## 2. The Upgrade Process

1.  **Update APT Repository Lists to "Trixie":**
    *   This command updates your system's software sources to point from the old Debian release (Bookworm) to the new one (Trixie). You should backup this file before making changes. copy it to `/tmp` or somewhere more permanent.
        ```bash
        sed -i 's/bookworm/trixie/g' /etc/apt/sources.list
        ```

2.  **Update Proxmox VE Repository:**
    *   **For No-Subscription Users:**
        *   Comment out the old repository line in `/etc/apt/sources.list`.
            ```bash
            # Example: find the line below and add a '#' at the beginning
            # deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription
            ```
            Or you can remove this line entirely.
        *   Then, add the new Proxmox VE 9 repository file.
            ```bash
            cat > /etc/apt/sources.list.d/proxmox.sources << EOF
            Types: deb
            URIs: http://download.proxmox.com/debian/pve
            Suites: trixie
            Components: pve-no-subscription
            Signed-By: /usr/share/keyrings/proxmox-archive-keyring.gpg
            EOF
            ```

3.  **Refresh Package Lists:**
    *   Update the package index with your new repository settings.
        ```bash
        apt update
        ```

4.  **Perform the Distribution Upgrade:**
    *   This is the main upgrade step and can take anywhere from 5 to 60 minutes depending on your hardware.
        ```bash
        apt dist-upgrade -y
        ```
    *   You may be prompted about configuration file changes (`sshd_config`, `grub`, etc.). **If you are unsure, it is safest to choose the default option, which is often to keep your current version.**

5.  **Reboot the System:**
    *   After the `dist-upgrade` completes successfully, reboot your node to load the new kernel.
        ```bash
        reboot now
        ```

---

## 3. Post-Upgrade

1.  **Clear Browser Cache:**
    *   Force-reload the Proxmox web interface to ensure the new UI loads correctly.
        *   **Windows/Linux:** `CTRL` + `SHIFT` + `R`
        *   **macOS:** `⌘` + `Alt` + `R`

2.  **Verify Node Status:**
    *   Log in and check that the node is running the new Proxmox VE 9 version and that all services are active.

3.  **For Clusters:**
    *   Repeat the entire process for each node in your cluster, one at a time.
    *   Do not expect all cluster features (like HA) to work perfectly until all nodes have been upgraded.

---

## Upgrade issues

I updated 4 servers and 3 were fine but one did not boot up again.

In order to fix I had to rebuild the /boot/ partition. I'm still not sure what entirely happened but since Proxmox has a "rescue" option on their installer ISO image, it was easy to fix.

1. Use a Proxmox installer USB and boot into rescue mode.

2. Run `lsblk` to inspect your disks and partitions. For a SATA disk, my boot partition was `/dev/sda2`. If you have NVME storage it is probably `/dev/nvme0n1p2`
3. Once you identify your boot partition, run these commands to reinstall grub there:
  ```bash
    # Create a new directory for boot partition
    mkdir -p /boot/efi
    # mount your partition to the "new" directory
    mount /dev/sda2 /boot/efi
    # tell grub to install to this directory
    grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=proxmox --recheck
    update-grub

  ```
4. I made a mistake and broke my boot partition so if you find yourself in a similar situation, you need to update your `/etc/fstab` file with a new UUID.

Look for your EFI partition, e.g. `/dev/sda2`. The output will show you its new UUID. It will look something like this (your UUID will be different):

```text
NAME   FSTYPE FSVER LABEL UUID                                 FSAVAIL FSUSE% MOUNTPOINT
...
sda2   vfat   FAT32       B4A2-1121
...
```

  Carefully copy the new UUID or if you are in an emergency shell like I was try to direct the output to the fstab file so you do not mistype the value. I did this command: `lsblk -f | grep sda2 >> /etc/fstab` but make sure to clean up that file or your system will not boot.

Find the line that mounts /boot/efi. It will still have the old UUID.

Replace the old UUID with the new one and it should look something like this:

```text
UUID=B4A2-1121 /boot/efi vfat defaults 0 1
```

Save any changes to the file and reboot. With luck that will allow the server to boot up again properly.

 [1]: /posts/proxmox-installation/