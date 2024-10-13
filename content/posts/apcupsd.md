---
title: apcupsd and metrics
author: aj
date: 2024-10-13

categories:
  - Homelab
tags:
  - apcupsd
  - ups
  - prometheus

---

APCUPSd, short for APC UPS daemon, is an open-source software suite designed to monitor APC (American Power Conversion) brand uninterruptible power supplies (UPS). APCUPSd allows continuous monitoring of APC UPS devices. It retrieves information such as battery status, load levels, input/output voltage, and other critical parameters from the UPS.

I have looked at a similar software previously for my homelab systems. It was called Network UPS Tools (NUT). Check out [a previous post][1] to learn more about NUT and getting metrics from it. I have replaced all non APC ups systems. I had some horrible experiences with cyberpower units. Every time the power failed, two of that brand's units just killed the power instead of switching to battery which makes them expensive and heavy surge protectors.

Using this software daemon in conjunction with a simple open source go program will provide a more lightweight solution for monitoring UPS systems and more importantly for me, storing the data with Prometheus. Check out the post linked above regarding NUT for an example of what I mean and if you are not familiar with Prometheus.

## Installing the apcupsd

On Debian based Linux distributions that I use, this package was available without configuring any additional software repos.

```bash
sudo apt install apcupsd
```

Check the status of the service after installation:

```bash
sudo systemctl status apcupsd.service
```

The service should be running.

## apcupsd exporter

apcupsd_exporter provides a Prometheus exporter for the apcupsd process running on a system. This is an open source project [on github][3] that I found in the Prometheus [official documentation][4].

### install the exporter

The fastest way to use the exporter is to execute the compiled binary on the same system where the apcupsd service is running and the UPS is connected via USB.

First the project must be built for your system. You will need git and golang installed. Here is how I did it on debian based distros:

_Note this was on a Raspberry Pi 5 system which uses an arm64 architecture. This would also work for macOS. If you have an intel or amd CPU, you probably want `amd64` instead._

```bash
wget https://go.dev/dl/go1.22.5.linux-arm64.tar.gz
sudo tar -C /usr/local -xzf go1.22.5.linux-arm64.tar.gz
export PATH=$PATH:/usr/local/go/bin
go version
```

That last command will make sure that go is working on your system.

Clone the project and build an executable binary on your system:

```bash
git clone https://github.com/mdlayher/apcupsd_exporter.git
cd apcupsd_exporter/cmd/apcupsd_exporter/
ls
go build
```

If the build works, there should be a file in the current directory that you can execute to run the exporter directly.

```bash
./apcupsd_exporter
```

```log
2024/10/09 18:26:30 starting apcupsd exporter on ":9162" for server tcp://:3551
```

This process will run until you exit with <key>Ctrl</key> + <key>C</key> or the system shuts down.

## Create system daemon service for apcupsd_exporter

Create a systemd service to manage running the prometheus exporter binary. Then the system journal will also log events from the exporter.

Create this file on your system: `/lib/systemd/system/apcupsd_exporter.service`

Replace the `WorkingDirectory` and `ExecStart` values with the location of the exporter on your system.

```ini
[Unit]
Description=Prometheus exporter for apcupsd
After=network.target
[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/apcupsd_exporter/cmd/apcupsd_exporter/
ExecStart=/home/ubuntu/apcupsd_exporter/cmd/apcupsd_exporter/apcupsd_exporter
Restart=on-failure
[Install]
WantedBy=multi-user.target
```

Create this service:

```bash
sudo systemctl daemon-reload

sudo systemctl enable --now apcupsd_exporter.service
```

And you can check the status of the service:

```bash
sudo systemctl status apcupsd_exporter.service
```

With luck now your system is exporting metrics from the UPS that Prometheus can scrape on port `9162`

I added this job to my Prometheus configuration to scrape the metrics:

```yaml
- job_name: 'apcupsd'
  scrape_interval: 60s
  static_configs:
    - targets:
      - server.example:9162
```

Now I will spend some time working on a new Grafana dashboard that uses these metrics.

 [1]: /posts/nut/
 [2]: /posts/
 [3]: https://github.com/mdlayher/apcupsd_exporter
 [4]: https://prometheus.io/docs/instrumenting/exporters/
