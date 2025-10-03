---
title: Raspbian Trixie upgrade
author: aj
date: 2025-10-03

image: /images/raspberry_pi.png
categories:
  - Raspberry Pi
  - Linux
tags:
  - linux
  - raspberry pi
  - pi
  - raspbian
---

The Raspberry Pi Foundation has just released a major update to Raspberry Pi OS, now based on Debian "trixie." If you're running the previous version (based on Debian "bookworm"), you might be wondering whether to upgrade your existing setup or start fresh. Here's everything you need to know to make an informed decision. I am upgrading my old Pi 3 since the others I have are using Ubuntu. I still have this Pi for apps that work on 32bit arm CPU architecture.

## The Clean Install vs. Upgrade recommendation

When it comes to major OS upgrades, the Raspberry Pi Foundation recommends a clean installation. This means downloading the latest image from Raspberry Pi Imager or the official website, flashing it to your SD card, and then reinstalling your applications and transferring your data.

Why such a strong recommendation? The reality is that while upgrading an existing system is technically possible, it's fraught with potential pitfalls. The Foundation can only test clean images. They can't account for every possible combination of third-party software, custom configurations, and modifications that users might have applied over time. Any of these factors could cause the upgrade to fail in unpredictable ways, potentially leaving you with a system that won't boot.

## Before You Consider Upgrading

If you're still interested in attempting an in-place upgrade despite the risks like me, here are some critical prerequisites:

- **Back up everything first.** Or don't if you like to be risky.
- Never attempt this on a system you're actively relying on for important tasks.
- Understand that you're proceeding entirely at your own risk.

It's also worth reviewing [Debian's official guidance on upgrading from bookworm to trixie][1] for additional context. Raspberry pi OS is based on Debian.

## The Upgrade Process

If you've weighed the risks and decided to proceed, here's the upgrade process:

### Step 1: Update Your Current System

Start with a bookworm image and ensure it's fully updated:

```bash
sudo apt update
sudo apt full-upgrade
```

### Step 2: Configure APT for Trixie

You'll need to update your package sources to point to trixie instead of bookworm. The easiest way to do this is using the `sed` command, which will automatically replace all instances of "bookworm" with "trixie" in your configuration files.

First, update the main sources list:

```bash
sudo sed -i 's/bookworm/trixie/g' /etc/apt/sources.list
```

Then update all the files in the sources.list.d directory:

```bash
sudo sed -i 's/bookworm/trixie/g' /etc/apt/sources.list.d/*.list
```

These commands work by searching for every occurrence of "bookworm" and replacing it with "trixie" in place (`-i` flag). On a clean image, this will primarily affect the `raspi.list` file, but if you've added additional repositories, those will be updated as well.

>Warning: If one of your sources does not have a repo set up for Trixie, it will fail and the repo will be disabled. Proceed at your own risk.

### Step 3: Refresh Package Lists

```bash
sudo apt update
```

### Step 4: Remove Obsolete Packages

Remove unused packages. Check if you have one troublesome package in particular:

```bash
sudo apt purge -y raspberrypi-ui-mods
sudo apt autoremove -y
```

### Step 5: Perform the Major Upgrade

Enter this command with the additional options even though they look strange compared to most shell commands.

```bash
sudo apt full-upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confnew" --purge --auto-remove
```

During this process, you'll be prompted about restarting services. Answer "yes" to this question. If you're asked anything else, "yes" is likely the correct response.

### Step 6: Install New Trixie Packages (optional)

If you are using a desktop environment, you can install new packages added in Trixie:

```bash
sudo apt install -y rpd-wayland-all rpd-x-all
```

### Step 7: Finish Up

Once the upgrade completes without errors, run `sync` to ensure all filesystem caches are cleared, then reboot your system:

```bash
sync
sudo reboot
```

## Verifying Your Upgrade

When your desktop returns, you can confirm you're running trixie by opening a terminal and typing:

```bash
lsb_release -c
```

This should display "trixie" as your current codename.

## Upgrade issues

I had one issue with the upgrade. My static ip config in /etc/dhcpcd.conf stopped working so I went back to defining my network interface in a new file in `/etc/network/interfaces.d/static`

```conf
auto eth0
iface eth0 inet static
  address 10.0.0.2
  gateway 10.0.0.1
  dns-nameservers 10.0.0.1 10.0.0.99
```

Restart networking service: `sudo systemctl restart networking.service`.

 [1]: https://www.debian.org/releases/trixie/