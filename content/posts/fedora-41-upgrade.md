---
title: Fedora 41 upgrade
author: aj
date: 2024-10-30

categories:
  - Linux
tags:
  - fedora
  - linux

---

As of October 2024, Fedora 41 is available. Compared to the previous release, Fedora 40, there are not a large amount of changes that a desktop user will notice. This release includes the GNOME desktop version 47 with minor updates to the UI.

This release will also continue to include the latest releases of KDE desktop environment as an alternative to GNOME desktop. Another addition is the Miracle Window Manager which is a tiling window manager based on the Mir compositor library. It is new compared to alternative window managers but includes support for Wayland, low end devices, and support for Nvidia GPU drivers.

This release also uses version 5 of the `dnf` package manager by default. If you do development, you will find that this release includes newer versions of compilers and libraries such as Golang 1.23, GIMP v3, Perl 5.40, LXQT v2 and more.

Returning to Fedora in this release is support for installing Nvidia drivers with secure boot. By using `mokutil`, users can install the drivers, create a key with `mokutil` to self-sign the drivers, and provide a password for the key. On the next reboot the user is presented with the mokutil interface to enroll the key. For a how-to on using `mokutil`, please refer to the [official docs][1]. This was possible configuring third party repos and installing the utility yourself in previous releases but it is nice to see the support return in a more user friendly way similar to Ubuntu like distributions of Linux.

I upgraded a Fedora 40 system using the `dnf` plugin and everything worked after a reboot.

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
sudo dnf system-upgrade download --releasever=41
```

During this process, a new GPG key is imported, you are asked to verify the key’s fingerprint. Refer to [here][1] to do so.

### Install the new release

Once the new release is downloaded, enter the following command to reboot and install the updates:

```sh
sudo dnf system-upgrade reboot
```

Once the system upgrade completes you should be able to log into your system to verify everything works.

## Clean up

Once the upgrade completes, you can clean up files that are not needed for the new release of Fedora.

Remove "retired" packages:

```sh
sudo dnf install remove-retired-packages
```

Then

```sh
sudo remove-retired-packages 40
```

Replace `40` here with the version of Fedora you previously installed.

Check for duplicate packages using DNF:

```sh
sudo dnf repoquery --duplicates
```

Packages that are not needed can be removed with `sudo dnf autoremove` but this may remove an application that you installed yourself.

 [1]: https://docs.fedoraproject.org/en-US/quick-docs/mok-enrollment/
 [2]: https://getfedora.org/security