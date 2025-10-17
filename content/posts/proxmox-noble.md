---
title: Proxmox Ubuntu 24.04 template
author: aj
date: 2025-10-17
categories:
  - Proxmox
  - Virtual Machines
  - Linux
tags:
  - proxmox
  - linux
  - ubuntu
  - virtual machine
---

Ubuntu 24.04 was released in 2024 and is a long term support server Linux distribution. We can reasonably expect the publishers of Ubuntu to maintain free security and kernel updates for Ubuntu until 2029. They offer paid support for extended patches past the end-of-life date for a release. For more details, check the [Ubuntu website][1] for the current release schedules.

Ubuntu Linux distribution is a good choice for using as a base template for virtual machines. If you are not familiar with creating virtual machine templates for Proxmox, check out [a previous post][2] that is more focused on getting started. In most large Enterprise organizations you will find Ubuntu or Red Hat Linux so it is good to practice with one of those.

## Create a new virtual machine template that works with cloud-init

Proxmox supports cloud-init which makes cloning virtual machines easier. Cloud-init reads configuration data when the virtual machine boots for the first time. Proxmox can pass in enough data to get a working system without you having to step through an installation wizard. It also enables you to deploy many virtual machines at the same time.

Proxmox out of the box can configure the following options with cloud-init:

- User
- Password
- ssh keys
- DNS
- Static IP or DHCP

When using cloud-init in Proxmox, the virtual machine will have a hostname that matches the name given to Proxmox as well.

Previously I have used [packer][3] to create virtual machine templates but Debian and Ubuntu Linux publish ready to use VM templates that are already set up with cloud-init. Let's download an Ubuntu template and make a small tweak to enable the QEMU guest agent which will allow Proxmox to communicate with the virtual machine operating system.

### Download Ubuntu cloud image

Log into the Proxmox host. If you have a cluster of Proxmox nodes, I recommend using shared storage so they can all utilize the template easily. If you have a shared directory mounted, head there, otherwise going to `/tmp` is a good option.

```bash
cd /tmp
wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
```

This will download the latest image for Ubuntu 24.04 (noble) into the `/tmp` directory (which we switch to with `cd`).

### Add qemu guest agent to the image

Now install a package on the Proxmox host to then install a new package on this image to support the QEMU guest agent:

```bash
apt-get install libguestfs-tools

virt-customize -a noble-server-cloudimg-amd64.img --install qemu-guest-agent
```

This will install that package onto the image that way when we clone the VM, the host system will be able to read data from the guest agent and present that in Proxmox UI/API.

### Create a new VM template in Proxmox

Now we can import this image into Proxmox as a vm template:

Create a VM template using id 999 or another unique number to your Proxmox:

```bash
qm create 999 --memory 2048 --net0 virtio,bridge=vmbr0 --scsihw virtio-scsi-pci
```

This will create a vm with a virtual scsi device to handle attaching virtual disks.

Import the cloud-init image as the new template's boot disk. Make sure to replace `local-lvm` with your Proxmox storage if you are not using the default storage.

```bash
# import the modified ubuntu image to our new vm template
qm set 999 --scsi0 local-lvm:0,import-from=/tmp/noble-server-cloudimg-amd64.img
# add a virtual drive for the cloud init image
qm set 999 --ide2 local-lvm:cloudinit
# set the noble image as the boot device
qm set 999 --boot order=scsi0
# configure the most basic output, a serial console
qm set 999 --serial0 socket --vga serial0
```

Now this template is ready to be used. You can clone the template using the Proxmox console or it could be used in a terraform deployment. If you would like to learn how to do this with terraform, check out [a previous post][4] to get started using terraform for Proxmox.

### Clone the template via CLI

Convert this VM we created based on the noble image into a VM template so it can be cloned easily in Proxmox:

```bash
qm template 999
```

To clone this VM on the command line:

```bash
qm clone 999 100 --name ubuntu-1
# set network config for new vm ID 100
qm set 100 --ipconfig0 ip=192.168.100.100/24,gw=192.168.100.1
# An ssh key can be added if the public key is on the proxmox host
qm set 100 --sshkey ~/.ssh/id_rsa.pub
```

## Next steps

Further information or maybe more up to date information may be available on the Promxox wiki: [https://pve.proxmox.com/wiki/Cloud-Init_Support][5]

The template can also be cloned using the Proxmox web UI instead of running `qm` commands.

 [1]: https://ubuntu.com/about/release-cycle
 [2]: /posts/creating-linux-virtual-machine-templates-with-packer/
 [3]: https://www.packer.io/
 [4]: /posts/terraform/
 [5]: https://pve.proxmox.com/wiki/Cloud-Init_Support
