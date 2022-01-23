---
title: KVM, QEMU, and libvirt
author: aj
date: 2022-01-23
categories:
  - Virtual Machines
tags:
  - kvm
  - qemu
  - virtual machine
  - linux
---

This post is taking a look at another suite of software to create and manage Virtual Machines. For a background on computer virtualization, check out [a previous post][1].

Linux distributions support virtualization through the Linux kernel which is why the software is called [KVM][2]. This stands for "Kernel-based virtual machine". It consists of a loadable kernel module, kvm.ko, that provides the core virtualization infrastructure and a processor specific module, kvm-intel.ko or kvm-amd.ko.

In order to leverage the kernel module, we will use another software called [QEMU][3] which is an open source machine emulator. QEMU emulates "hardware" such as a processor, memory, network interface, and storage. While qemu has a command line interface, it is mostly used by engineers who are developing the platform. [Libvirt][4] provides an abstraction from specific versions and hypervisors and encapsulates some workarounds and best practices.

These three softwares come together to form a relatively user-friendly way to create and manage virtual machines on Linux systems.

## Installation

These softwares are packaged in most Linux distributions for an easy Installation. Below is a simple ansible playbook to install the software packages on Ubuntu and Red Hat distributions. If you are not familiar with ansible, check out [a previous post][5] to get started.

```yaml
---
hosts: ubuntu
become: yes
vars:
  ubuntu_pkgs:
    - "qemu-kvm"
    - "libvirt-daemon-system"
    - "libvirt-clients"
    - "bridge-utils"
  redhat_pkgs:
    - "qemu-kvm"
    - "libvirt"
    - "virt-install"
    - "bridge-utils"
  # make sure to specify a user below
  libvirt_user: ""
  libvirt_group: "libvirt"
tasks:
  - name: install kvm on ubuntu
    apt:
      name: "{{ ubuntu_pkgs }}"
      state: present
  - name: install kvm on red hat
    dnf:
      name: "redhat_pkgs"
      state: present
  - name: add user to libvirt group
    user:
      name: "{{ libvirt_user }}"
      groups: "{{ libvirt_group }}"
      append: yes
```

### Playbook execution

```bash
ansible-playbook playbook.yml -i your_inventory.yml --extra-vars "libvirt_user=YOUR_USER" -K
```

Enter the user account you want to use to create virtual machines as an extra variable and adding the `-K` will ask for a sudo password as this playbook installs new packages and requires superuser access.


### Install with package manager

An alternative way to install qemu/kvm is to use a distribution package manager. For example on Ubuntu, install the packages and add your user to the libvirt group.

```bash
sudo apt update
sudo apt install qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils
```

```bash
sudo usermod -aG libvirt $USER
```

## libvirt command line usage

Ensure that the libvirt service is running if you encounter any error messages:

```bash
sudo systemctl status libvirtd
```

### CLI create vm

Use `virt-install` to create a vm from the shell:

```bash
virt-install \
# name your vm
--name=YOUR_VM \
# you can add a string comment describing the vm
--description='YOUR DESCRIPTION' \
# specify the memory in mb
--ram=2048 \
# you can alter the number of cpu threads given to the vm
--vcpus=1 \
# specify a path where the vm storage resides and size in gb
--disk path =/var/lib/libvirt/images/YOUR_VM/YOUR_VM.qcow2,size=32 \
# with this option you can add an .iso image file mounted inside the vm
--cdrom /var/lib/libvirt/images/YOUR_VM/YOUR.iso \
# create a virtual graphics adapter to connect to the vm with vnc
--graphics vnc
```
### virsh commands
There are several utilities available to manage virtual machines and libvirt. The virsh utility can be used from the command line:

To list running virtual machines:

```bash
virsh list --all
```

To start a virtual machine:

```bash
virsh start <vm_name>
```

To restart a virtual machine:

```bash
virsh reboot <vm_name>
```

### GUI create vm

If you have a desktop environment installed, the `virt-manager` utility provides a gui to create, manage, and connect to virtual machines.

#### Ubuntu virt-manager

If it was not installed with other libvirt tools, install:

```bash
sudo apt update
sudo apt install virt-manager
```

Ensure your user is in the `libvirt` group or run `virt-manager` as sudo.

For more details and how to use this tool on other distributions, check out the [official site][6].


 [1]: /posts/getting-started-with-virtual-machines/
 [2]: https://www.linux-kvm.org/page/Main_Page
 [3]: https://www.qemu.org/
 [4]: https://libvirt.org/
 [5]: /posts/ansible/
 [6]: https://virt-manager.org/
