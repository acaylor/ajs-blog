---
title: Proxmox Ubuntu 26.04 template
author: aj
date: 2026-10-09
image: /images/proxmox-resolute/cover.png
description: Build an Ubuntu 26.04 cloud-init template in Proxmox, with workarounds for a slow first boot, shared machine IDs, and a disk too small to upgrade.
categories:
  - Proxmox
  - Virtual Machines
  - Linux
tags:
  - proxmox
  - linux
  - ubuntu
  - virtual machine
---

Ubuntu 26.04 LTS, named Resolute Raccoon, was released in April 2026. Canonical lists standard security maintenance through May 2031, with extended coverage available through Ubuntu Pro. Check the [Ubuntu release schedule][1] for the current support details.

I use Proxmox to manage virtual machines. Each time Ubuntu releases a Long Term Support distribution, I update the template that I use for virtual machines. This post is a follow up to the last time I created a template in [a previous post for Ubuntu 24.04][2]. At a high level not much has changed: download an Ubuntu cloud image, install the QEMU guest agent into it, and import it into Proxmox.

Following the 24.04 steps with the new image does produce a template that works, but it has problems:

- **The first boot of every clone takes about three minutes.** The 26.04 image boots with a dracut initramfs that brings the network card up before cloud-init can rename it to `eth0`, the name Proxmox's network configuration uses. Boot then waits two minutes for an `eth0` that never appears. This is an [open cloud-init issue][3] and has come up on the [Proxmox forum][4].
- **The clone gets a different IP address after its first reboot.** It is the same bug: the early network start requests a DHCP lease with a different client ID than the first time you booted.
- **Proxmox's first-boot package upgrade fails.** The image's root filesystem is 2.3 GB, which leaves too little room for `apt` to download upgrades. Cloud-init reports `E: You don't have enough free space in /var/cache/apt/archives/`.

There is also a problem that affected my 24.04 template: `virt-customize` writes a machine ID into the image, so every clone shares the same `/etc/machine-id`. Two VMs I cloned from the 24.04 template report the same value. The steps below address all four problems. I tested them on Proxmox VE 9.2 with the `release-20260927` image.

If you want to create a template in Proxmox for Ubuntu 26.04, follow along. These steps are still relevant even if you didn't have a template for a previous version of Ubuntu.

## Create a new virtual machine template that works with cloud-init

Run the following commands as root on your Proxmox host. These examples use:

- VM ID `999` for the template and `100` for the clone. Choose unused IDs in your cluster.
- `local-lvm` for VM disk storage. Replace it with your storage name in the commands below.
- `vmbr0` for the network bridge. Replace it if your guests use another bridge.

The image download goes in `/tmp`; the imported VM disks go on Proxmox storage.

### Download the Ubuntu cloud image

Ubuntu publishes both `amd64` and `amd64v3` cloud images for 26.04. The `amd64v3` variant needs additional CPU features. This guide uses the standard `amd64` image, which works on a wider range of x86 hosts. See Canonical's [architecture variant documentation][5] for the distinction.

Download the image and its checksum file from the [released cloud images directory][6], then verify the download:

```bash
cd /tmp
wget https://cloud-images.ubuntu.com/releases/resolute/release/ubuntu-26.04-server-cloudimg-amd64.img
wget https://cloud-images.ubuntu.com/releases/resolute/release/SHA256SUMS
sha256sum --check --ignore-missing SHA256SUMS
```

The last command should print `ubuntu-26.04-server-cloudimg-amd64.img: OK`. The filename here is `ubuntu-26.04-server-cloudimg-amd64.img`. The daily images directory uses a different name, `resolute-server-cloudimg-amd64.img`, so make sure the download URL and filename match.

The `release/` directory changes as Ubuntu publishes refreshed images. If you need to reproduce a template later, keep a record of the dated build and any packages you add.

### Customize the image

Install `libguestfs-tools` on the Proxmox host. It provides `virt-customize`, which modifies a disk image without booting it:

```bash
apt-get update
apt-get install libguestfs-tools
```

Then make three changes to the image in one command:

```bash
virt-customize -a /tmp/ubuntu-26.04-server-cloudimg-amd64.img \
  --install qemu-guest-agent \
  --write '/etc/default/grub.d/90-no-initrd-network.cfg:GRUB_CMDLINE_LINUX_DEFAULT="$GRUB_CMDLINE_LINUX_DEFAULT rd.systemd.mask=systemd-networkd.service rd.systemd.mask=systemd-networkd.socket"' \
  --run-command update-grub \
  --truncate /etc/machine-id
```

Package installation needs network access from the `virt-customize` appliance to Ubuntu's repositories. Let the command finish successfully before importing the image. You can ignore its `random seed could not be set` warning. The [virt-customize documentation][7] covers each option. Here is what this command does:

**`--install qemu-guest-agent`** installs the guest agent. It lets Proxmox read information such as the guest's IP addresses. Also enable guest agent communication in the VM configuration below.

**`--write` and `--run-command update-grub`** add two kernel arguments that stop `systemd-networkd` from running in the initramfs. In the 26.04 image, the initramfs starts DHCP on the network card. A local disk does not need a network to boot, but the early start leaves the network card up when cloud-init tries to rename it from `ens18` to `eth0`. The rename fails because the device is busy:

```text
Unable to rename interfaces: [['bc:24:11:b0:88:be', 'eth0', None, None]] due to errors: ['[busy] Error renaming mac=bc:24:11:b0:88:be from ens18 to eth0']
```

Netplan then makes boot wait until `eth0` is online, which never happens on that boot. The wait times out after two minutes. On later boots the card is renamed correctly, but the initramfs still takes its own DHCP lease each time. It requests that lease with a different client ID, so the VM holds two leases and its address changes after the first reboot.

The `rd.systemd.mask=` arguments are read by [systemd][8] only in the initramfs. With networkd masked there, the card stays down until the installed system configures it, which is how 24.04 behaved. Leave these arguments out if your root filesystem is on the network, such as iSCSI or NFS, because that needs network access in the initramfs. Once the upstream issue is fixed, you can remove the file and run `update-grub` in your VMs.

`update-grub` also rewrites the boot entries to use `root=UUID=…` instead of `root=LABEL=cloudimg-rootfs`. Every clone has the same filesystem UUID, so this makes no practical difference.

**`--truncate /etc/machine-id`** empties the machine ID. Ubuntu's cloud images ship with an empty `/etc/machine-id`, and systemd generates a unique ID on each VM's first boot. `virt-customize` writes a machine ID into the image before running its operations. Without this option, every clone shares that ID. systemd uses the [machine ID][9] for several things, including the DHCP client identifier that netplan sends by default. Truncating the file last restores the empty state.

### Create the VM and import the disk

Create a new VM with 2 GB of memory, two CPU cores, a VirtIO network adapter, and a VirtIO SCSI controller:

```bash
qm create 999 --name resolute-template --memory 2048 --cores 2 --net0 virtio,bridge=vmbr0 --scsihw virtio-scsi-pci
```

Import the customized image and configure the boot disk, cloud-init drive, serial console, and guest agent:

```bash
# Import the Ubuntu image as the boot disk
qm set 999 --scsi0 local-lvm:0,import-from=/tmp/ubuntu-26.04-server-cloudimg-amd64.img
# Add the drive Proxmox uses to pass cloud-init configuration
qm set 999 --ide2 local-lvm:cloudinit
qm set 999 --boot order=scsi0
qm set 999 --serial0 socket --vga serial0
qm set 999 --agent enabled=1
```

The disk import and console setup follow the [Proxmox cloud-init guide][10].

The imported disk is 3.5 GB. Grow it before converting the VM to a template:

```bash
qm disk resize 999 scsi0 8G
```

By default Proxmox tells cloud-init to upgrade all packages on first boot. On a 3.5 GB disk the upgrade fails for lack of space. Resizing the template means every clone starts with enough room, including clones created from the web UI or Terraform without a disk size. Cloud-init grows the root partition to fill the disk on first boot. On thin storage such as `local-lvm`, the extra space is not allocated until the guest writes to it.

Convert the VM into a template without starting it:

```bash
qm template 999
```

Keeping the template unbooted leaves cloud-init's first-boot setup for each new clone.

## Clone the template via CLI

Create a full clone so the new VM has its own copy of the template disks:

```bash
qm clone 999 100 --name ubuntu-1 --full 1
```

Configure the login user and a public SSH key before the first boot. This example assumes you have copied your workstation's public key to `/root/ubuntu-admin.pub` on the Proxmox host:

```bash
qm set 100 --ciuser ubuntu --sshkeys /root/ubuntu-admin.pub
qm set 100 --ipconfig0 ip=dhcp
```

Use the public key file here. Connect from the workstation that holds the matching private key. The [qm command reference][11] documents these options.

If you prefer a static address, replace the DHCP setting before starting the VM:

```bash
qm set 100 --ipconfig0 ip=192.168.100.100/24,gw=192.168.100.1
qm set 100 --nameserver 192.168.100.1
```

Replace the example address, gateway, and DNS server with values for your network. Choose an unused address outside your DHCP allocation range, or reserve it in your DHCP server.

The clone inherits the template's 8 GB disk. To give it more, resize it before starting. This sets the total disk size to 32 GB:

```bash
qm disk resize 100 scsi0 32G
```

Start the VM:

```bash
qm start 100
```

### Check the first boot

The first boot takes about a minute and a half on my hardware, most of it spent on the package upgrade. You can skip the upgrade with `qm set 100 --ciupgrade 0` before starting the VM, but then you need to apply updates yourself. Until cloud-init finishes, Ubuntu refuses SSH logins for non-root users, so `ssh` reports `Connection closed` even though it accepted the key. Wait a little and try again.

Once the VM accepts SSH connections, connect from your workstation:

```bash
ssh ubuntu@192.168.100.100
```

Use the address assigned by your DHCP server if you chose DHCP. `qm guest cmd 100 network-get-interfaces` on the Proxmox host shows it once the guest agent is running. Inside the guest, wait for [cloud-init to finish][12], then check the release, hostname, guest agent, and disk:

```bash
sudo cloud-init status --wait --long
cat /etc/os-release
hostname
systemctl is-active qemu-guest-agent
df -h /
```

Confirm Ubuntu reports version `26.04`, the hostname matches `ubuntu-1`, and the guest agent is active. The root filesystem should fill the disk, about 6.7 GB on the 8 GB template disk. Cloud-init should report `errors: []`; investigate any errors before using the clone for a service.

From the Proxmox host, check that it can communicate with the agent:

```bash
qm agent 100 ping
```

A successful ping exits without output. If it fails, check the service inside the guest and confirm `agent: enabled=1` appears in `qm config 100`. Proxmox documents the two parts of guest agent setup in its [VM administration guide][13].

On my test clone, a reboot after first boot took 8 seconds and kept the same IP address.

## Next steps

You can also clone the template through the Proxmox web UI. Set the user, SSH key, and network configuration in the clone's Cloud-Init panel before starting it.

If you want to automate VM creation, my [previous post][14] introduces that workflow. Rebuild the template from a refreshed image periodically, and keep applying Ubuntu updates inside running VMs. A new template only affects future clones.

Creating a template for vms allows you to quickly create a new system without looking up the instructions every time.

[1]: https://ubuntu.com/about/release-cycle
[2]: /posts/proxmox-noble/
[3]: https://github.com/canonical/cloud-init/issues/6887
[4]: https://forum.proxmox.com/threads/ubuntu-26-04-resolute-failed-to-start-systemd-networkd-wait-online-service.183003/
[5]: https://ubuntu.com/cloud/public-cloud/docs/all-clouds-explanation/architecture-variants/
[6]: https://cloud-images.ubuntu.com/releases/resolute/release/
[7]: https://libguestfs.org/virt-customize.1.html
[8]: https://www.freedesktop.org/software/systemd/man/latest/systemd-debug-generator.html
[9]: https://www.freedesktop.org/software/systemd/man/latest/machine-id.html
[10]: https://pve.proxmox.com/wiki/Cloud-Init_Support
[11]: https://pve.proxmox.com/pve-docs/qm.1.html
[12]: https://docs.cloud-init.io/en/latest/howto/status.html
[13]: https://pve.proxmox.com/pve-docs/chapter-qm.html#qm_qemu_agent
[14]: /posts/terraform/
