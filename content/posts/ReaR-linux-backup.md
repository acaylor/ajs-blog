---
title: ReaR linux backup and recover
author: aj
date: 2022-02-24

categories:
  - Linux
tags:
  - rear
  - backup
  - restore
  - linux
  - shell
---

[Relax-and-Recover][1] is an open-source tool to create computer backup archives and bootable ISO images of a Linux system. ReaR creates a bootable image consisting of the latest state of the system to be backed up. This image can be used for disaster recovery. ReaR was designed to be easy to setup and can be run through a `cron` job with minimal effort if you have storage somewhere for storing backup images.

In my homelab, I have a suitable NFS server that can be used to store backup images. For more information on how to set up an NFS server see [a previous post][2] on the subject.

## Install and Configure ReaR with Ansible

I have created an Ansible role to automate this configuration. I have a [previous post][3] about Ansible, check that out for information about Ansible. When you run the role against a Linux system, ReaR will be installed and configured with a cron job backup at a regular interval while the system is powered on.

Cron is a job scheduling utility present in Linux systems. The cron daemon will execute scheduled cron jobs at the intervals that the user or system configures. We will use a cron job to run ReaR backup jobs daily.

To use this ansible role, create a `requirements.yml` file to pull the role from my public Github repo:

```yaml
- src: https://github.com/acaylor/rear
```

At the time of this post, the ansible role supports usage on RedHat family distributions and Debian family distributions. For RHEL 8 you will need the `EPEL` repository enabled.

This does not support arm64 architecture so no Pis.

Create an ansible playbook to reference my role for execution `playbook.yml`:


```yaml
---
# target all inventory hosts, you could use inventory groups instead
- hosts: all
  # Many tasks here require root access
  become: yes
  vars:
    # Configure backup cron job which minute to execute
    rear_cron_min: "0"
    # Configure backup cron job which hour to execute
    rear_cron_hour: "0"
    # Configure NFS server to backup to
    nfs_server: "server.example.com"
    # Configure NFS share to backup to
    nfs_dir: "foo/bar"
  roles:
    - rear
```

You can create an inventory file to limit the scope of execution `inventory.ini`:

```ini
[ubuntu]
examplehost.example.org
[redhat]
example2.example.org
```

### Playbook execution

```bash
# Install role from requirements file
ansible-galaxy install -r requirements.yml
# Run the new playbook, use inventory of desired hosts, -K is to ask for become password
ansible-playbook playbook.yml -i inventory.ini -K
```

You need to configure the variables to match an NFS server and NFS share that you already have access to. This NFS server will be used to store backup archives.

---

### Configuration

Running the playbook will configure the backup job to run as a `cron` job. The job runs the same command you can run manually to begin a backup job. This command will create the bootable media and backup the system.

```bash
rear -d -v mkbackup
```

The other options you can use with `rear` are:
- `mkbackuponly` - create only the backup archive
- `mkrescue` - create only the bootable image

Running `rear` will utilize the configuration specififed in `/etc/rear/local.conf`.

```conf
OUTPUT=iso
OUTPUT_URL=nfs://nfs.ip/backups
BACKUP=NETFS
BACKUP_URL=nfs://nfs.ip/backups
BACKUP_PROG_EXCLUDE=("${BACKUP_PROG_EXCLUDE[@]}" '/media' '/var/tmp' '/var/crash')
```

This configuration will create an iso image for disaster recovery and copy the backup archive to NFS storage specified in the `BACKUP_URL` configuration. Directories can be excluded from backup with the `BACKUP_PROG_EXCLUDE` option.

For more information and options, check the manual page `man rear`.

The ansible role will use variables to populate the URLs used for .iso output and backup archives. Enter environment appropriate details in the playbook before executing.

```conf
{{ ansible_managed }}
OUTPUT=ISO
OUTPUT_URL=nfs://{{ nfs_server }}/{{ nfs_dir }}
BACKUP=NETFS
BACKUP_URL=nfs://{{ nfs_server }}/{{ nfs_dir }}
BACKUP_PROG_EXCLUDE=( '/media' '/var/tmp' '/var/crash')
```

Ansible variables are taken and used in the config file copied to the remote host. The `template` ansible module takes a .j2 file and will copy it to the remote system

## Recovery

To recover the system that was backed up, create a bootable drive or USB drive with the .iso image created by ReaR. For more information on how to create a bootable USB, see a [previous post][4].

When booting from this image, there are two main options to manually recover the system or attempt an automatic recovery.

If the manual option is chosen, the system will boot a minimal linux system where you can run the command `rear recover` to walk through the restoration.

When using either restoration method, if NFS storage was used, ReaR will automatically utilize the backup archive on the remote NFS server which is another feature that makes this quite a nice backup and recovery software.

Once the recovery completes, you can reboot the system without using the recovery drive. The restore operation outputs to a log file in `/var/log/rear/recover/restore`.

Make sure to always test your backup images. There is nothing worse than trying to recover your system only to discover that the backup image is incomplete or corrupted.

 [1]: http://relax-and-recover.org/documentation/getting-started
 [2]: /posts/truenas/
 [3]: /posts/ansible/
 [4]: /posts/creating-usb-installation-media/
 [5]: https://github.com/acaylor/rear