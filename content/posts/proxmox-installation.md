---
title: Proxmox Installation
author: aj
date: 2021-08-03
image: /images/pve-grub-menu.png
categories:
  - Homelab
  - Proxmox
  - Virtual Machines
tags:
  - homelab
  - proxmox
  - virtual machine

---
[Proxmox][1] Virtual Environment is an open-source [Linux][2] distribution for virtualization. It tightly integrates [KVM hypervisor][3] and [LXC][4], software-defined storage, and networking functionality on a single platform. With the integrated web-based user interface you can easily manage Virtual Machines and containers.

#### System Requirements

  * CPU: 64bit
  * Intel VT/AMD-V capable CPU/Mainboard
  * Minimum 1 GB RAM
  * 128 GB disk drive (Any less is not much to work with)

## Installation

  1. Download the ISO image installer [from Proxmox.][5]
  2. Create USB installation media with a tool like [Etcher][6] or mount the .iso image on a virtual disk drive in a VirtualBox VM. See [my previous post][8] on creating USB media.
  3. Once you boot the installation image, you can proceed if you see the following screen:

![pve_grub_menu](/images/pve-grub-menu.png)

  4. Proceed through the installation wizard and when you are done you can access Proxmox through the web. Navigate to the IP address or hostname of your Proxmox installation: `https://ip.of.proxmox.host:8006`

  5. The web app runs on port 8006 by default which is why you must specify `:8006` in your browser. Your browser will display a warning because, by default, the certificate used by the Proxmox web service is self-signed. If chrome does not let you proceed, type with no spaces in the browser: _thisisunsafe_

### Next steps

Once you have installed Proxmox, I suggest taking a look at the Proxmox Wiki.

* Virtual Machines: https://pve.proxmox.com/wiki/Qemu/KVM_Virtual_Machines
* Containers (LXC): https://pve.proxmox.com/wiki/Linux_Container

## Testing Proxmox inside of VirtualBox

Proxmox VE can be installed as a guest on all commonly used desktop virtualization solutions as long as they support nested virtualization. You can test Proxmox in VirtualBox if you would like. Check out my [previous post][7] for info on VirtualBox.

  1. Create a New virtual machine in VirtualBox of Type Linux and Version Debian (64-bit). Give as much memory and storage as you can but this is only a test.
  2. Now Open the VM Settings > System > Processor > Enable Nested VT-x/AMD-V

![vbox_nested_cpu](/images/vbox_nested_cpu.png)

![vbox_storage](/images/vbox_storage.png)

  3. Now close the Settings and Start the VM. 

You should see the Proxmox grub boot menu. Press [ Enter ] to begin the installation. Since this is a test, most defaults can be accepted. 

  4. Once the installation completes the VM may reboot into the installer again. Go ahead and shutdown the VM and remove the installer .iso from the Optical Drive. In the menu where you can select images, there should be an entry to "Remove Disk from Virtual Drive"

### Port forwarding

Before closing the settings, you will want to port forward 8006 TCP and possibly 22 TCP to your host system. This is because by default, VirtualBox will use NAT (Network Address Translation) on the virtual network adapter. This will provide internet access to the VM but your host system will not have a route to connect to network ports on the VM.

Port 8006 is used for the Proxmox Web app that you can use in your browser and port 22 can be used for SSH to remotely manage the system through the command line.

![vbox_network](/images/vbox_network.png)

![vbox_port_forward](/images/vbox_port_forward.png)

Enter `8006` for host + guest ports for the Web interface and/or `22` for SSH access.

Make sure the protocol is TCP.

⚠️ If you are on Windows and you get a prompt from Windows Security, select "Allow" for the VirtualBox program to modify network settings. ⚠️

You can now restart the VM and access the Proxmox VM from `localhost` ports. The web interface would be accessible for example: `https://localhost:8006/`

![proxmox_test](/images/proxmox_test.png)

You can even create nested VMs now as long as you enabled the feature in the earlier step.

#### Cleanup

To clean up everything, simply right click the vm or select the vm and navigate to the menu "Machine" + "Remove..." and select "Delete all files".

 [1]: https://pve.proxmox.com/
 [2]: https://www.linux.com/what-is-linux/
 [3]: https://www.redhat.com/en/topics/virtualization/what-is-KVM
 [4]: https://linuxcontainers.org/
 [5]: https://www.proxmox.com/en/downloads
 [6]: http://rufus.ie/
 [7]: /posts/getting-started-with-virtual-machines/
 [8]: /posts/creating-usb-installation-media/