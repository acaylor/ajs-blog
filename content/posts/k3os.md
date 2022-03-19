---
title: k3os kubernetes cluster
author: aj
image: /images/rancher-desktop-logo.png
date: 2022-01-17
draft: true
categories:
  - Containers
tags:
  - containers
  - kubernetes
  - k3os

---

[k3OS][1] is a Linux distribution designed to remove as much OS maintenance as possible in a Kubernetes cluster. It is specifically designed to only have what is needed to run [k3s][2]. Nodes only need to join a cluster and then all aspects of the OS can be managed from Kubernetes. Both k3OS and k3s upgrades are handled by the k3OS operator.

There are some differences in the file system hierarchy compared to a normal Linux distribution. Only a few directories are persistent while system directories will not persist changes.

```
/etc - ephemeral
/usr - read-only (except /usr/local is writable and persistent)
/k3os - system files
/home - persistent
/var - persistent
/opt - persistent
/usr/local - persistent
```

Upon creation of this post, k3os is based on Ubuntu LTS kernel.

## Creating a cluster

A cluster is composed of one or more nodes. A node can be a physical computer or a virtual machine. K3os runs well in hypervisor platforms such as VMware, VirtualBox, or KVM. The first node provisioned will act as a "server" and will house the control plan and kubernetes API endpoint.

### Create an installation config in YAML

To configure the k3os installer, prepare a YAML file with the parameters for your environment. This will allow for an automated install on the nodes whether they are physical computers or virtual machines.

```yaml
ssh_authorized_keys: <Insert your public SSH key>
write_files:
  - path: /var/lib/connman/default.config
    content: |-
      [service_eth0]
      Type=ethernet
      IPv4=<node_ip>/<subnet_mask>/<gateway_ip>
      IPv6=off
      Nameservers=<dns_server_address>
      SearchDomains=<dns_domain>
      Domain=<network_domain>
      TimeServers=pool.ntp.org
hostname: k3m1
k3os:
  k3Args:
    - server
    - --cluster-init
```

Note for the first node to include `k3os.k3Args=--cluster-init` but not on subsequent nodes. For nodes that you would like to add to the cluster, you need to instead enter the following `k3os` keys:

```yaml
k3os:
  token: contents/of//var/lib/rancher/k3s/server/node-token
  server_url: https://hostname.of.first.node:6443
  k3s_args:
    - agent
```

### Edit installation .iso

Download the installation .iso image from GitHub and then edit the grub config to configure the automated installation.

```bash
# Deb distros: apt install grub-efi grub-pc-bin mtools xorriso
# RPM distros: dnf install grub2-efi grub2-pc mtools xorriso
# suse: zypper in mtools xorriso
# Alpine: apk add grub-bios grub-efi mtools xorriso
mount -o loop k3os-amd64.iso /mnt
mkdir -p iso/boot/grub
cp -rf /mnt/k3os iso/
cp /mnt/boot/grub/grub.cfg iso/boot/grub/
```

Edit `iso/boot/grub/grub.cfg`

I changed the parameters on the first menu entry to install in silent mode and use a URL to download the system configuration. This will be the address of your system with the simple python web server with the installation config or you can use a public site such as pastebin.

Linux kernel parameters are added on the line starting with `linux`.

```cfg
set default=0
set timeout=10

set gfxmode=auto
set gfxpayload=keep
insmod all_video
insmod gfxterm

menuentry "k3OS Installer" {
  search.fs_label K3OS root
  set sqfile=/k3os/system/kernel/current/kernel.squashfs
  loopback loop0 /$sqfile
  set root=($root)
  linux (loop0)/vmlinuz printk.devkmsg=on k3os.mode=install console=ttyS0 console=tty1 k3os.install.silent k3os.install.config_url=http://web.server:8000/k3s.yml k3os.install.device=/dev/sda
  initrd /k3os/system/kernel/current/initrd
}

menuentry "k3OS LiveCD & Installer" {
  search.fs_label K3OS root
  set sqfile=/k3os/system/kernel/current/kernel.squashfs
  loopback loop0 /$sqfile
  set root=($root)
  linux (loop0)/vmlinuz printk.devkmsg=on k3os.mode=live console=ttyS0 console=tty1
  initrd /k3os/system/kernel/current/initrd
}

menuentry "k3OS Rescue Shell" {
  search.fs_label K3OS root
  set sqfile=/k3os/system/kernel/current/kernel.squashfs
  loopback loop0 /$sqfile
  set root=($root)
  linux (loop0)/vmlinuz printk.devkmsg=on rescue console=ttyS0 console=tty1
  initrd /k3os/system/kernel/current/initrd
}
```
Once the grub config has been updated, create a new iso image:

```bash
grub-mkrescue -o k3os-new.iso iso/ -- -volid K3OS
```

This .iso can now be mounted in a physical or virtual computer and will automatically install via the parameters given in the file that is specified under `k3os.install.config_url=`

### Once server node is live

Once the server node with the control plane is running, note the following files for accessing the cluster and adding new nodes:

- `/etc/rancher/k3s/k3s.yaml` is a `kubeconfig` file that you can use to run `kubectl` commands. copy this to your machine `~/.kube/config`
- `/var/lib/rancher/k3s/server/node-token` contains the token to join new nodes to the cluster.

Additional nodes can be added using the node token as the value of `k3os.token` in the YAML configuration file.

The k3s is a minimal kubernetes deployment. It does come with an Ingress controller by default.

### Setting up a web app with Ingress



## Updating the cluster

Apply node label `k3os.io/upgrade` with the value `latest`.

```yaml
metadata:
  labels:
    foo: bar
    k3os.io/upgrade: latest
```
This will cause the k3os system upgrade controller to react and update k3os.



 [1]: https://k3os.io/
 [2]: https://k3s.io/
 [3]: https://github.com/rancher/k3os