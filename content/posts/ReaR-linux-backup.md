---
title: ReaR linux backup and recover
author: aj
date: 2021-12-04
draft: true
categories:
  - Linux
tags:
  - rear
  - backup
  - restore
  - linux
  - shell
---

ReaR is an open-source tool to create computer backup archives and bootable ISO images of a Linux system. ReaR creates a bootable image consisting of the latest state of the system to be backed up. It includes configurations to select files for backup. ReaR supports NFS, SMB, USB, rsync, and local directories as backup targets.

In my homelab, I have a suitable NFS server that can be used to store backup images.

## Install and Configure ReaR with Ansible

I will be using an Ansible playbook to configure the system with ReaR. Check out a previous post on how to get started with Ansible.