---
title: State of the homelab, September 2023
author: aj
date: 2023-09-17
categories:
  - Homelab
tags:
  - homelab
---

In 2023 I have not done much in the homelab because I moved across my country. My plans for the future of the lab include lowering power consumption and simplifying infrastructure. The most notable event this year was the release of Debian 12. The [Debian Linux][1] distribution is now the operating system I am using on all of my machines including my laptop.

Proxmox continues to be a reliable backbone to my lab. I have upgraded to version 8 that uses Debian 12 and vm backups continue to restore on new hosts reliably. A lot of hardware failures this year:

- KingFast SSD
- GSKILL DDR5 Memory
- GSKILL DDR4 Memory
- Raspberry Pi 3b
- HP Micro desktop
- MSI 360mm closed loop cpu cooler

Last "homelab update" post was [April 2023][2]

## Changes

- Stopped using truenas. Too many features when I can manage a few NFS shares with a single configuration file.
- NAS VMs: Ubuntu 22.04 LTS with openzfs and raidz2
- HP micro desktop died. Did not replace.
- Brought Raspberry Pi 4 back online to work with arm cpu and containers.

### Homelab services

Here is an up to date diagram with all of the services mapped out:

![homelab_sep2023](/images/homelab_sep2023.png)

### Homelab grafana dashboard

Here is the grafana dashboard that is on the lab tv 24/7

![grafana_sep2023](/images/grafana_sep2023.png)

 [1]: https://www.debian.org/ 
 [2]: /posts/homelab-april-2023/
