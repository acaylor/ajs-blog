---
title: Netboot.xyz
author: aj
date: 2021-12-31

categories:
  - Utilities
tags:
  - netboot.xyz
  - pxe
  - tools

---

The tool [netboot.xyz][1] can be used to bootstrap operating systems onto new physical or virtual computers and also run utilities to recover data over the network. With this tool you can [PXE][2] boot without having to create a lot of infrastructure to support PXE installations. With netboot.xyz, I can use a single bootable image on a usb drive or mounted to a virtual machine to install many different operating systems. This tool leverages the [iPXE][3] project to load different operating system images.

## Usage

### Bare metal servers

In order to use netboot.xyz on bare metal servers, you can create a bootable usb drive that will include the iPXE environment to load netboot.xyz.

Download the netboot.xyz image from here: https://boot.netboot.xyz/ipxe/netboot.xyz.img

#### Creating bootable usb

Check out [a previous post][4] on how to take this image and create a bootable usb drive.

#### Booting

Once you've created your bootable USB drive, reboot and set your BIOS to boot from USB first if it's not set for that already. You should see iPXE load up either load up netboot.xyz automatically or prompt you to set your networking information up.

### Virtual servers

Hypervisor software can use the bootable iso image of netboot.xyz in order to bootstrap a new operating system onto a virtual machine.

Download the bootable iso image from here: https://boot.netboot.xyz/ipxe/netboot.xyz.iso

For an example Hypervisor deployment where this image can be used, check out [a previous post][5] on Proxmox or check out [a different post][6] on how to run virtual machines on your existing computers.

## Screenshot

![netboot_xyz](/images/netboot.xyz.gif)

 [1]: http://netboot.xyz/
 [2]: https://en.wikipedia.org/wiki/Preboot_Execution_Environment
 [3]: http://ipxe.org/
 [4]: /posts/creating-usb-installation-media/
 [5]: /posts/proxmox-installation/
 [6]: /posts/getting-started-with-virtual-machines/
