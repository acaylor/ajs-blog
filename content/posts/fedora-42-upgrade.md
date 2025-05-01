---
title: Fedora 42 upgrade
author: aj
date: 2025-05-01

categories:
  - Linux
tags:
  - fedora
  - linux

---

As of April 2025, Fedora 42 is available. Compared to the previous release, Fedora 41, this is a quite important release because well 42 is the answer to life, the universe and everything. That's an old reference to scifi literature.

This release comes with updates like GNOME Desktop 48. This introduces v-sync triple buffering to animations in the desktop. There is also a new installer for Fedora that uses a web UI. I believe this will show up if you use a Fedora workstation live image to boot and install.

I upgraded a Fedora 41 system using the `dnf` plugin and everything worked after a reboot.

## Upgrade

### Prerequisites

Before you upgrade, ensure that you have backed up important files somewhere other than on the computer you are upgrading. The upgrade went well for me but when upgrading operating systems, there is never a guarantee your system will not encounter problems.

#### BTRFS snapshot

If you are using `btrfs` filesystem I recommend taking a snapshot of your system before the upgrade. If something goes wrong you can simply roll back your whole system to the state of when you took the snapshot.

Determine which partitions or sub-volumes for `btrfs` are on you root partition

```sh
sudo btrfs subvol list /
```

If you are using the default settings, there should be a root subvolume. Taking a snapshot of this will allow you to roll back a failed upgrade. Determine the `btrfs` mount with `df -T` and create a new directory to mount your `btrfs` partition and take a snapshot

```sh
sudo mkdir -p /mnt/snapshots

sudo mount /dev/dm-0 /mnt/snapshots

cd /mnt/snapshots

ls
```

You should see `root` in this directory. That is the root subvolume to take a snapshot

```sh
sudo btrfs subvol snapshot root f40.snapshot
```

You should see that a snapshot was created in this directory. This can be used to boot from if the upgrade fails. Press `e` when you see the GRUB boot loader and change the `subvol` of the root partition from `root` to `f40.snapshot` or whatever you call the snapshot.

These instructions should work as the `dnf-plugin-system-upgrade` has been around for a while but in any case for a system upgrade you should always check the [official documentation][1] for any up to date instructions.

#### Update all packages

Before you upgrade, make sure your current system is up to date:

```sh
sudo dnf upgrade --refresh
```

In order to download and install the new release, you may need to install a plugin for the `dnf` package manager.

```sh
sudo dnf install dnf-plugin-system-upgrade
```

After this reboot your system to ensure everything is stable.

### Download new release

Once you have the system upgrade plugin, download the new release:

```sh
sudo dnf system-upgrade download --releasever=42
```

During this process, a new GPG key is imported, you are asked to verify the key’s fingerprint. Refer to [here][2] to do so.

### Install the new release

Once the new release is downloaded, enter the following command to reboot and install the updates:

```sh
sudo dnf system-upgrade reboot
```

Once the system upgrade completes you should be able to log into your system to verify everything works.

## Clean up

Once the upgrade completes, you can clean up files that are not needed for the new release of Fedora.

Remove "retired" packages by installing this utility:

```sh
sudo dnf install remove-retired-packages
```

Then run:

```sh
sudo remove-retired-packages 41
```

Replace `41` here with the version of Fedora you previously installed.

Check for duplicate packages using DNF:

```sh
sudo dnf repoquery --duplicates
```

Packages that are not needed can be removed with `sudo dnf autoremove` but this may remove an application that you installed yourself.

I had to rebuild my nvidia kernel module. You can rebuild all kernel modules for your current release with this command:

```bash
sudo akmods --kernels $(uname -r) --rebuild
```

Reboot to ensure everything is configured properly.

 [1]: https://docs.fedoraproject.org/en-US/quick-docs/upgrading-fedora-offline/
 [2]: https://getfedora.org/security