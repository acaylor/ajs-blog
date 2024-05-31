---
Title: Setting up NFS on Ubuntu 22.04
author: aj
date: 2024-05-31

categories:
  - Linux
tags:
  - linux
  - nfs
  - ubuntu
---

A Network File System (NFS) server is a network protocol that allows a system to share its files and directories with other systems over a network. NFS is commonly used in *nix environments to enable file sharing between systems. A basic NFS server is easy to set up and you can choose what directory to share with other systems.

## Ubuntu setup

On Ubuntu, first you install the nfs server packages and then enable a system daemon to manage the server and client connections.

Install packages for nfs server:

```shell
sudo apt install nfs-kernel-server
```

Start a system service to run the nfs server:

```shell
sudo systemctl start nfs-kernel-server.service
```

This step may not be necessary if installing the packages starts the service automatically. Check with a status command:

```shell
sudo systemctl status nfs-kernel-server.service
```

## export directories

To share directories with other systems you need to create a file that defines what directories for the NFS server to export and define what systems are allowed to connect.

Manage which directories are exported by the nfs server using the file `/etc/exports`

Here is an example:

```conf
/srv/shared       hostname1(rw,sync,no_subtree_check) hostname2(ro,sync,no_subtree_check)
```

Any directory specified here needs to exist on the system where the nfs server is running. You can restrict access to certain exported directories by specifying a `hostname` or IP address followed by options offered to the client at that address.

In that example, the uncommented line exports the directory `/srv/shared` to the two systems `hostname1` and `hostname2`.

Once you make changes to the file, you can reload the configuration:

```shell
sudo exportfs -a
```

## NFS ubuntu client setup

To mount an NFS file system on Ubuntu, you need to install prerequisite packages.

```shell
sudo apt install nfs-common
```

Use the `mount` command to mount a shared NFS directory from the system with the NFS server. You must mount it to a directory that exists on the client system. Eg:

```shell
sudo mkdir -p /mnt/nfs

sudo mount example.server.com:/srv/shared /mnt/nfs
```

An alternate way to mount an NFS share from another machine is to add a line to the /`etc/fstab` file. The line must state the hostname of the NFS server, the directory on the server being exported, and the directory on the local machine where the NFS share is to be mounted. Once configured, this directory will be mounted each time the system boots.

The general syntax for the line in `/etc/fstab` file is as follows:

```fstab
example.hostname.com:/srv/shared /mnt/nfs nfs rsize=8192,wsize=8192,timeo=14,intr
```

Once an NFS share is mounted, you can read and write files just as if they were on the local filesystem.