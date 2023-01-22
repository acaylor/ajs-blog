---
title: Proxmox Ubuntu 22.04 template
author: aj
date: 2023-1-22
categories:
  - Proxmox
  - Virtual Machines
  - Linux
tags:
  - proxmox
  - homelab
  - virtual machine
---

Ubuntu 22.04 was released in 2022 and is a long term support server Linux distribution. We can reasonably expect the publishers of Ubuntu to maintain security and kernel updates for Ubuntu until 2027. This distribution is a good choice for using as a base template for virtual machines. If you are not familiar with creating virtual machine templates for Proxmox, check out [a previous post][1] that is more focused on getting started.

### Create a new virtual machine template that works with cloud-init

Proxmox supports cloud-init which makes cloning virtual machines easier. Cloud-init reads configuration data when the virtual machine boots for the first time. Proxmox can pass in enough data to get a working system without you having to step through an installation wizard. It also enables you to deploy many virtual machines at the same time.

Proxmox out of the box can configure the following options with cloud-init:

- User
- Password
- ssh keys
- DNS
- Static IP or DHCP

When using cloud-init in Proxmox, the virtual machine will have a hostname that matches the name given to Proxmox as well.

Previously I have used [packer][2] to create virtual machine templates but Debian and Ubuntu Linux publish ready to use VM templates that are already set up with cloud-init. Let's download an Ubuntu template and make a small tweak to enable the QEMU guest agent which will allow Proxmox to communicate with the virtual machine operating system.

##### Download Ubuntu cloud image

Log into the Proxmox host. If you have a cluster of Proxmox nodes, I recommend using shared storage so they can all utilize the template easily. If you have a shared directory mounted, head there, otherwise going to `/tmp` is a good option.

```bash
cd /tmp
wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img
```

This will download the latest image for Ubuntu 22.04 (jammy) into the current directory.

Now install a package on the Proxmox host to tweak this image to support the QEMU guest agent:

```bash
apt-get install libguestfs-tools

virt-customize -a jammy-server-cloudimg-amd64.img --install qemu-guest-agent
```

Now we can import this image into Proxmox as a vm template:

Create a VM template using id 999 or another unique number to your Proxmox:

```bash
#qm create <UNIQUE_ID> --name <TEMPLATE_NAME> --memory <MEMORY_IN_MB> --net0 <NETWORK_ADAPTER_TYPE,bridge=<Proxmox_NETWORK_BRIDGE>
qm create 999 --name jammy-template --memory 2048 --net0 virtio,bridge=vmbr0
```

Import the cloud-init image as the new template's boot disk. Make sure to replace `local-lvm` with your Proxmox storage if you are not using the default storage.

```bash
qm importdisk 999 jammy-server-cloudimg-amd64.img local-lvm

qm set 999 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-999-disk-0

qm set 999 --ide local-lvm:cloudinit

qm set 999 --boot c --bootdisk scsi0

qm set 999 --serial0 socket --vga serial0

qm template 999
```

Now this template is ready to be used. You can clone the template using the Proxmox console or it could be used in a terraform deployment. If you would like to learn how to do this with terraform, check out [a previous post][3] to get started using terraform for Proxmox.

 [1]: /posts/creating-linux-virtual-machine-templates-with-packer/
 [2]: https://www.packer.io/
 [3]: /posts/terraform/
