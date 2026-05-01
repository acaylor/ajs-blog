---
title: Fedora 44 upgrade
author: aj
date: 2026-04-30
description: 'This post walks through upgrading an existing Fedora installation to version 44.'
image: /images/fedora.png
categories:
  - Linux
tags:
  - fedora
  - linux
---

Typically there are 2 Fedora releases per year. I upgraded to 43 earlier last year [in a previous post][3] and this process is going to be the same.

I have been upgrading my current system for a few years now:

```txt
2024:   Fedora 40 (install)
        |
        v
        f41
        |
        v
2025:   f42
        |
        v
        f43
        |
        v
2026: Fedora 44 (today)
```

Fedora Linux 44 brings a solid mix of desktop polish and under-the-hood modernization: Workstation moves to GNOME 50 with improvements to accessibility, color management, remote desktop, and updated core apps, while Fedora KDE ships Plasma 6.6 with a more unified first-boot setup experience. Now you can use the Plasma login manager instead of the default GNOME login interface. On the system side, Fedora continues its tooling refresh with the PackageKit move to DNF5, updated core developer stacks like LLVM 22, PHP 8.5, Ruby 4.0, Boost 1.90, Golang 1.26, CMake 4.0, and more. Fedora 44 also improves compatibility and hardware support, including NTSYNC enablement for better Wine/Steam behavior and improved aarch64 live-image support for more ARM laptop scenarios.

I upgraded a Fedora 43 system using the `dnf` plugin.

## Upgrade

### Prerequisites

Before you upgrade, ensure that you have backed up important files somewhere other than on the computer you are upgrading. The upgrade went well for me but when upgrading operating systems, there is never a guarantee your system will not encounter problems.

#### BTRFS snapshot (optional if you are using btrfs)

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
sudo btrfs subvol snapshot root fedora-upgrade.snapshot
```

You should see that a snapshot was created in this directory. This can be used to boot from if the upgrade fails. Press `e` when you see the GRUB boot loader and change the `subvol` of the root partition from `root` to `fedora-upgrade.snapshot` or whatever you call the snapshot.

### Start the upgrade

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
sudo dnf system-upgrade download --releasever=44
```

During this process, a new GPG key is imported, you are asked to verify the key’s fingerprint. Refer to [here][2] to do so.

### Install the new release

Once the new release is downloaded, enter the following command to reboot and install the updates:

```sh
sudo dnf offline reboot
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
sudo remove-retired-packages 43
```

Replace `43` here with the version of Fedora you previously installed. You will be prompted if there are packages to remove.

Check for duplicate packages using DNF:

```sh
sudo dnf repoquery --duplicates
```

Packages that are not needed can be removed with `sudo dnf autoremove` but this may remove an application that you installed yourself.

Reboot to ensure everything is configured properly. If you see your login screen and can log in, the upgrade likely succeeded.

[1]: https://docs.fedoraproject.org/en-US/quick-docs/upgrading-fedora-offline/
[2]: https://getfedora.org/security
[3]: /posts/fedora-43-upgrade
