---
title: Homelab, 2024 stage 4 Software
author: aj
date: 2024-06-02

categories:
  - Homelab
tags:
  - homelab
---

Through 2024 I have been redesigning my homelab. Now that networking, firewalls, and servers are operational, the foundation is in place to start managing software projects within the Homelab.

## Critical server software

The most important software in use in my homelab is tied to the "critical" servers. "Critical" servers will run 24/7 so I opt for the lowest power usage devices that I own which in my case is 2 Raspberry Pi devices.

- Raspberry Pi 3 will provide DNS primarily as well as a NGINX web server/proxy to redirect HTTP traffic.
- Raspberry Pi 4 will run identical services to ensure DNS will be available if the other Pi is offline. This Pi will also run a Wireguard VPN server since it has more memory.
- A virtual machine will also run a backup DNS server.

If you are not familiar with the Raspberry Pi, check out a [previous post][1] that walks through how to set one up. There is also a post talking about [how to use NGINX as a proxy][2].

### DNS software

In order to manage DNS records, I use several self-hosted instances of AdGuard Home. You can easily set up a DNS rewrite to send all traffic in a sub-domain to the IP address of the server with the NGINX proxy server. Check out [a previous post][3] to check out more information about AdGuard Home. In that post I set up AdGuard-sync to ensure all DNS servers stay up to date with configuration and local DNS record changes.

### Storage software

For my homelab I am not using anything currently other than [openzfs][4] and an [NFS server][5].

## Hypervisor software

For my homelab [I am using Proxmox][6] to manage virtual machines on computers running in my homelab. If you are not familiar with virtual machines, check out [a previous post][7] to learn more and get started.

![proxmox_logo](/images/proxmox-logo.jpg)

Proxmox comes with a UI and API.

![proxmox](/images/proxmox_test.png)

## Observability software

To monitor all servers, each system sends logs to a central server running [Grafana Loki][8] and each system emits metrics [using Prometheus][9] exporters.

![loki_logo](/images/loki_logo.png)

Grafana Loki stores logs and supports both simple architecture as well as saving logs to object storage (s3 and minio).

Logs and metrics can be queried and visualized with graphs and statistics using Grafana.

![grafana_example](/images/loki_dashboard.png)

Prometheus is a time series database and api for collecting metrics.

```promql
sum by (job) (
  rate(nginx_http_requests_total[1m])
)
```

Returns:

```shell
{job="nginx"}         0.5666666666666667
```

## Backup software

To back up important data I use scripts to save backup archive files to a storage with an NFS share. To backup virtual machines, I use Proxmox to manage backup jobs that save snapshots and disk archives to an NFS share.

I do not backup physical servers other than important directories. When a system has a disk drive failure, I install a new operating system and restore files if needed from a backup or Version Control System Git.

Here is an example script I use to back up a home directory:

```bash
#!/usr/bin/env bash
set -e # stop script on error

DEST='/mnt/nfs/backup'
SYNC='/home/$USER'
SERVER="nfs-server.example.com"
SHARE="/path/to/nfs/share"
ARCHIVE="backup-$(hostname)-$(date +'%F').tar.gz"
CMD='tar -cpzf'

if [[ ! -d $DEST ]];
then
    mkdir -p $DEST # make the nfs mounted dir if not exists
fi

echo "Mounting NFS share $SHARE on $SERVER..."
NFS="mount -t nfs $SERVER:$SHARE $DEST"

$NFS

echo "Writing backup archive: $ARCHIVE to $SERVER..."
$CMD $DEST/$ARCHIVE $SYNC

#Delete old files 14 days, OPTIONAL
#find $DEST -mtime +14 -delete

umount $DEST
echo "backup $(hostname) is done..."
```

## VPN software

A VPN is a way to create a secure tunnel from a remote network onto your own network. When I am not at home I can still trust my DNS requests and access resources from my personal networks. There are different VPN softwares out there and I use Wireguard.

![wireguard_logo](/images/wireguard.png)

Check out a previous [post][10] to setup Wireguard as a VPN server and client.

 [1]: /posts/setting-up-raspberry-pi
 [2]: /posts/nginx/
 [3]: /posts/adguard-home/
 [4]: /posts/ubuntu-zfs/
 [5]: /posts/ubuntu-nfs/
 [6]: /posts/proxmox-installation/
 [7]: /posts/getting-started-with-virtual-machines/
 [8]: /posts/loki-homelab-logging/
 [9]: /posts/prometheus/
 [10]: /posts/wireguard/