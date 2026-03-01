---
title: apcupsd_exporter forks and app setup
description: Forking and maintaining apcupsd_exporter and its Go client for a clean modern setup.
author: aj
date: 2026-03-01
categories:
  - Homelab
  - Software
tags:
  - apcupsd
  - ups
  - prometheus
  - golang
  - open source
  - software

---

This is a follow-up to [my previous apcupsd post][1]. Check that post out for an overview of this project but essentially the goal is to collect metrics from a UPS system manufactured by APC and present them in Prometheus format to scrape with Prometheus.

I forked the GitHub repositories needed for `apcupsd_exporter` and kept the MIT license in place. That means anyone can still use, modify, and redistribute the code under the same open source terms.

Using forks here gives me a stable base for my homelab while still keeping the project open for anyone else. So far I have just updated the project dependencies and configured Renovate to manage the dependencies.

## Forks and license

I am now using my forked repositories:

- `apcupsd_exporter`: [GitHub][2]
- `apcupsd` library dependency: [GitHub][3]

Both remain under the MIT license.

## apcupsd library changes (2026-02-28)

I also took over maintenance for my `apcupsd` library fork with two focused commits:

- Commit `8dc22a9`:
  - moved module/repo from `github.com/mdlayher/apcupsd` to `github.com/acaylor/apcupsd`
  - kept original attribution and added fork attribution in `LICENSE.md` and `README.md`
  - upgraded the project from Go `1.20` to `1.26`
  - updated `go-cmp` from `v0.5.9` to `v0.7.0`
  - added `.gitignore` and a clearer development section in README
  - updated CI matrices to test/analyze on Go `1.26`
- Commit `d1cbec1`:
  - disabled `enumcheck` in static analysis because its `x/tools` dependency is not compatible with Go `1.26` yet
  - kept `staticcheck` and `go vet` enabled
  - upgraded GitHub Actions from older versions (`setup-go@v2`, `checkout@v2`) to current versions (`setup-go@v5`, `checkout@v4`)

Short version: the fork is now clearly maintained, modernized for Go 1.26, and CI is stable while waiting for enumcheck compatibility to catch up.

## apcupsd_exporter changes (2026-02-28)

I made a matching maintenance pass on my `apcupsd_exporter` fork so it builds and tests cleanly with modern Go:

- switched exporter dependency from `github.com/mdlayher/apcupsd` to `github.com/acaylor/apcupsd` pinned at `v0.1.0`
- updated imports and module files (`go.mod`/`go.sum`) to match
- fixed tests for static analysis by replacing deprecated `io/ioutil` calls with `io`
- upgraded GitHub Actions (`setup-go` `v2` -> `v5`, `checkout` `v2` -> `v4`)
- moved CI from older multi-version Go matrices to Go `1.26` only, because both this repo and the client library now require Go `1.26`

Short version: the exporter fork tracks my maintained `apcupsd` client, requires Go 1.26, and has a stable CI pipeline for testing and static analysis.

## Fresh setup on a new Linux system

This example assumes a Debian or Ubuntu system with an APC UPS connected by USB.

### 1. Install apcupsd and basic tools

```bash
sudo apt update
sudo apt install -y apcupsd curl git tar
```

You can install go via apt repos but usually the version is old on Ubuntu and Debian: `sudo apt install golang-go`

> If you are on Raspberry Pi, you can install Go manually (Go `1.26.0`) before building the exporter:

```bash
wget https://go.dev/dl/go1.26.0.linux-arm64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.26.0.linux-arm64.tar.gz
export PATH=$PATH:/usr/local/go/bin
go version
```

To make that Go path persistent across sessions:

```bash
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.profile
source ~/.profile
```

### 2. Configure apcupsd

Edit `/etc/apcupsd/apcupsd.conf` and make sure these values are set for USB:

```ini
UPSCABLE usb
UPSTYPE usb
DEVICE
```

If `DEVICE` has a serial device path, clear it for USB setups.

Restart and enable the service:

```bash
sudo systemctl enable --now apcupsd
sudo systemctl restart apcupsd
sudo systemctl status apcupsd --no-pager
```

Optional quick check:

```bash
apcaccess status
```

### 3. Build exporter from fork

Clone and build:

```bash
git clone https://github.com/acaylor/apcupsd_exporter.git
cd apcupsd_exporter/cmd/apcupsd_exporter
go build
./apcupsd_exporter
```

Expected startup log looks like:

```log
starting apcupsd exporter on ":9162" for server tcp://:3551
```

Stop with <key>Ctrl</key> + <key>C</key> after testing.

### 4. Install exporter as a systemd service

```bash
sudo mkdir -p /opt/apcupsd_exporter
sudo cp apcupsd_exporter /opt/apcupsd_exporter/
sudo chmod 755 /opt/apcupsd_exporter/apcupsd_exporter
sudo useradd --system --no-create-home --shell /usr/sbin/nologin apcupsd_exporter
```

Create `/etc/systemd/system/apcupsd_exporter.service`:

```ini
[Unit]
Description=Prometheus exporter for apcupsd
After=network.target apcupsd.service

[Service]
Type=simple
User=apcupsd_exporter
Group=apcupsd_exporter
ExecStart=/opt/apcupsd_exporter/apcupsd_exporter
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now apcupsd_exporter
sudo systemctl status apcupsd_exporter --no-pager
```

### 5. Verify metrics endpoint

```bash
curl -s http://localhost:9162/metrics | grep -i apc
```

### 6. Add Prometheus scrape config

```yaml
- job_name: 'apcupsd'
  scrape_interval: 60s
  static_configs:
    - targets:
        - your-server-name-or-ip:9162
```

After reloading Prometheus, you should see UPS metrics being scraped from the new host.

If you are also using Grafana, you can reuse the dashboard approach from my [apcupsd dashboard post][4].

---

## Closing thoughts

I have mixed feelings about copying/forking the original projects. I settled on the fact that the original code is MIT open source and many others have already forked the project. Since it is so important to my homelab, I would rather keep a close eye on this software.

_New disclaimer: I used an LLM to help create this post. Opinions expressed are likely from me and not the LLM._

 [1]: /posts/apcupsd/
 [2]: https://github.com/acaylor/apcupsd_exporter
 [3]: https://github.com/acaylor/apcupsd
 [4]: /posts/apcupsd-dashboard/
