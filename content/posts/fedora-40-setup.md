---
title: Fedora 40 Linux setup
author: aj
date: 2024-06-19
categories:
  - Linux
tags:
  - linux
  - fedora
---

In a vain attempt to fix issues I am having on my Linux laptop, I wiped my drive and installed [Fedora 40](https://fedoraproject.org/). I was using [Debian 12](https://www.debian.org/) since it released but my laptop has issues related to the dedicated AMD GPU. Feel free to skip the summary of my issues as the rest of this post is about setting up Fedora 40.

### Issues with Current system

When I attempt to launch an application on the dedicated GPU with the environment variable `DRI_PRIME=1`, there are graphical artifacts and then the system becomes completely unresponsive until you hold the power button for a reboot. There is also a bug where the HDMI and usb-c ports that are directly connected to the dedicated GPU do not work unless you log out and log back in. I wish I never purchased a system with multiple GPUs even though they are both AMD and should be supported by open-source `mesa` drivers. Usually people encounter issues with Nvidia GPUs on Linux and folks recommend Intel/AMD for Linux desktops. I also discovered that when I attempt to create a `.xz` archive with a lot of files, the CPU would overheat to over 95 Celsius and shut down the system. These are some pretty major issues that affect my ability to daily drive the system.

## Setup

download and install on a virtual machine or onto a desktop or laptop.

### Desktop environment

Unless you already downloaded a Fedora "spin" that includes a different window manager and desktop environments, Fedora workstation will open to GNOME desktop where you are prompted to create a new user account.

This desktop environment includes some applications such as the excellent web browser Firefox and a free set of apps for creating documents, spreadsheets, and presentations with LibreOffice. I use Firefox and I recommend that you disable the telemetry collection in the Privacy settings of your Firefox browser.

### Installing software

The GNOME desktop includes an application to install and update software in the repositories configured for the system. If during setup you enable third-party repositories, you can see what all is enabled with a terminal command. In GNOME desktop enter the keyboard shortcut <key>super</key> (super, also known as the CMD key on Macs and the key with a Windows logo on most keyboards) which will open an application launcher. From here you can search for "terminal" or select the terminal icon shortcut on the application launcher.

Once in the terminal application, check what software repositories are enabled on the system:

```shell
dnf repolist
```

On my system the following repos were enabled:

```shell
$ dnf repolist
repo id                                        repo name
copr:copr.fedorainfracloud.org:phracek:PyCharm Copr repo for PyCharm owned by phracek
fedora                                         Fedora 40 - x86_64
fedora-cisco-openh264                          Fedora 40 openh264 (From Cisco) - x86_64
google-chrome                                  google-chrome
rpmfusion-nonfree-nvidia-driver                RPM Fusion for Fedora 40 - Nonfree - NVIDIA Driver
rpmfusion-nonfree-steam                        RPM Fusion for Fedora 40 - Nonfree - Steam
updates                                        Fedora 40 - x86_64 - Updates
```

This was pretty cool to see some codecs are included and a repo with Steam which is a popular application for managing games. Also included is a repo with the Nvidia driver if you have an GPU from Nvidia. My system uses the `mesa` drivers for an AMD CPU with integrated graphics and a dedicated AMD GPU.

One software package that I always install is `git` which is a version control system for source code. On Fedora, this package was already installed on my system. Once you have a working system, you can enter the following command to see what software packages are already installed on your system. It is also sorted by piping the output to the `sort` command in the terminal shell.

```shell
rpm -qa |sort
```

You will see a list numbering in the hundreds. In my case it was `1968` packages.

Another package that is already included is `podman` which is an alternative to the popular Docker software for running and managing containers on your system. Check out a [previous post](/posts/docker-alternatives/) for more information about podman and other alternatives to Docker.

#### Installing new software

You can use the included application "Software" on GNOME desktop to search and install packages but I prefer to write a script to install software and the script can also be used for reference to see what software you intentionally installed on your system.

When using GNOME, there is some software that I [always install](https://github.com/acaylor/linux_setup/blob/master/fedora-gnome-software.sh) to further customize the desktop environment.

```bash
#!/usr/bin/env bash
set -e

echo "update dnf config"
echo "allowing 10 parallel downloads"
echo "max_parallel_downloads=10" | sudo tee -a /etc/dnf/dnf.conf
echo "enabling fastest mirror selection"
echo "fastestmirror=True" | sudo tee -a /etc/dnf/dnf.conf

echo "Installing Software packages"

sudo dnf install \
	foot \
	vim \
	zsh \
	tmux \
	unzip \
	p7zip \
	p7zip-plugins \
	unrar 

echo "Installing fonts"

sudo dnf install \
	google-roboto-fonts \
	fira-code-fonts

echo "Installing gnome stuff"

sudo dnf install \
	gnome-tweaks \
	gnome-extensions-app \
	gnome-shell-extension-caffeine \
	gnome-shell-extension-user-theme

echo "Making theme dir for user $USER"

mkdir -p ~/.themes

```

Some software included there:

- foot: lightweight terminal for Wayland on Linux
- vim: lightweight text editor available in the terminal
- zsh: my preferred shell
- tmux: terminal multiplexer. Allows running in the background and you can reattach over SSH for example.
- unzip: package to unzip .zip files
- p7zip: package for the 7zip program on linux
- unrar: package to extract .rar files

The gnome-tweaks package allows you to further customize the GNOME desktop. The gnome caffeine extension adds a toggle in the UI to prevent the computer from going to sleep/suspend.

#### Extra software

Here is some extra software that is included with Fedora that I want to install:

```bash
#!/usr/bin/env bash
set -e

echo "Installing Software packages"

sudo dnf install \
	steam \
	neovim \
	btop \
	htop \
	nvtop \
	lm_sensors \
	mpv \
	cmatrix
	
```

Some software included there:

- steam: installing and managing pc games.
- neovim: open source alternative to vim
- btop: more robust top utility written in c++
- htop: more robust top utility included with most distributions
- nvtop: a utility similar to top but for GPU
- lm_sensors: library to read data from sensors on the system
- mpv: hardware-accelerated media player that I prefer over VLC
- cmatrix: a silly command line tool that produces an effect in the terminal similar to the movie the Matrix.

## Next steps

At this point my system is ready to use once I customize the system shell. Check out a previous [post](/posts/zshell/) to set up ZSH.

To keep your system up to date there is a GNOME software app that will prompt you to install updates and restart. If you prefer, you can update the software on the system using `dnf` package manager in a terminal.

To upgrade packages:

```shell
sudo dnf upgrade
```
