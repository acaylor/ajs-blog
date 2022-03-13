---
title: Monitor web sites with blackbox for Prometheus
author: aj
type: post
date: 2022-02-11
draft: true

categories:
  - cloud
tags:
  - blackbox
  - prometheus
  - cloud

---

[Blackbox exporter][1] is used by Prometheus to monitor HTTP(S), TCP, DNS, and ICMP endpoints. If you are not familiar with prometheus, check out [a previous post][2]. The blackbox program will collect metrics and make them available on a http server. Prometheus needs to be configured to collect metrics from the blackbox exporter and then grafana can be used to visualize those metrics.

## Configure blackbox

Blackbox is configured with a `.yml` file. The file below should be mounted inside the container. This example will monitor a HTTPS site, fail if there is no SSL/TLS encryption, using a HTTP GET request, using ipv4 protocol, allowing status codes 200 and 204, using the blackbox http prober, and will timeout after 15 seconds. This file will be in the same directory as the main prometheus config if you follow from the previous post.

`/etc/prometheus/blackbox.yml`

```yaml
modules:
  http_2xx:
    http:
      fail_if_not_ssl: true
      ip_protocol_fallback: false
      method: GET
      no_follow_redirects: false
      preferred_ip_protocol: ip4
      valid_http_versions:
        - HTTP/1.1
        - HTTP/2.0
      valid_status_codes:
        - 200
        - 204
    prober: http
    timeout: 15s
```

## Install blackbox with docker

There is an existing container image to run the blackbox exporter. This needs to be added to the same container network where a prometheus server container is running. See the previous [post on prometheus][2] for a complete docker-compose template.

`docker-compose.yml`

```yaml
version: '3'
services:
  blackbox:
    image: prom/blackbox-exporter:master
    container_name: blackbox-exporter
    volumes:
      - /etc/prometheus/blackbox.yml:/config/blackbox.yml
    restart: unless-stopped
```

The important note here is the `volumes:` key. First is the location of the blackbox config file on the host machine delimted with a `:` and inside the container, the config will be mounted in the container filesystem as `/config/blackbox.yml`.

Start the new container after updating `docker-compose.yml`. The tool will detect the new container and bring it up without disrupting other running containers:

```bash
docker-compose up -d
```

## Configure prometheus server

Once blackbox exporter is running, the prometheus server needs to be configured to monitor the new exporter. This is where you specify the sites that you want to monitor. Replace `https://www.google.com` with anything and add sites to new lines under the `- targets:` key. Update the prometheus server config:

`/etc/prometheus/prometheus.yml`

```yaml
#Other jobs above
  - job_name: 'blackbox-external-targets'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - https://www.google.com
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: prometheus-blackbox-prometheus-blackbox-exporter:9115
  ```

## Visualize new metrics with premade grafana dashboard

The [aformentioned post][2] included deploying grafana. Check it out for help getting grafana running. There are free dashboards available online:

https://grafana.com/grafana/dashboards/

There is a dashboard for blackbox exporter.

At this time it has the ID `7587`.

1. Navigate to the lefthand menu and Select "+" > "Import" > "Import via grafana.com"

2. Enter the ID of the dashboard you would like to import and then select "Load"

3. You should now see a dashboard like below.

![grafana_blackbox_exporter](/images/grafana_blackbox_exporter.png)

 [1]: https://github.com/prometheus/blackbox_exporter
 [2]: /posts/prometheus/