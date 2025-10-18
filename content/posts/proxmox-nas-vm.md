---
title: Proxmox NAS VM
author: aj
date: 2025-10-18

categories:
  - Proxmox
  - Virtual Machines
  - Linux
tags:
  - proxmox
  - linux
  - ubuntu
  - virtual machine
  - nas
---

One of the most useful systems to set up in a homelab is shared storage. Making storage available over the network makes it easier to share files and make system backups. I have tried various setups for shared storage in my homelab and my latest iteration is setting up the same system I have in the past.

Why use a VM for a NAS? Well I am writing this post today because the SSD failed that had the proxmox installation and the virtual disk for my previous NAS VM. This is not really an issue since I am the only user and I can rebuild it with the few steps in this post. The important thing is if the actual data drives are intact and I am leveraging ZFS which is a filesystem with some unique features including mirroring data from one drive to another and taking snapshots of the entire filesystem.

In a production environment, I would set up more redundancy and ensure the NAS VM can be backup and restored but since I am the only user it is faster to rebuild a new VM since the disk mounting config may change on a new Proxmox install. The other recommendation I would make for a real environment would be to have a ZFS mirror for the Proxmox host OS drive so a drive failure will not result in downtime, you can replace a failed drive and mirror existing data to a new drive. Since this is a homelab and I am the only user, I do not want to spend money on that kind of redundancy.

To set up a NAS VM, I will use the following infrastructure:

- Proxmox Host (A Linux server with some software for running VMs)
- Ubuntu 24.04 LTS VM (A Linux VM that will provide the storage over the network)
- An even number of hard drives to set up a drive mirror pool (Less capacity but two copies helps prevent data loss)


```txt
┌───────────────────────────────────────────────────┐
│          Proxmox Host (Linux Hypervisor)          │
│                                                   │
│   ┌────────────────────────────────────────────┐   │
│   │        Ubuntu 24.04 LTS VM (NAS Server)    │   │
│   │                                            │   │
│   │         ZFS Mirror Pool                    │   │
│   │       ┌──────────┐    ┌──────────┐         │   │
│   │       │ Drive 1  │───│ Drive 2  │         │   │
│   │       └──────────┘    └──────────┘         │   │
│   │                                            │   │
│   └────────────────────────────────────────────┘   │
│                      ▲                            │
│        ┌─────────────┴──────────────┐             │
│        │                            │             │
│      ┌────────┐              ┌────────┐           │
│      │ Drive 1│              │ Drive 2│ (Physical)│
│      └────────┘              └────────┘           │
│                                                   │
└───────────────────────────────────────────────────┘
         Network: NFS, SMB, SSH access
```

This post will be rather brief but I have explored all of these topic in the past. Check out some previous posts to setup up Proxmox and an Ubuntu VM:

- [Installing Proxmox post][1]
- [Creating Ubuntu 24.04 Proxmox VM template post][2]

I have two more posts that we will be drawing from to set up the hard drives with a ZFS mirrored pool and configuring and NFS server to allow other systems to use the storage.

- [Ubuntu ZFS post][3]
- [Ubuntu NFS post][4]

## Setting up a VM

The process to tie together all of those pieces of tech we have explored in the past will be to:

1. Create new Ubuntu 24.04 VM with Terraform
2. Attach hard disk drives to the VM using CLI
3. Configure the Ubuntu VM with ZFS
4. Configure the Ubuntu VM with NFS

### Create a new VM

>Prerequisite: You need to have a VM template ready to use this Terraform

Create this Terraform resource with the Proxmox provider:

`nas.tf`

```hcl
resource "proxmox_vm_qemu" "nas_backup" {
  name        = "nas-backup"
  target_node = "proxmox-hostname-here"
  onboot      = true
  clone       = "noble-template"
  agent       = 1
  os_type     = "cloud-init"
  qemu_os     = "l26"
  cpu {
    type    = "host"
    sockets = 1
    cores   = 4
  }
  memory = 65536
  boot   = "order=scsi0"
  scsihw = "virtio-scsi-pci"
  disks {
    ide {
      ide3 {
        cloudinit {
          storage = "local-lvm"
        }
      }
    }
    scsi {
      scsi0 {
        disk {
          size    = 16
          storage = "local-lvm"
        }
      }
    }
  }
  network {
    id     = 0
    model  = "virtio"
    bridge = "vmbr0"
  }
  lifecycle {
    ignore_changes = [
      network,
    ]
  }
  ipconfig0 = "ip=10.0.0.2/24,gw=10.0.0.1"
  sshkeys   = <<EOF
    ${var.ssh_key}
    EOF
  serial {
    id   = 0
    type = "socket"
  }
  vga {
    type = "serial0"
  }
  tags = "homelab,managed_by_tf"
}

```

This will create a VM with a 16 GB disk, 64 GB of memory, and 4 CPU cores. Adjust for your hardware.

Also update the `ipconfig0` with appropriate IP and gateway IP for your environment.

Finally, make sure to create a terraform variable for `ssh_key`:

`variables.tf`

```hcl
variable "ssh_key" {
  type    = string
  default = "ssh-rsa"
}
```

This variable needs to be set to the value of your SSH public key.

This can be set using a `terraform.tfvars` file.

`terraform.tfvars`

```tfvars
ssh_key = "ssh-rsa foo"
```

You also need to configure the provider:

`versions.tf`

```hcl
terraform {
  required_providers {
    proxmox = {
      source  = "telmate/proxmox"
      version = "3.0.2-rc04"
    }
  }
}
provider "proxmox" {
  # URL of proxmox API where terraform commands should be executed. Append /api2/json to the hostname of your proxmox web client
  pm_api_url = var.proxmox_api_var
  # API token id
  pm_api_token_id = var.proxmox_api_token_var
  # This is the secret value of the api token
  pm_api_token_secret = var.proxmox_api_token_secret_var
}
```

Now update your variables and .tfvars to include values for your environment including the URL of your Proxmox server as well as a valid API token to use the Proxmox API. For info on how to set that up, see the [previous post for setting up Terraform][5].

Once the Terraform files are ready, Run `terraform init` to install the provider and `terraform validate` to ensure the syntax is correct.

Create the new VM with the command:

```bash
terraform apply
```

And with luck you should see similar output:

```txt
proxmox_vm_qemu.nas_backup: Creating...
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

### Attach hard drives to VM

To follow this step, assume there are 2 hard disk drives in the Proxmox system that are not mounted and can be assigned to the VM. Also assume you are familiar with the Linux shell and entering commands.

Open a shell on the Proxmox host with the NAS VM.

`lsblk` is pre-installed, you can print and map the serial and WWN identifiers of attached disks using the following two commands:

```bash
lsblk |awk 'NR==1{print $0" DEVICE-ID(S)"}NR>1{dev=$1;printf $0" ";system("find /dev/disk/by-id -lname \"*"dev"\" -printf \" %p\"");print "";}'|grep -v -E 'part|lvm'
```

That should produce columns with this info:

```txt
NAME MAJ:MIN RM SIZE RO TYPE MOUNTPOINTS DEVICE-ID(S)
```

We are looking for the device IDs for our drives. Save the `/dev/disk/by-id/wwn-0xFOOBAR` values, now we can use those to mount those devices to a vm. Stop your NAS VM if it is running and run this command to attach a disk:

```bash
qm set 100 -scsi2 /dev/disk/by-id/wwn-xxxxxxxx
```

And For a second disk, iterate the number of the scsi device, eg:

```bash
qm set 100 -scsi3 /dev/disk/by-id/wwn-yyyyyyyy
```

Now the VM should have additional disks. Run `lsblk` _inside_ the VM shell now to verify:

```bash
lsblk
```

You should see any number of devices that you added now.

### Create ZFS pool

As in my [previous post on Ubuntu + ZFS][3], install the appropriate packages inside the NAS VM:

```bash
sudo apt-get install zfsutils-linux
```

Now inside the VM run this `lsblk` command to determine our device ids inside the VM:

```bash
lsblk | \
  awk 'NR==1{print $0" DEVICE-ID(S)"}NR>1{dev=$1;printf $0" "; \
  system("find /dev/disk/by-id -lname \"*"dev"\" -printf \" %p\""); \
  print "";}'| \
  grep -v -E 'part|lvm'
```

We should see something like:

```txt
NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS DEVICE-ID(S)
sda       8:0    0   16G  0 disk   /dev/disk/by-id/scsi-0QEMU_QEMU_HARDDISK_drive-scsi0
sdb       8:16   0  3.6T  0 disk   /dev/disk/by-id/scsi-0QEMU_QEMU_HARDDISK_drive-scsi3
sdc       8:32   0  3.6T  0 disk   /dev/disk/by-id/scsi-0QEMU_QEMU_HARDDISK_drive-scsi2
sr0      11:0    1    4M  0 rom    /dev/disk/by-id/ata-QEMU_DVD-ROM_QM00004
```

Now in my case there are two large drives that we want to use for ZFS. Match this up with your drives before proceeding.

The most simple setup that I can recommend is a `mirror` setup where you have two disks that mirror the same data for redundancy in case one of the disks fail. If you have enough disks, I recommend a 

Use the device ID not the simple letters:

```bash
sudo zpool create pool-name mirror /dev/disk/by-id/scsi-0QEMU_QEMU_HARDDISK_drive-scsi2 /dev/disk/by-id/scsi-0QEMU_QEMU_HARDDISK_drive-scsi3
```

Replace `pool-name` with a name for the storage pool and the disks should match output from the previous `lsblk` command.

Check the status of the pool:

```bash
sudo zpool status
```

On Ubuntu, the storage pool you created will automatically be mounted on the system under `/pool-name` and will mount when the system reboots. That is one reason why I like how simple it is to set up a storage pool on Ubuntu.

Reboot your vm and confirm you have a new directory mounted under `/pool-name`:

```bash
df -h
```

Check for the new filesystem mount and the size.

At this point, you can start creating new files and directories in the storage pool and set up file shares or connect to the system over SSH.

### Bonus: Import existing ZFS pool

In my case as of this post, I already have a ZFS pool and want to import it to a new VM. Import with this command:

```bash
sudo zpool import
```

This will print out information for any ZFS pool metadata that Ubuntu can detect on your disks.

```txt
   pool: nas-backup
     id: 1234567890
  state: ONLINE
status: The pool was last accessed by another system.
 action: The pool can be imported using its name or numeric identifier and
	the '-f' flag.
   see: https://openzfs.github.io/openzfs-docs/msg/ZFS-8000-EY
```

So that means we can import with this command:

```bash
sudo zpool import nas-backup -f
```

Now check the status of the pool:

```bash
sudo zpool status
```

I noticed some output:

```txt
status: Some supported and requested features are not enabled on the pool.
	The pool can still be used, but some features are unavailable.
action: Enable all features using 'zpool upgrade'. Once this is done,
	the pool may no longer be accessible by software that does not support
	the features. See zpool-features(7) for details.
```

So I ran the upgrade command on my old pool.

```bash
sudo zpool upgrade nas-backup
```

That was it, I rebooted the VM and now the existing data is available at `/nas-backup`.

---

## Setting up NFS to share files

On *nix systems you can easily mount an NFS server/directory to access storage over the network. As in my [previous post on Ubuntu + NFS][4], install the appropriate packages inside the NAS VM:

```bash
sudo apt install nfs-kernel-server
```

Start a system service to run the nfs server:

```bash
sudo systemctl enable --now nfs-kernel-server.service
```

This step may not be necessary if installing the packages starts the service automatically. Check with a status command:

```bash
sudo systemctl status nfs-kernel-server.service
```

### export directories

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

### NFS ubuntu client setup

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

## Next steps

While NFS is one option, something else to explore next is setting up and SMB share for Desktop systems to use. NFS is more common on servers and Linux systems.

The filesystem of this VM is also accessible over SSH. This means you can use utilities like `rsync` to sync files over the network using SSH or NFS.

Finally, I know if you are on macOS you can mount NFS:

```bash
sudo mkdir -p /private/nfs
sudo mount -o rw -t nfs IP_OF_NAS:/nas-backup /private/nfs
```

### Backup script

Here is an example script and cronjob to backup docker volumes on another system to our nas.

`backup.sh`

```bash
#!/usr/bin/env bash
set -e

DEST='/mnt/nfs/backup'
SYNC='/var/lib/docker/volumes'

ARCHIVE="backup-$(hostname)-docker-$(date +'%F').tar.gz"
CMD='tar --warning=no-file-changed -cpzf'

if [[ ! -d $DEST ]];
then
    mkdir -p $DEST
fi

# To mount a remote NFS directory:
#mount -t nfs <host>:<remote-dir> <local-dir>
NFS="mount -t nfs 10.0.0.2:/nas-backup/backups/ $DEST"

$NFS

# stop running containers
docker stop $(docker ps -q)

#Backup archive
$CMD $DEST/$ARCHIVE $SYNC

# start containers
docker start $(docker ps -a -q)

#Delete old files
#find $DEST -mtime +90 -delete

echo "finished backup"
```

I run this script in a cronjob. To set up a cronjob in Linux enter `crontab -e` and you will be taken to a text file to set up a cronjob for the current user. Here is syntax to call the script once a week early morning local time.

```crontab
# m h  dom mon dow   command
0 1 * * 5 /usr/local/sbin/backup.sh
```

 [1]: /posts/proxmox-installation/
 [2]: /posts/proxmox-noble/
 [3]: /posts/ubuntu-zfs/
 [4]: /posts/ubuntu-nfs/
 [5]: /posts/terraform/