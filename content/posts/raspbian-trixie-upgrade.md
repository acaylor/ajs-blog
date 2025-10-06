---
title: Raspbian Trixie upgrade
author: aj
date: 2025-10-03
updated: 2025-10-06
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

### Second issue

_This post was updated 2025-10-06 after I saw apt failed to update_

A number of days after doing the upgrade I tried to update the packages using `apt update` but this failed:

`Warning: An error occurred during the signature verification. The repository is not updated and the previous index files will be used. OpenPGP signature verification failed: http://archive.raspberrypi.org/debian trixie InRelease: Sub-process /usr/bin/sqv returned an error code (1), error message is: Missing key [removed] which is needed to verify signature`

This error occurs because Debian 13 (Trixie) uses a new signature verification system (sqv from Sequoia-PGP) instead of the old apt-key method, and the Raspberry Pi repository key isn't recognized by the new system.

The fix should be to install the Raspberry Pi archive key and reference it with `signed-by`. First check for `/etc/apt/keyrings` directory on the system. This is where we will add the key for the apt repo.

Now we need to download and install the appropriate key from the apt repo:

```bash
curl -fsSL https://archive.raspberrypi.org/debian/raspberrypi.gpg.key \
 | sudo gpg --dearmor -o /etc/apt/keyrings/raspberrypi-archive-keyring.gpg

# Update the file permissions once downloaded
sudo chmod 0644 /etc/apt/keyrings/raspberrypi-archive-keyring.gpg
```

Point your source list at the keyring (adjust cpu arch if needed):

```bash
# File is usually /etc/apt/sources.list.d/raspi.list
# Example:
deb [arch=arm64 signed-by=/etc/apt/keyrings/raspberrypi-archive-keyring.gpg] http://archive.raspberrypi.org/debian trixie main

```

This will enable updates but now apt produces a warning. This however is on the package maintainers to address, not us end users:

```txt
Warning: http://archive.raspberrypi.org/debian/dists/trixie/InRelease: Policy will reject signature within a year, see --audit for details
Audit: http://archive.raspberrypi.org/debian/dists/trixie/InRelease: Sub-process /usr/bin/sqv returned an error code (1), error message is:
   Signing key on CF8A1AF502A2AA2D763BAE7E82B129927FA3303E is not bound:
              No binding signature at time 2025-10-06T13:33:19Z
     because: Policy rejected non-revocation signature (PositiveCertification) requiring second pre-image resistance
     because: SHA1 is not considered secure since 2026-02-01T00:00:00Z
```

Running `sudo apt update --audit` produced the additional output that reveals that while the signature is valid, it is using a legacy algorithm that will be considered deprecated staring February 2026.

Afterwards I saw another message that we can run a command to update the existing sources to a new format with `modernize-sources`. This lists what it will do:

```bash
sudo apt modernize-sources
The following files need modernizing:
  - /etc/apt/sources.list
  - /etc/apt/sources.list.d/100-ubnt-unifi.list
  - /etc/apt/sources.list.d/docker.list
  - /etc/apt/sources.list.d/raspi.list

Modernizing will replace .list files with the new .sources format,
add Signed-By values where they can be determined automatically,
and save the old files into .list.bak files.

This command supports the 'signed-by' and 'trusted' options. If you
have specified other options inside [] brackets, please transfer them
manually to the output files; see sources.list(5) for a mapping.

For a simulation, respond N in the following prompt.
Rewrite 4 sources? [Y/n]
```

Here is an example of what happened to `/etc/apt/sources.list`. It became a new file `/etc/apt/sources.list.d/raspbian.sources`:

```sources
# Modernized from /etc/apt/sources.list
Types: deb
URIs: http://raspbian.raspberrypi.org/raspbian/
Suites: trixie
Components: main contrib non-free rpi
Signed-By: /usr/share/keyrings/raspbian-archive-keyring.gpg
```

Now when you run apt it will use this file to update that repo.

 [1]: https://www.debian.org/releases/trixie/