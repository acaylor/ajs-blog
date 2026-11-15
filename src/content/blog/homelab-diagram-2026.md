---
title: 'Homelab diagram, November 2026'
author: aj
date: 2026-11-14
description: 'A diagram of my homelab after retiring two Raspberry Pis: a five-node Proxmox cluster, a ten-node k3s cluster, four AdGuard DNS servers, a ZFS backup NAS, and how metrics, logs, and backups flow between them.'
categories:
  - Homelab
tags:
  - homelab
  - proxmox
  - kubernetes
  - diagrams
  - d2
---

The last time I diagrammed my homelab was at the start of [2025](/posts/homelab-2025-plans/). A lot has changed since then, most recently [two Raspberry Pis' worth of services](/posts/this-week-in-the-homelab-2026-11-07/), so here is where things stand in November 2026.

[![Diagram of the homelab hosts. VPN clients reach the UniFi gateway over the internet. The gateway serves a home VLAN, with a Mac mini running Prometheus and Home Assistant on its own Raspberry Pi, and a lab VLAN. In the lab, a five-node Proxmox cluster runs the VMs: gamma runs rigel (AdGuard origin, Caddy, Loki, and Grafana), polaris (WireGuard), nas-backup (a ZFS mirror shared over NFS), and a k3s worker; hp03 runs vega (Gitea, Actual, Kanboard, and AdGuard), blackhole (AdGuard), and two k3s nodes; hp01 and hp02 each run a k3s control-plane node and a worker; beta has no guests yet. The bare-metal hosts are alpha, a Raspberry Pi 4 AdGuard standby; a Synology NAS; two Raspberry Pi 5 k3s nodes; and the ayymd workstation, a k3s node with an RTX 4090. The ten-node k3s cluster has three groups. Platform: Argo CD, Cilium, cert-manager, External Secrets, CloudNativePG, the GPU Operator, Prometheus, a standby Grafana, Alloy, NFS volumes, a VersityGW S3 gateway, kured, and descheduler. Apps: Ollama, Open WebUI, n8n, SearXNG, Hermes Agent, and LibreSpeed. My projects: hass-poller, web-tools, devbox, and GitHub Actions runners.](/images/homelab-diagram-2026/homelab-2026.svg)](/images/homelab-diagram-2026/homelab-2026.svg)

Select either diagram to open it at full size.

A second diagram shows how AdGuard config, backups, metrics, logs, and Git manifests move between those hosts.

[![Diagram of data flows between homelab hosts. The Proxmox nodes and VMs and the k3s cluster send logs to Loki on rigel and metrics to Prometheus on the Mac mini, which sits on the home VLAN. hass-poller in k3s polls Home Assistant, which runs on its own Raspberry Pi. rigel syncs its AdGuard config to alpha, blackhole, and vega. Argo CD in k3s pulls manifests from Gitea on vega. vega and rigel send weekly backups to nas-backup, the k3s cluster sends Postgres backups through an S3 gateway that stores them on nas-backup, and the ayymd workstation copies its home directory there over SSH.](/images/homelab-diagram-2026/homelab-2026-flows.svg)](/images/homelab-diagram-2026/homelab-2026-flows.svg)

I created both diagrams with [D2](/posts/diagrams-with-d2/); the sources are [homelab-2026.d2](/images/homelab-diagram-2026/homelab-2026.d2) and [homelab-2026-flows.d2](/images/homelab-diagram-2026/homelab-2026-flows.d2).

## Network

Everything sits behind a UniFi gateway that handles routing, firewall rules, and DHCP across three networks: a lab VLAN, a home VLAN (IoT devices, Home Assistant, and a Mac mini) that the firewall mostly blocks from reaching the lab, and an internet-only guest network.

For remote access, the gateway forwards one UDP port to `polaris`, a small VM running [WireGuard on Ubuntu](/posts/wireguard-ubuntu-vm/) that gives VPN clients LAN DNS and access to the lab.

## Compute

**Proxmox** runs most of the lab on five nodes:

- `gamma`, a Ryzen desktop, runs `rigel` (DNS, reverse proxy, and observability), `polaris` (WireGuard), `nas-backup`, and a k3s worker.
- Three HP mini desktops, `hp01` to `hp03`, each have a USB-connected APC UPS and run a k3s control-plane node and a worker. `hp03` also runs `vega` (Gitea, Actual, Kanboard) and `blackhole` (DNS).
- `beta`, a new Ryzen mini PC, joined the cluster this month and doesn't run anything yet.

**k3s** spans ten nodes: the seven VMs above, two Raspberry Pi 5s (each on a UPS), and my GPU workstation. Argo CD deploys everything in the cluster, Cilium handles networking, CloudNativePG runs PostgreSQL, and the apps include n8n, Ollama, and Open WebUI.

**Bare metal** outside Proxmox includes the three non-VM k3s nodes above, `alpha` (a Raspberry Pi 4 standby DNS server), and a Synology NAS for bulk storage.

## DNS

Four hosts run AdGuard Home. `rigel` is the sync origin where I make changes, and `adguardhome-sync` replicates its config to `vega`, `blackhole`, and `alpha`. DHCP hands out the three Proxmox VMs; `alpha` stays off DHCP as a bare-metal standby in case Proxmox is down.

## Storage and backups

`nas-backup` is a VM with a two-disk ZFS mirror passed through from `gamma` ([Proxmox NAS VM](/posts/proxmox-nas-vm/)). It receives three sets of backups:

- `vega` and `rigel` each write a weekly backup over NFS.
- The k3s cluster's PostgreSQL backups go to an in-cluster S3 gateway backed by the same NFS share.
- My workstation copies its home directory to it over SSH.

## Observability

The Proxmox nodes and the VMs outside k3s run Grafana Alloy, which pushes logs to Loki on `rigel` and metrics to Prometheus on the Mac mini. In k3s, kube-prometheus-stack collects the cluster's metrics and forwards them to the same Prometheus with `remote_write`, and an Alloy DaemonSet ships the nodes' logs to Loki. [Monitoring Proxmox hosts with Grafana Alloy](/posts/grafana-alloy-proxmox-monitoring/) covers the host, SMART, systemd, and ZFS metrics from the Proxmox nodes.

## What's next

Something that is hard to capture on a diagram is network speed. I now have 3 gbps fiber internet service so I upgraded my network switches. My core network is 10 gigabit and I have 2.5 gigabit switches for devices. This was an immediate upgrade for a few of my workstations that already had 2.5 gbe network cards. I would like to replace my hp mini pcs that are over 10 years old with something a bit newer that has 2.5 gigabit networking and nvme storage. The new proxmox node Beta was the first of these replacements.

I am thinking about changing my observability stack but until I find something better than Grafana that I can self-host I have more enticing projects to tackle.
