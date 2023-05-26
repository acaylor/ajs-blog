---
title: Upgrade TrueNAS core to TrueNAS scale
author: aj
date: 2023-05-26

image: /images/truenas_scale_logo.png
categories:
  - Homelab
tags:
  - homelab
  - truenas
  - nas
  - linux

---

One of the most useful systems to set up in a homelab is shared storage. Making storage available over the network makes it easier to share files and make system backups.

A popular operating system for creating a network storage server is called [TrueNAS][1] core which is based on FreeBSD and Linux and uses the OpenZFS file system. Check out a [previous post][2] if you are not familiar and want to set it up.

There are now multiple versions of TrueNAS to choose from and it can be a bit confusing. I am not going to be looking at TrueNAS Enterprise. TrueNAS Core was formerly known as FreeNAS and uses a BSD similar kernel. There is also TrueNAS Scale that uses a Linux kernel and supports running multiple servers in a cluster. 

I am going to upgrade/convert my existing TrueNAS Core server to TrueNAS Scale because I run TrueNAS as a virtual machine on a Proxmox Linux server. Converting to Scale will make it easier for me to manage as this version includes a package called `qemu-guest-agent` which enables better integration with the host Proxmox system. I am mainly looking forward to the ability to easily reboot the virtual machine from Proxmox API and improve RAM usage in the virtual machine.

## Upgrade from TrueNAS console

You can easily upgrade from TrueNAS core to scale using the TrueNAS console. All you need to do is navigate to the updates menu which you can access from the dashboard by selecting *Check for Updates* or navigate to the URL `/ui/system/update`

All you need to do is change the `Train` from TrueNAS Core to TrueNAS Scale.

![truenas_scale_migration](truenas-scale-migration.png)

Once you select the new train, a popup window will ask to confirm. After confirmation, select "Download Updates" button to begin the migration/upgrade.

For more information, consult the [official documentation regarding the migration][3]

Your experience may vary but for both of my servers, that was all I had to do. After the update completes, the server restarts and should boot into the new kernel. After the update and restart is complete, when you navigate to the web portal, you should see the TrueNAS scale logo followed by a username and password prompt.

I don't really have much else to cover here. All of my NFS, SMB, and WebDAV shares simply work as before although for some reason I had to reboot my Proxmox servers to remount the NFS shares.

 [1]: https://www.truenas.com/
 [2]: /posts/truenas/
 [3]: https://www.truenas.com/docs/truenasupgrades/