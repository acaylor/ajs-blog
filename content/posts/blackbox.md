---
title: Monitor IP services with prometheus blackbox exporter
author: aj
#type: post
date: 2022-03-26
updated: 2025-11-29
categories:
  - Observability
tags:
  - blackbox
  - prometheus
  - metrics
  - grafana

---

*updated: 2025-11-29*

[Blackbox exporter][1] is used by Prometheus to monitor HTTP(S), TCP, DNS, and ICMP endpoints. If you are not familiar with prometheus, check out [a previous post][2]. The blackbox program will collect metrics and make them available on a http server. Prometheus needs to be configured to collect metrics from the blackbox exporter and then grafana can be used to visualize those metrics.

## Configure blackbox

Blackbox is configured with a `.yml` file. The file below should be mounted inside the container. This example will monitor a HTTPS site, fail if there is no SSL/TLS encryption, using a HTTP GET request, using ipv4 protocol, allowing status codes 200 and 204, using the blackbox http prober, and will timeout after 15 seconds. This file will be in the same directory as the main prometheus config if you follow from the previous post.

`blackbox.yml`

```yaml
modules:
  icmp:
    prober: icmp
    timeout: 5s
    icmp:
      preferred_ip_protocol: "ip4"
      
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: []
      method: GET
      preferred_ip_protocol: "ip4"
      
  dns:
    prober: dns
    timeout: 5s
    dns:
      query_name: "google.com"
      query_type: "A"

```

## Install blackbox with docker

There is an existing container image to run the blackbox exporter. This needs to be added to the same container network where a prometheus server container is running. See the previous [post on prometheus][2] for a complete docker-compose template. Ensure the config file exists before starting the stack; using a relative bind mount keeps the example portable across OSes.

`docker-compose.yml`

```yaml
services:
  blackbox:
    # Latest release as of 2025-11-30
    image: prom/blackbox-exporter:v0.27.0
    container_name: blackbox-exporter
    volumes:
      - ./blackbox.yml:/config/blackbox.yml:ro
    ports:
      - "9115:9115"
    restart: unless-stopped
```

The important note here is the `volumes:` key. First is the location of the blackbox config file on the host machine delimited with a `:` and inside the container, the config will be mounted in the container filesystem as `/config/blackbox.yml`.

Start the new container after updating `docker-compose.yml`. The tool will detect the new container and bring it up without disrupting other running containers:

```bash
docker compose up -d
```

## Configure prometheus server

Once blackbox exporter is running, the prometheus server needs to be configured to monitor the new exporter. This is where you specify the sites that you want to monitor. Replace `https://www.google.com` and others with anything and add sites to new lines under the `- targets:` key. Update the prometheus server config:

`/etc/prometheus/prometheus.yml`

```yaml
#Other jobs above

  # ICMP probes (ping-like monitoring)
  - job_name: 'blackbox-icmp'
    metrics_path: /probe
    params:
      module: [icmp]
    static_configs:
      - targets:
        - 8.8.8.8           # Google DNS
        - 1.1.1.1           # Cloudflare DNS
        - google.com
        - github.com
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115  # Blackbox exporter address
  # HTTP probes
  - job_name: 'blackbox-http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - https://google.com
        - https://github.com
        - https://reddit.com
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  ```

## Visualize new metrics with pre-made grafana dashboard

The [aforementioned post][2] included deploying grafana. Check it out for help getting grafana running. There are free dashboards available online:

https://grafana.com/grafana/dashboards/

There is a dashboard for blackbox exporter.

At this time it has the ID `7587`.

1. Navigate to the left-hand menu and Select "+" > "Import" > "Import via grafana.com"

2. Enter the ID of the dashboard you would like to import and then select "Load"

3. You should now see a dashboard like below.

![grafana_blackbox_exporter](/images/grafana_blackbox_exporter.png)

 [1]: https://github.com/prometheus/blackbox_exporter
 [2]: /posts/prometheus/
