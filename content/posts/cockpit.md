---
title: cockpit
author: aj
date: 2022-02-05
categories:
  - Software
  - Linux
tags:
  - cockpit
  - software
  - linux

---

Cockpit is an open-source and easy to use web-based interface to manage a Linux system. It has features for users who may be new to Linux administration and provides information helpful to experienced administrators. By default, Cockpit will use the same user accounts that are present on the system. If the system is configured to use a directory service, Cockpit will forward the authorization to the directory service.

There are also other [software packages][1] supported to integrate with cockpit. It is available in distribution packages for Red Hat distros, Debian based distros, and Arch distros.

## Installation

For the most up to date instructions for multiple distributions that are supported, check the [official site][2].

### Example Red Hat install

On Fedora and Enterprise Linux distributions:

```bash
sudo dnf install cockpit
```

```bash
sudo systemctl enable --now cockpit.socket
```

## Next steps

After installing cockpit packages, ensure the system service is running and to remotely access the web portal, port `9090` needs to be open in the system firewall.

### Firewalld rules

```bash
#Firewalld commands
sudo firewall-cmd --permanent --add-service=cockpit
sudo firewall-cmd --reload
```

Once the firewall has been opened, open a connection to port `9090` on the associated server in your browser. If you installed on your local system, use `localhost` as the address.

`https://IP_OR_HOSTNAME:9090/`


You should see a login page where you can login to the local system or a remote one.

![cockpit_login](/images/cockpit_login.png)

Upon successful login, the home page will open with the navigation menu on the left:

![cockpit_home](/images/cockpit_home.png)

### Applications

On the lefthand navigation menu under *Tools* > *Applications*

You can install addons to the cockpit application. For example, installing the "Machines" addon allows you to control KVM hypervisor virtual machines from the cockpit application and access a VNC console to the virtual machine. 

#### Machines

Once the "Machines" addon is installed along with KVM/QEMU hypervisor, the "Virtual Machines" tab will appear on the lefthand navigation menu.

If you are not familiar with installing the KVM hypervisor on Linux, check out [a previous post][3] on the topic. If you have existing virtualmachines created with `libvirt` they will appear in the "Virtual Machines" menu.

You can start and stop vms, clone, rename, and delete vms from here.

##### Create a storage pool

A storage pool is a directory that is configured to store virtual machine disk images. It can be a local filesystem, iSCSI, or NFS share. To create a new one, select "Storage Pools" > "Create storage pool"

![cockpit_storage_pool](/images/cockpit_storage_pool.png)

##### Create a VM

Select "Create VM" and here you can 
- Download some pre-defined Linux distributions directly
- Import a vm template image (qcow2 format)
- PXE (network install)
- Point to a .iso image that contains installation media to mount inside the vm

Once you select an installation type, you can allocate storage space and memory from the host. Once you create the vm, it will be accesible with a VNC console in the cockpit application.

![cockpit_vm](/images/cockpit_vm.png)

 [1]: https://cockpit-project.org/applications.html
 [2]: https://cockpit-project.org/running.html
 [3]: /posts/kvm-qemu/
