---
title: Fedora 43 upgrade
author: aj
date: 2025-10-31

categories:
  - Linux
tags:
  - fedora
  - linux

---

Today is a spooky day and Fedora 43 has been released as of October 29, 2025. This release is a bit spooky with the default desktop environment only supporting Wayland. Typically there are 2 Fedora releases per year. I upgraded to 42 earlier this year [in a previous post][3] and this process is going to be the same.

There are a few notable user visible changes in this release. When installing from the ISO installation image there is a new Anaconda WebUI. This was the default installer interface for Fedora Workstation 42, and now it’s the default installer UI for the Spins as well. If you are a GNOME desktop user, you’ll also notice that the GNOME is now Wayland-only in Fedora Linux 43. GNOME upstream has deprecated X11 support, and has disabled it as a compile time default in GNOME 49. Upstream GNOME plans to fully remove X11 support in GNOME 50.

This is the first release with `rpm` version 6, this should not change much for end users but that program handles packaging on all Red Hat distros.

I upgraded a Fedora 42 system using the `dnf` plugin.

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
sudo dnf system-upgrade download --releasever=43
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
sudo remove-retired-packages 42
```

Replace `42` here with the version of Fedora you previously installed. You will be prompted if there are packages to remove.

Check for duplicate packages using DNF:

```sh
sudo dnf repoquery --duplicates
```

Packages that are not needed can be removed with `sudo dnf autoremove` but this may remove an application that you installed yourself.

I had to rebuild the nvidia kernel module. You can rebuild all kernel modules for your current release with this command:

```bash
sudo akmods --kernels $(uname -r) --rebuild
```

> Note: this is probably only needed if you use the nvidia proprietary kernel modules. If you use another GPU or the open source drivers you can probably skip the rebuild.

Reboot to ensure everything is configured properly. If you see your login screen and can log in, the upgrade likely succeeded.

 [1]: https://docs.fedoraproject.org/en-US/quick-docs/upgrading-fedora-offline/
 [2]: https://getfedora.org/security
 [3]: /posts/fedora-42-upgrade/