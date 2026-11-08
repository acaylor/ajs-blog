---
title: 'This week in the homelab- November 7, 2026'
author: aj
date: 2026-11-07
image: /images/this-week-in-the-homelab-2026-11-07/cover.png
description: 'Moving workloads off two Raspberry Pis to Proxmox VMs, rebuilding one as a DNS standby, applying BIOS and security updates, upgrading k3s and Cilium, keeping CI builds off the control plane, and tracing a broken blog build to a stale Amplify cache.'
categories:
  - Homelab
tags:
  - this-week-in-the-homelab
  - homelab
  - raspberry pi
  - proxmox
  - adguard
  - dns
  - kubernetes
  - security
  - AWS Amplify
  - pnpm
---

This is the first post in a new series logging what changed in my homelab, drawn from my Gitea commits and notes. Some weeks I don't touch anything, so I'll only post when there's something to report.

To start, I'm reaching back to late October to cover retiring two Raspberry Pis, a job that wrapped up this week.

## Retiring two Raspberry Pis

Two of my oldest machines were Raspberry Pis booting from SD cards:

- `pi.hole`, a Pi 3 installed in 2020. Despite the name, by the end it was an [AdGuard Home](/posts/adguard-home/) replica.
- `alpha`, a Pi 4 installed in 2022. Over time it had picked up the AdGuard Home sync origin, Gitea, Actual, Kanboard, WireGuard, Portainer, and a Caddy reverse proxy for most of the LAN.

Each Pi also had a UPS plugged into it over USB.

That's a lot of important services running off SD cards. Starting on October 24, I moved everything to Proxmox:

| Host           | What it is                        | What it runs now                                                                                     |
| -------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `rigel`        | Existing Ubuntu VM                | AdGuard Home (the sync origin), `adguardhome-sync`, Caddy for LAN proxies, Prometheus, Grafana, Loki |
| `vega`         | New Ubuntu 26.04 VM               | Gitea, Actual, Kanboard, an AdGuard replica, Caddy for its local apps                                |
| `polaris`      | New Ubuntu 26.04 VM, 1 vCPU, 1 GB | WireGuard and Grafana Alloy, installed natively with no Docker                                       |
| `blackhole`    | Existing Ubuntu VM                | An AdGuard replica, unchanged except that it now syncs from `rigel`                                  |
| `hp01`, `hp03` | Proxmox hosts                     | `apcupsd` and [`apcupsd_exporter`](/posts/apcupsd/) for the two UPS units                            |

I retired Portainer instead of migrating it.

### How the moves went

I migrated every service the same way and left the old data on the Pis until the end:

1. Stop the container on `alpha` without removing it.
2. Take a cold `tar` backup of its volumes and check SHA-256 sums on the copy.
3. Restore the volumes on the new host and start the container.
4. Test the new host with `curl --resolve <name>:443:<new-ip>` before changing DNS.
5. Repoint the name in AdGuard on `rigel`.

Step 5 was easy because most of my AdGuard rewrites were CNAME-style answers like `kanboard → alpha`. Each cutover just changed that target to `vega`.

Some services needed more care:

- **Gitea** hosts the repos that deploy everything else, so it couldn't deploy itself. I copied its Compose and Caddy files to `vega` by hand before cutting over DNS, and restored its SSH host keys so no client saw a host-key warning.
- **WireGuard** reused the server key and all four peers, so no client config changed. I switched the router's port forward to `polaris` and tested from my phone on cellular. Ubuntu's AppArmor profile for `wg-quick` blocks `nft` from reading `/etc/wireguard`, so the `PostUp`/`PostDown` hooks use `iptables` instead.
- **The UPS units** moved over USB to Proxmox hosts running `apcupsd`. Debian 13 doesn't package `apcupsd_exporter`, so I copied the binary and systemd unit from `hp02`.

### Moving the DNS clients

Once the services had moved, every client needed new resolvers. DHCP was easy: I changed the DNS servers on both networks in UniFi. Statically configured hosts took longer: every Proxmox host, k3s node, UniFi switch, and access point, plus the NAS and Home Assistant, had to be updated one by one.

Before wiping anything, I watched the AdGuard query logs on `alpha` and `pi.hole` for 48 hours until no real client was still using them.

Two things weren't obvious:

- Docker copies the host's `resolv.conf` only when creating a container, not on restart. I had to recreate 12 containers on `rigel` and `vega` before they stopped querying the old servers.
- k3s pods using host networking pick up the node's `resolv.conf` when they start. I ran `kubectl rollout restart` on CoreDNS, Cilium, and node-exporter.

### Things that went wrong

- I removed `pi.hole` from `adguardhome-sync` too early. Clients were still sending it about 33,500 queries a day, and once the apps stopped on `alpha`, those clients got stale answers and 502s. I added `pi.hole` back as a temporary replica until its query log was empty.
- AdGuard locks an IP out for 15 minutes after 5 failed logins. When an automatic deploy restarted `adguardhome-sync` before I'd fixed the ownership of its config directory, it tried the wrong password against `blackhole` enough times to trigger the lockout, which I had to wait out.
- The Gitea runner on `rigel` kept an HTTP keep-alive connection open to `alpha`'s Caddy and logged 502s after DNS moved. Restarting the runner fixed it.
- AdGuard's CNAME-style rewrites return `NXDOMAIN` for `AAAA` queries. Unlike glibc and Go, musl's `getaddrinfo` treats that as a failed lookup, which broke `wget` in Alpine containers.
- `alpha`'s old backup script only archived Docker volumes. It skipped `/opt/containers`, where the `.env` files and TLS certs live. The final backup covered everything, and the new backup scripts on `vega` and `rigel` do too.
- Because `git pull` replaces updated files with a new inode, single-file bind mounts like a `Caddyfile` keep serving the old file until the container restarts.

The final `alpha` backup went to the NAS on October 27: an 812 MB compressed archive. Then I wiped both Pis. I'm keeping the old SD cards for two weeks in case I need something from them.

Along the way, `vega` and `rigel` got weekly backups to the NAS with 60-day retention, and Loki on `rigel` got a persistent volume and 30-day retention.

## alpha is back as a DNS standby

`pi.hole` is retired for good. `alpha` came back on Tuesday: a new SD card, a fresh install of Ubuntu 26.04, and a much smaller job. It runs an AdGuard Home replica plus Alloy and cAdvisor, and nothing else. The old Caddy, Portainer, and node-exporter stacks went into an `archived/` directory in its repo.

Because `alpha` is stateless, there's nothing on it to back up. `adguardhome-sync` on `rigel` fills in `alpha`'s config with `autoSetup`, and I make every AdGuard change on `rigel`. On Wednesday I checked 44 `*.lan` names against all three replicas, and all 132 answers matched `rigel`.

DHCP only hands out `rigel`, `vega`, and `blackhole`. `alpha` is a synced standby, and I decided not to add it to DHCP as a fourth DNS server:

- glibc only uses the first three nameservers anyway.
- A Pi won't make lookups faster. When I [tuned AdGuard](/posts/adguard-home-dns-tuning/), the timeouts came from a rate limit, not from too few servers.
- Constant queries mean more SD card writes.

What `alpha` does have is independence from Proxmox. The other three DNS servers are all VMs. If a power outage or a bad host takes them down, `alpha` still has the right answers.

Monitoring on `alpha` switched from pull to push. Alloy now scrapes the host and local cAdvisor, sends metrics to Prometheus on `rigel` via `remote_write`, and ships container and journal logs to Loki. I removed the old `alpha` and `pi.hole` scrape jobs from Prometheus.

## BIOS updates

On Wednesday I updated the BIOS on the three machines I built myself, mainly for the security fixes in recent firmware:

| Machine | Role                     | Motherboard                     | New BIOS            |
| ------- | ------------------------ | ------------------------------- | ------------------- |
| `ayymd` | Workstation and k3s node | Gigabyte B650 AORUS ELITE AX V2 | `F42e`              |
| `papa`  | Fedora desktop           | ASUS ROG Crosshair X670E Hero   | `4003`              |
| `gamma` | Proxmox host             | MSI B550-A PRO                  | `A.M2` (was `A.90`) |

I recorded each image's SHA-256 before flashing and checked `gamma`'s download against the hash MSI publishes. On `ayymd` and `gamma`, I staged each image on the EFI system partition for Gigabyte's Q-Flash and MSI's M-Flash; on `papa`, which has no IP KVM, I flashed from a USB stick at the desk. I used `sudo systemctl reboot --firmware-setup` to boot straight into firmware setup from Linux.

`gamma` took the most preparation, because it hosts `rigel` and three other VMs. My IP KVM consoles are proxied through Caddy, and the route for `gamma`'s console lived on `rigel`. If I'd left it there, the console would have gone down along with the machine I was flashing. The day before, I'd given the KVMs static IPs and added a hostname for the one on `hp01`. Before shutting `gamma` down, I moved the `kvm-gamma` route to `vega`'s Caddy and checked the new DNS answer on all four DNS servers.

After the flash, `gamma` kept booting into MSI's boot restoration screen from the generic `UEFI OS` entry. A one-time **Continue boot** got me into Proxmox. To fix it for good, I moved the `proxmox` boot entry ahead of `UEFI OS` under **Settings → Boot → UEFI Hard Disk Drive BBS Priorities**. The next boot ran without help, and all four VMs started on their own. The update also reset memory from 3200 MT/s to the 2400 MT/s default, where I've left it for now.

## Patching

There has been a steady stream of security updates lately, and I've been patching the Proxmox hosts and Ubuntu VMs every few days to keep up. `gamma` alone took five rounds of updates between October 19 and November 7.

## k3s: keeping CI builds off the control plane

`cp-01` got into trouble this week. Kubernetes logged repeated system OOM kills of `Runner.Worker`, `dockerd`, CoreDNS, and Alloy. The node only has about 4 GiB of RAM, and its 28 GiB image filesystem was 95% full. After a reboot it came back Ready, using about 2.3 GiB.

A CI build is the main suspect, but I haven't proven it. OOM victims don't tell you which process was the biggest consumer. Even so, application builds shouldn't be scheduled on control-plane nodes, so I made these changes:

- Tainted `cp-01`, `cp-02`, and `cp-03` with `node-role.kubernetes.io/control-plane=:NoSchedule` by hand during the incident, then added the taint to the k3s server arguments in my Ansible inventory so rebuilt nodes register with it.
- Excluded control-plane nodes from my web-tools [Actions runners](/posts/actions-runner-controller-homelab/).
- Added a control-plane toleration to Alloy so it keeps collecting node logs.
- Left kured, node-exporter, NFD, and Cilium alone. Their existing tolerations still keep them on the tainted nodes.

`NoSchedule` doesn't evict running pods, so I still need to move the remaining application pods off the control-plane nodes and work out what filled the image filesystem.

## Upgrading k3s and Cilium

On Friday, in the same Ansible commit that added the taint, I bumped the cluster's versions and rolled them out:

- k3s v1.36.4+k3s1 → v1.36.6+k3s1, now on all 10 nodes
- Cilium 1.19.3 → 1.20.4
- Gateway API CRDs v1.4.1 → v1.6.1

## hass-poller 0.3.0

Before rolling out [hass-poller](/posts/hass-polling-to-db/) 0.3.0, I added a 10-minute startup probe matching the Deployment's progress deadline. hass-poller runs schema migrations before opening its HTTP port, so the 90-second liveness probe could kill a slow migration. Because the 0.3.0 rollup migration restarts its final step if interrupted, repeated kills could keep it from ever finishing.

Until this week, the hass-poller Grafana dashboard existed only in Grafana's database. It's now provisioned from a ConfigMap with the same UID, so old links still work. I also fixed two panels:

- Both the WAL and cache hit ratio panels queried a label those metrics don't have.
- The cache hit ratio panel also queried an unrelated metric instead of PostgreSQL's block-cache counters.

I added status tiles and panels for backup age, WAL archive age, the 0.3.0 rollup jobs, rollup lag, silent sensors, and storage.

## Smaller cluster changes

- Pinned the CloudNativePG clusters for `memory-alpha` and n8n to PostgreSQL 18.6 (`ghcr.io/cloudnative-pg/postgresql:18.6-system-trixie`), with a Renovate comment so future bumps arrive as PRs.
- Restricted LibreSpeed to amd64 nodes.
- Added an [Actions runner](/posts/actions-runner-controller-homelab/) pool for Isle of Babel 2, a private game project whose CI runs headless Godot and Blender jobs. It scales from zero to two ephemeral amd64 runners, stays off the control-plane nodes, and reads its GitHub App credentials from Bitwarden through External Secrets.

## Renovate

[Renovate](/posts/renovate-docker/) kept everything else current. On the Docker hosts, I merged new AdGuard Home, Caddy, Gitea, Gitea runner, Grafana Alloy, and Prometheus images. In the cluster, I merged Argo CD itself, several app images including n8n and SearXNG, and the Helm chart update for Alloy, kube-prometheus-stack, Ollama, and Open WebUI that had been open since October 28. I also bumped `adguardhome-sync` and the Hermes agent by hand.

## This blog's build

This blog [builds on AWS Amplify](/posts/hugo-amplify/) inside my own container image, `nodebuild`. Amplify's default build image doesn't include Git LFS, which tracks every image file in this repo.

On Thursday, the deploy for my [Fedora 45 post](/posts/fedora-45-upgrade/) failed at `astro build`:

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './yaml-error' is not defined by "exports" in .../node_modules/@astrojs/internal-helpers/package.json
```

That commit only added a Markdown file. The previous deploy, on Monday, had built fine from the same lockfile, and a clean clone built all 469 pages. Every Astro 7.4.2 build imports that `./yaml-error` subpath, so the difference had to be the dependencies Amplify installed, not the code. pnpm keeps `@astrojs/internal-helpers` under `node_modules/.pnpm/`, but the error path showed Amplify loading it from the top of `node_modules/`, where npm, not pnpm, puts packages. `amplify.yml` cached `node_modules` between builds, and Thursday's restored tree held an old copy of `internal-helpers` from before that export existed.

To fix it, the build now deletes any restored `node_modules`, installs with `--store-dir .pnpm-store`, and caches `.pnpm-store/` instead of `node_modules`. Installs still come from the cache, but they always match the lockfile. I worked through this one with Claude Code.

### Rebuilding the build image

While I was in there, I reworked `nodebuild`:

- It's based on `node:24-trixie-slim` instead of Ubuntu plus nvm. Node is on the default `PATH`, so I no longer need the `BASH_ENV` hack that sourced `nvm.sh` in every shell Amplify started.
- Corepack is installed from npm. Node 25 and later don't bundle it, so `corepack enable` would have broken on my next Node upgrade. The image also pre-fetches pnpm 12, including the native binary pnpm downloads the first time it runs.
- `git-lfs` comes from Debian's own packages, not packagecloud's install script piped to `bash`. In 2022 I noted that Ubuntu's package didn't work with Amplify. Debian's 3.6.1 works fine.
- I committed gitlab.com's published SSH host keys to the repo instead of trusting whatever `ssh-keyscan` returns at build time.
- The last build step is a smoke test, so a missing tool fails the image build instead of a deploy.
- Renovate tracks the Node, Corepack, and pnpm versions. Images from `main` are tagged with their commit SHA as well as `latest`, so I can roll Amplify back to a known-good image.

To test the new image, I pointed Amplify at the build from the `testing` branch. Then I had a Codex agent, running in a [Herdr](/posts/agent-orchestration-with-herdr/) pane, update the blog's dependencies and open a merge request. The update included Astro 7.4.5 and a lockfile change big enough to exercise the new cache. When I merged the dependency MR, the deploy succeeded on the new build image and pulled the site's image files from LFS. Then I merged the `nodebuild` changes.

## Workstation

`papa` also moved to Fedora 45 this week. It was a rougher upgrade than usual, and I wrote it up separately in [Fedora 45 upgrade](/posts/fedora-45-upgrade/).

## Side projects

Both of these live in private repos on Gitea.

**Hearthboard** is a mobile-first kanban app I'm building for household and homelab tasks. It has an HTTP API so cron jobs, automation tools, and Home Assistant can create and update cards without needing built-in integrations for each tool. Version 0.1.0-alpha.2 came out today with boards, cards, labels, comments, a filter bar, the public API, and an importer for Kanboard data. The same release swapped ESLint for Oxlint and moved the project to TypeScript 7 and Node.js 26.

**Sector Zero** is a terminal dashboard I'm writing in Go with Bubble Tea and Lip Gloss: a cyberpunk-styled "personal operations terminal" that launches with `zero`. On Sunday it got its first release candidates, v0.1.0-rc.1 through rc.3. The COMPUTE panel now shows usage allowances for Claude Code, Codex, and Antigravity, a new HABITAT panel shows Home Assistant entities, and new `-check` and `-probe` flags validate the config and test each data source once.

## Productivity stack

My current daily productivity stack looks like this:

- MacOS 27.2
- herdr 0.9.5
- Claude Code 2.1.319
- Codex 0.167.0
- OpenCode 1.19.5
- Pi 1.5.0
- Antigravity CLI 1.5.2
- Neovim v0.12.6
- k3s v1.36.6+k3s1

![Herdr workspace showing tool versions in a terminal pane alongside a Pi coding agent session.](/images/this-week-in-the-homelab-2026-11-07/productivity-stack.png)
