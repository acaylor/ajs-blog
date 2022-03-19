---
title: Linux setup with Ansible
author: aj
image: /images/ansible.png
date: 2022-02-18
draft: true
categories:
  - ansible
  - Rasperry Pi
  - Linux
tags:
  - ansible
  - configuration management
  - infrastructure as code
  - linux
  - raspberry pi
  - pi

---

[Ansible][1] is an open-source software that uses python to provide an automation language. I have a [previous post][2] about Ansible, check that out for information about Ansible and installation. There are certain tools that I install on every system I use and I have written some scripts to automate the setup process for brand new systems. 

Ansible will compared desired state to running state, meaning changes will only be made when needed. In other words, say you want to install an app that will install a system service so that the app will always be running. If you define the installation and configuration through Ansible, you can run the Ansible playbook(script) as many times as you want but if the software and config is already present on the system, Ansible will not restart any services or force the reinstallation of apps.

## Example: Converting a backup bash script to ansible tasks

I am going to take a bash script of mine and convert it into an ansible playbook that can be configured with variables.

```bash
#!/usr/bin/env bash

DEST='/mnt/backups'

ARCHIVE="backup-$(date +'%F_%R').tar"
BACK='/bin/tar -rvf'

SYNC='/mnt/nfs/backups'

#Make directories
mkdir -p $DEST
mkdir -p $SYNC

#Copy files to backup dir
read -p "Enter files you would like to backup, space delimited: " in
$BACK $DEST/$ARCHIVE $in
gzip $DEST/$ARCHIVE

#Sync backup dir to remote storage
rsync -auzr $DEST $SYNC

#Delete old files
find $DEST -mtime +8 -delete
find $SYNC -mtime +8 -delete
```

This script is okay but it makes assumptions about where the backup archives are being placed. This script implies that the directory defined in the variable `$SYNC` is backed by nfs storage meaning that files placed into the `$DEST` variable defined directory will end up on a remote system with storage mounted to the directory defined in `$SYNC`.

 [1]: https://www.ansible.com
 [2]: /posts/ansible/