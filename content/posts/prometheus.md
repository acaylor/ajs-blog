---
title: Homelab prometheus & grafana dashboard
author: aj
date: 2022-02-27

categories:
  - Homelab
  - Containers
  - Monitoring
tags:
  - containers
  - docker
  - homelab
  - prometheus
  - grafana
  - raspberry pi
  - metrics

---

[Prometheus][1] is an open-source systems monitoring and alerting software. Prometheus collects and stores metrics as time series data, so one dimension of the data is always based on the time that the metric was recorded. Metrics are pulled over HTTP into the prometheus system. Each data monitoring source will need a data exporter that presents the metrics on a http server that prometheus can pull from.

In order to create a dashboard to use to monitor homelab infrastructure, the following components are needed:

- prometheus "server"
- exporter(s) that collect metrics
- Data visualization platform (grafana)

[Grafana][2] is an open-source application that creates visualizations of time series data. We will use grafana to visualize the metrics gathered by prometheus to create a homelab dashboard.

## Deploy prometheus and grafana with containers

Here is an overview of the deployment architecture:

![prometheus_arch](/images/prom.png)

If you are not familiar with containers, there is [a previous post][3] on how to get started and install the software needed to deploy the containers.

### prometheus config

First, prepare a YAML prometheus configuration:

```bash
mkdir -p /etc/prometheus
touch /etc/prometheus/prometheus.yml
```

```yaml
global:
  #By default, scrape targets every 30 seconds
  scrape_interval:     30s

  #Attach these labels to any time series or alerts when communicating with
  #external systems (federation, remote storage, Alertmanager)
  #external_labels:
  # monitor: 'ex-monitor'

scrape_configs:
  #The job name is added as a label `job=<job_name>`
  - job_name: 'prometheus'
    # Override the interval that metrics are scraped
    #scrape_interval: 15s
    static_configs:
      #targets: value can be a hostname or ip address
      - targets: ['localhost:9090']
  - job_name: 'node_exporter'
    static_configs:
      - targets: ['node_exporter:9100']
  #- job_name: 'cadvisor'
    #static_configs:
      #- targets: ['cadvisor:8080']
  ```

The configuration above will attempt to scrape metrics from the containers all running on the same network.

### Deploy containers 

The Prometheus server can be run on a container runtime, here is a compose template:

```yaml
version: '3'
networks:
  default:
    external:
      name: proxied
services:
  #This container will aggregate metrics that grafana can parse
  prometheus:
    image: prom/prometheus
    container_name: prometheus
    #ports:
      #- "9090:9090"
    volumes:
      - /etc/prometheus:/etc/prometheus
      - prometheus-data:/prometheus
    restart: unless-stopped
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
  #This container will collect metrics for the host system
  node_exporter:
    image: quay.io/prometheus/node-exporter
    container_name: node_exporter
    ports:
      - "9100:9100"
    command:
      - '--path.rootfs=/host'
    pid: host
    restart: unless-stopped
    volumes:
      - '/:/host:ro,rslave'
  #This container collects docker/container metrics
  #Not compatible with arm architecture such as raspberry pi or arm macs
  #cadvisor:
    #image: google/cadvisor
    #container_name: cadvisor
    # ports:
    #   - "8080:8080"
    #volumes:
      #- /:/rootfs:ro
      #- /var/run:/var/run:ro
      #- /sys:/sys:ro
      #- /var/lib/docker/:/var/lib/docker:ro
      #- /dev/disk/:/dev/disk:ro
    #devices:
      #- /dev/kmsg
    #restart: unless-stopped
  #This container will allow you to create dashboards
  grafana:
    image: grafana/grafana-oss
    container_name: grafana
    #ports:
      #- "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped
volumes:
  prometheus-data: {}
  grafana-data: {}
```

This will create all containers on the same private network and avoid exposing the metrics in plain text to the local area network. 

I have commented out `cadvisor` because they do not have an arm64 image available at this time.

I have also commented out port bindings. If you do not wish to use a reverse proxy server, simply uncomment the lines with ports: and numbers and those containers will be available on `localhost` ports of the system running the containers.

I will be deploying these containers to a raspberry pi that also has a reverse proxy server. This reverse proxy container is on the same container network as the prometheus containers. This allows me to expose the container with the dashboards to my local network and encrypt with TLS. For information on how to set up a similar system with docker and nginx proxy manager, check out [a post][4] on the subject.

## Access grafana

I have set up a reverse proxy to access grafana. This proxy server also performs TLS encryption to ensure that traffic is encrypted in transit. See link in paragraph above to set up a proxy server. The nginx container needs to be on the same container network as the containers above.

If you do not wish to use a proxy, uncomment the grafana ports: so that port 3000 which grafana uses by default will be accessible to you. In that case, navigate to the hostname or ip of the container host and add port 3000 to the url:

`http://container_host:3000/`

Regardless of proxy or port forwarding, the default credentials for grafana are:

- user: admin
- password: admin


### Add data source

Grafana needs to be configured to utilize prometheus as a data source. Navigate to the lefthand menu and find the Gear icon, then select "Data Sources".

Select "Add data source" and then find Prometheus.

All that is really needed is the `HTTP.URL` configured:

Enter http://prometheus:9090

Select "Save and test" to save the configuration.

### Add a dashboard

Once prometheus has been added as a data source, a dashboard can be added.

There are free dashboards available online: 

https://grafana.com/grafana/dashboards/

I will add Node Exporter Full to utilize the metrics from the node_exporter container.

At this time it has the ID 1860.

Navigate to the lefthand menu and Select "+" > "Import" > "Import via grafana.com"

Enter the ID of the dashboard you would like to import and then select "Load"

You should now see a dashboard like below.

![grafana_node_exporter](grafana_node_exporter_full.png)

---
### Bonus: add proxmox dashboard

In order to add a dashboard for proxmox, we need to create an exporter to scrape metrics from the proxmox api. We can do this by adding onto the prometheus container stack or run the exporter directly on a proxmox node.

#### Create a user on proxmox node

Create a non-root user to run the prometheus exporter program:

```bash
sudo groupadd --system prometheus
sudo useradd -s /sbin/nologin --system -g prometheus prometheus
```

#### Install exporter on proxmox node(s)

```bash
python3 -m pip install prometheus-pve-exporter
```

If `pip` is not working, install the package from the debian repos:

```bash
sudo apt-get install python3-pip
```

#### Create authentication config

Create a user in Proxmox with the Role `PVEAuditor`.
The [official docs][5] show how to create new users. 
Create an API token by navigating to:

Datacenter > Permissions > API Tokens > Add

Configure api credentials to scrape metrics from the proxmox api.

```bash
mkdir -p /etc/prometheus
nano /etc/prometheus/pve.yml
```

```yaml
default:
  user: prom@pve
  token_name: api_token_name
  token_value: api_token_value
  verify_ssl: false
```

#### Create a systemd file to run the exporter

`/etc/systemd/system/prometheus-pve-exporter.service`

```service
[Unit]
Description=Prometheus exporter for Proxmox VE
Documentation=https://github.com/prometheus-pve/prometheus-pve-exporter

[Service]
Restart=always
User=prometheus
ExecStart=/usr/local/bin/pve_exporter /etc/prometheus/pve.yml

[Install]
WantedBy=multi-user.target
```
Now enable this service to start exporting metrics:

```bash
systemctl daemon-reload
systemctl enable --now prometheus-pve-exporter
systemctl status prometheus-pve-exporter
```

Ensure the status is running and not failed to proceed.

#### Adding to prometheus config

On the prometheus server node(s), update `/etc/prometheus/prometheus.yml`

```yaml
  - job_name: 'proxmox'
    static_configs:
      - targets:
        - proxmox1:9221
        - proxmox2:9221
        - proxmox3:9221
    metrics_path: /pve
    params:
      module: [default]
```

Any updates will require prometheus to be restarted. If using a container, it would be similar to:

```bash
docker restart prometheus
```

#### Now add a proxmox dashboard

At this time, the dashboard compatible with this exporter is ID `10347` and after importing this dashboard, it should appear similar to this once some time has passed for prometheus to collect metrics:

![grafana_proxmox](/images/grafana_proxmox.png)

---

### Bonus: add a windows node exporter

I can add my windows desktops as node exporters as well.

#### windows exporter installation

The latest release can be downloaded from the [github releases page](https://github.com/prometheus-community/windows_exporter/releases).

Each release provides a `.msi` installer. The installer will setup the windows_exporter as a windows service, as well as create an exception in the Firewall.

If the installer is run without any parameters, the exporter will run with default settings for enabled collectors, ports, etc. The following parameters are available:

Name | Description
-----|------------
`ENABLED_COLLECTORS` | As the `--collectors.enabled` flag, provide a comma-separated list of enabled collectors
`LISTEN_ADDR` | The IP address to bind to. Defaults to 0.0.0.0
`LISTEN_PORT` | The port to bind to. Defaults to 9182.
`METRICS_PATH` | The path at which to serve metrics. Defaults to `/metrics`
`TEXTFILE_DIR` | As the `--collector.textfile.directory` flag, provide a directory to read text files with metrics from
`REMOTE_ADDR` | Allows setting comma separated remote IP addresses for the Windows Firewall exception (whitelist). Defaults to an empty string (any remote address).
`EXTRA_FLAGS` | Allows passing full CLI flags. Defaults to an empty string.

Parameters are sent to the installer via `msiexec`. 

```powershell
msiexec /i C:\Users\Administrator\Downloads\windows_exporter.msi ENABLED_COLLECTORS="cpu,cs,logical_disk,net,os,service,system,hyperv" REMOTE_ADDR="<prometheus_host>"
```

After the exporter is started, verify it is running. Visit http://localhost:<LISTEN_PORT> in your browser and see if you can browse to /metrics.

#### Adding to prometheus config

On the prometheus server node(s), update `/etc/prometheus/prometheus.yml`

```yaml
  - job_name: 'win1'
    static_configs:
      - targets: ['windows_hostname:<LISTEN_PORT>']
```

Any updates will require prometheus to be restarted. If using a container, it would be similar to:

```bash
docker restart prometheus
```

#### Add a windows dashboard

One dashboard compatible with this exporter is ID `14510` and after importing this dashboard, it should appear similar to this once some time has passed for prometheus to collect metrics:

![grafana_win](/images/grafana_win.png)

---

## Next steps

This is really just scratching the surface of what is possible. All of these dashboards are made by others in the community. PromQL can be used to construct custom dashboards. I would recommend adding a prometheus node exporter to all of the computers that are part of your lab. In my case I now can monitor all proxmox hosts, raspberry pi(s), and windows computers. The other side of system monitoring is logging and that is a topic for another day.

### Deploying prometheus node exporter with ansible

There is a handy [ansible role][6] published by the community that will download the prometheus node exporter to a linux system and install a system service to keep the exporter running. If you are not familiar with ansible, see [a previous post][7] to get started. I recommend implementing a firewall to ensure that only the prometheus server host(s) are able to connect to the node exporter port `9100`.

To use community playbook:

```bash
ansible-galaxy install cloudalchemy.node_exporter
```

Create a playbook:

```yaml
---
- hosts: all
  roles:
    - cloudalchemy.node_exporter
```

Run this against your hosts:

```bash
ansible-playbok node_exporter.yml -i your_inventory.ini -K
```

`-K` prompts for sudo password, this is optional if you have sudo configured to escalate without password prompt.


 [1]: https://prometheus.io/docs/introduction/overview/
 [2]: https://grafana.com/
 [3]: /posts/containers/
 [4]: /posts/pi-proxy/
 [5]: https://pve.proxmox.com/pve-docs/pve-admin-guide.html#pveum_permission_management
 [6]: https://galaxy.ansible.com/cloudalchemy/node_exporter
 [7]: /posts/ansible/