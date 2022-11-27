---
title: Fedora 37 upgrade
author: aj
date: 2022-11-27
categories:
  - Linux
tags:
  - fedora
  - linux

---

As of November 15, 2022 Fedora 37 is available. Compared to the previous release, Fedora 36, there are not a large amount of changes that a desktop user will notice. The newest release brings newer versions of the Linux Kernel and GNOME 43 if you use the GNOME desktop environment. If you like running virtual machines, this release includes an image all prepared for running in the Linux KVM hypervisor.

I'm just making a quick post to say how easy and seamless the upgrade from Fedora 36 to 37 went. The graphical installer did not work for me but I upgraded a desktop and a laptop system using the `dnf` plugin and everything worked perfectly.

## Upgrade

### Prerequisites

Before you upgrade, ensure that you have backed up important files somewhere other than on the computer you are upgrading. The upgrade went well for me but when upgrading operating systems, there is never a guarantee your system will not encounter problems.

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
sudo dnf system-upgrade download --releasever=37
```

During this process, a new GPG key is imported, you are asked to verify the key’s fingerprint. Refer to [here][1] to do so.

### Install the new release

Once the new release is downloaded, enter the following command to reboot and install the updates:

```sh
sudo dnf system-upgrade reboot
```

Once the system upgrade completes you should be able to log into your system to verify everything works.

 [1]: https://getfedora.org/security