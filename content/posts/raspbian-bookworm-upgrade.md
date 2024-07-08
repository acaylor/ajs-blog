---
title: Raspbian bookworm upgrade
author: aj
date: 2024-07-07

image: /images/raspberry_pi.png
categories:
  - Rasperry Pi
  - Linux
tags:
  - linux
  - raspberry pi
  - pi
  - raspbian
---

Upgrading your Raspberry Pi's operating system can be a breeze, and with Raspbian Bookworm being the latest and greatest version available, it's definitely worth considering. To start, make sure you have a stable internet connection and a compatible Raspberry Pi running Raspbian Bullseye. I will be upgrading my Raspberry Pi 3 that serves as my primary DNS server.

## Before the upgrade

Before running any upgrade operations, make sure your Pi system is up to date. Run `apt` upgrades on the system:

```shell
apt update

apt full-upgrade
```

Also check what release you have installed, if you have installed Raspberry Pi OS recently you may already be on the newest release.

```shell
lsb_release -a
```

## Upgrading

To upgrade your system, you need to edit the configured package repositories for the system to use the `bookworm` release instead of the previous release `bullseye`.

```shell
cd /etc/apt
sudo sed -i 's/bullseye/bookworm/g' sources.list
cat sources.list
```

After you run `cat` you should see the contents of the file, it should look like this:

```list
deb http://raspbian.raspberrypi.org/raspbian/ bookworm main contrib non-free rpi
# Uncomment line below then 'apt-get update' to enable 'apt-get source'
#deb-src http://raspbian.raspberrypi.org/raspbian/ bookworm main contrib non-free rpi
```

There is likely another file in `/etc/apt/sources.list.d/raspi.list`. Update this file as well.

```shell
sudo sed -i 's/bullseye/bookworm/g' sources.list.d/raspi.list
cat sources.list.d/raspi.list
```

After you run `cat` you should see the contents of the file, it should look like this:

```list
deb http://archive.raspberrypi.org/debian/ bookworm main
# Uncomment line below then 'apt-get update' to enable 'apt-get source'
#deb-src http://archive.raspberrypi.org/debian/ bookworm main
```

Now I recommend running the upgrade in a `screen` or `tmux` session in case your SSH connection is interrupted. These packages are most likely not installed on a default installation and can be installed as packages of the same name: `apt install screen`. To start a session just enter `screen` on the terminal and proceed with the rest of the commands. If your session is interrupted, the upgrade will continue and you can see the output and any prompts by typing `screen -r`.

Once you are ready in your `screen` or `tmux` session, enter the following to refresh the cache of packages and then run the upgrade.

```sh
apt update

apt dist-upgrade
```

There will likely be prompts that come up on the screen during the upgrade depending on your system.

Once the upgrade completes, reboot the server to reload all of the upgraded software. 

```sh
reboot now
```

## Next steps

Once the server has rebooted, the upgrade is complete. I had zero issues but even if you have a similar setup, I cannot guarantee you will not run into issues upgrading.