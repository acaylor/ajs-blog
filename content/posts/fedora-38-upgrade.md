---
title: Fedora 38 upgrade
author: aj
date: 2023-05-21

categories:
  - Linux
tags:
  - fedora
  - linux

---

As of April 18, 2023 Fedora 38 is available. Compared to the previous release, Fedora 37, there are not a large amount of changes that a desktop user will notice. This release includes the GNOME desktop version 44 which includes a new lock screen, new "background" apps settings menu and they reduced the default grace period given to processes when you shut down your system which will make sure your system powers off quickly.

This release also introduces version 5 of the `dnf` package manager as an option. If you do development, you will find that this release includes newer versions of compilers and libraries such as GCC 13, Golang 1.20, LLVM 16, Ruby 3.2, TeXLive2022, PHP 8.2 and more.

I upgraded a desktop and a laptop system using the `dnf` plugin and everything worked perfectly.

## Upgrade

### Prerequisites

Before you upgrade, ensure that you have backed up important files somewhere other than on the computer you are upgrading. The upgrade went well for me but when upgrading operating systems, there is never a guarantee your system will not encounter problems.

#### BTRFS snapshot

If you are using `btrfs` filesystem which was the default option for the past few versions of Fedora, I recommend taking a snapshot of your system before the upgrade. If something goes wrong you can simply roll back your whole system to the state of when you took the snapshot.

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
sudo btrfs subvol snapshot root f38.snapshot
```

You should see that a snapshot was created in this directory. This can be used to boot from if the upgrade fails. Press `e` when you see the GRUB boot loader and change the `subvol` of the root partition from `root` to `f38.snapshot` or whatever you call the snapshot.

#### Update all packages

Before you upgrade, make sure your current system is up to date:

```sh
sudo dnf upgrade --refresh
```

In order to download and install the new release, you may need to install a plugin for the `dnf` package manager.

```sh
sudo dnf install dnf-plugin-system-upgrade
```

### Download new release

Once you have the system upgrade plugin, download the new release:

```sh
sudo dnf system-upgrade download --releasever=38
```

During this process, a new GPG key is imported, you are asked to verify the key’s fingerprint. Refer to [here][1] to do so.

### Install the new release

Once the new release is downloaded, enter the following command to reboot and install the updates:

```sh
sudo dnf system-upgrade reboot
```

Once the system upgrade completes you should be able to log into your system to verify everything works.

 [1]: https://getfedora.org/security