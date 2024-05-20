---
Title: Setting up ZFS storage pools on Ubuntu 22.04
author: aj
date: 2024-05-19

categories:
  - Linux
tags:
  - linux
  - zfs
  - ubuntu
---

One of the most useful systems to set up in a homelab is shared storage. Making storage available over the network makes it easier to share files and make system backups. I have tried various setups for shared storage in my homelab and my latest iteration is an attempt at a simple setup.

I am going to set up an Ubuntu 22.04 LTS Linux system with disk drives assigned to [ZFS][1] storage pools. This operating system is a stable base to set up [SMB][2] file shares for Windows clients, [AFP][3] for macOS, [NFS][4] for Linux, [iSCSI][5] for block storage, [rsync][6] daemons, and [FTP][7] servers.

In the past I have used [TrueNAS][8] as an operating system for a storage server. I found myself constantly logged into the terminal of the TrueNAS system and it included many features that I was not interested in leveraging on my NAS. I want my NAS to just provide storage over various protocols. I want to run applications on a system that is separate from my NAS. For other folks, I absolutely see the value of running TrueNAS or a similar system such as unraid where everything ranging from your storage to your applications are on the same system.

## ZFS setup on Ubuntu

### Prerequisites

To have an effective storage system, you will want a computer with Ubuntu Linux installed and a system with at least 1 empty hard disk drives in order to create a ZFS storage pool.

<https://ubuntu.com/server/docs/basic-installation>

ZFS, or the Z File System, is a combined file system and logical volume manager designed to provide features such as data integrity, snapshot capabilities, and support for large storage capacities. Originally developed by Sun Microsystems for their Solaris operating system, ZFS has been ported to various Unix-like systems, including FreeBSD and Linux.

#### Install zfs packages

First there is a package you need to install on the Ubuntu system:

```shell
sudo apt-get install zfsutils-linux
```

#### Identify the disks

```shell
lsblk | \
  awk 'NR==1{print $0" DEVICE-ID(S)"}NR>1{dev=$1;printf $0" "; \
  system("find /dev/disk/by-id -lname \"*"dev"\" -printf \" %p\""); \
  print "";}'| \
  grep -v -E 'part|lvm'
```

Here we are running the `lsblk` command to list block devices on the system. Next we are formatting the output to show disks with a unique identifier `disk/by-id` so that we can mount the disks consistently when the system reboots. You may have seen disks on Linux listed as `dev/sda` or `/dev/sdb` but these are arbitrary letters assigned by the kernel that is subject to change when the system reboots.

### Create a storage pool

Ubuntu makes the process of creating a storage pool very simple. There are a few options available. The most simple setup that I can recommend is a `mirror` setup where you have two disks that mirror the same data for redundancy in case one of the disks fail. If you have enough disks, I recommend a 

Use the device ID not the simple letters:

```shell
sudo zpool create pool-name mirror /dev/disk/by-id/foo /dev/disk/by-id/bar
```

Replace `pool-name` with a name for the storage pool and the disks should match output from the previous `lsblk` command.

I had ssds that were slightly different sizes so I got a warning:

```
mirror contains  devices of different sizes
```

Adding the `-f` flag worked but the disks now have unused space after the zfs partition

Check the status of the pool:

```shell
sudo zpool status
```

On Ubuntu, the storage pool you created will automatically be mounted on the system under `/pool-name` and will mount when the system reboots. That is one reason why I like how simple it is to set up a storage pool on Ubuntu. They don't do anything strange with the disks so you could take the disks and import them into a different server that supports ZFS. I have a pool that has bounced around at least 3 different operating systems.

At this point, you can start creating new files and directories in the storage pool and set up file shares or connect to the system over SSH.

#### Creating a pool with more parity

If you have several disk drives, you can use the `raidz` option when creating a pool to configure the parity level of the storage pool. If you have at least 3 drives you can create a `raidz` pool that will tolerate a single disk drive failing. If you have 5 drives or more I highly recommend `raidz2`.

Example to create a `raidz2` pool

```shell
sudo zpool create pool-name raidz2 /dev/disk/by-id/foo /dev/disk/by-id/bar /dev/disk/by-id/baz /dev/disk/by-id/oof /dev/disk/by-id/rab
```

### To destroy the pool

```shell
sudo zpool destroy pool-name
```

### Optional compression

ZFS can compress data automatically. This will increase cpu usage but can be worth it to save disk space.

```shell
sudo zfs set compression=lz4 pool-name
```

Check the compression ratio:

```shell
sudo zfs get compressratio
```
## Maintenance

It is a good idea to use a function called `scrub` at a somewhat regular interval (could be achieved via `cron` job). Note that on Ubuntu they automatically create a cronjob that runs a scrub every month. If your system is not consistently powered on you may want to run scrub operations manually.

```shell
sudo zpool scrub pool-name
```

The scrub can be checked with the status command.



 [1]: https://openzfs.org/wiki/Main_Page
 [2]: https://en.wikipedia.org/wiki/Server_Message_Block
 [3]: https://en.wikipedia.org/wiki/Apple_Filing_Protocol
 [4]: https://en.wikipedia.org/wiki/Network_File_System_(protocol)
 [5]: https://en.wikipedia.org/wiki/Internet_SCSI
 [6]: https://linux.die.net/man/5/rsyncd.conf
 [7]: https://en.wikipedia.org/wiki/File_Transfer_Protocol
 [8]: /posts/truenas/