---
title: Proxmox 8 Upgrade
author: aj
date: 2023-07-08
image: /images/proxmox-logo.jpg
categories:
  - Proxmox
  - Virtual Machines
  - Linux
tags:
  - proxmox
  - homelab
  - virtual machine
---

In my homelab, Proxmox is the main operating system that I use for servers. It is Debian Linux with some extra packages related to virtual machines and managing virtual machines.

![proxmox-logo](/images/proxmox-logo.jpg)

Proxmox 8 introduces Debian 12 bookworm release as the underlying Operating System. If you are already running Proxmox 7 then read on to see how to upgrade your system. If you are not using Proxmox, I recommend checking out a [previous post][1] that introduces Proxmox and how to install it.

## Before the upgrade

Before running any upgrade operations, make sure your Proxmox 7 system is up to date. Run `apt` upgrades on the system:

```sh
apt update

apt dist-upgrade
```

Once the upgrades are complete, run a script that was included in the latest upgraded packages to check your system for upgrade compatability issues:

```sh
pve7to8 --full
```

Note any warnings or failures that may impact your upgrade. I recommend stopping all VMs before continuing. For more information about the upgrade, check out the [official wiki][2]

## Upgrading

To upgrade your system, you need to edit the configured package repositories for the system to use the `bookworm` release instead of the previous release `bullseye`.

```sh
cd /etc/apt
sed -i 's/bullseye/bookworm/g' sources.list
cat sources.list
```

After you run `cat` you should see the contents of the file and if you are using Proxmox without an enterprise subscription, it should look like this:

```
deb http://ftp.us.debian.org/debian bookworm main contrib

deb http://ftp.us.debian.org/debian bookworm-updates main contrib

# security updates
deb http://security.debian.org bookworm-security main contrib

deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription
```

There is likely another file in `/etc/apt/sources.list.d/pve-enterprise.list`. Update this file as well but unless you have a subscription, make sure the enterprise repo is not enabled by adding a `#` character at the beginning of the line to "comment out" the line.

```sh
cd /etc/apt/sources.list.d
sed -i 's/bullseye/bookworm/g' pve-enterprise.list
cat pve-enterprise.list
```

After you run `cat` you should see one entry and make sure it is commented out with `#`

```
# deb https://enterprise.proxmox.com/debian/pve bookworm pve-enterprise
```

Now I recommend running the upgrade in a `screen` or `tmux` session in case your SSH connection is interrupted. These packages are most likely not installed on a default Proxmox installation and can be installed as packages of the same name: `apt install screen`. To start a session just enter `screen` on the terminal and proceed with the rest of the commands. If your session is interrupted, the upgrade will continue and you can see the output and any prompts by typing `screen -r`.

Once you are ready in your `screen` or `tmux` session, enter the following to refresh the cache of packages and then run the upgrade.

```sh
apt update

apt dist-upgrade
```

There will likely be prompts that come up on the screen during the upgrade depending on your system so I again recommend checking out the [official wiki][2] for guidance on how to proceed with the prompts.

Once the upgrade completes, reboot the server to reload all of the upgraded software. 

```sh
reboot now
```

## Next steps

Once the server has rebooted, the upgrade is complete.

The web console can be accessed by visiting the ip address or hostname of your proxmox server in your browser on port 8006.

`https://proxmox.hostname:8006`

 [1]: /posts/proxmox-installation/
 [2]: https://pve.proxmox.com/wiki/Upgrade_from_7_to_8
