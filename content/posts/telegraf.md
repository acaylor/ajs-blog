---
title: Monitor Your apps and systems with Telegraf + Prometheus
author: aj

date: 2025-11-30

categories:
  - Observability
tags:
  - telegraf
  - metrics
---

Telegraf makes it easy to collect many types of metrics and you only configure what you need. Prometheus makes metric storage effortless. Together they form a monitoring stack you can run anywhere Docker works.

By the end of this post you'll have:

- Telegraf exporting metrics at `/metrics`
- Prometheus scraping those metrics every 10 seconds
- A foundation you can plug into Grafana for dashboards

Prometheus can scrape metrics for you directly but sometimes applications are written to emit metrics when an event occurs and telegraf can aggregate those metrics for you. If your application has tens or hundreds of servers all emitting metrics, telegraf can help you aggregate those metrics before they are stored in prometheus (or another system to store time-series data). Otherwise you would need prometheus to scrape hundreds of different endpoints or only collect a sample of metrics from something like a load balancer endpoint.

---

## Example architecture

- **Telegraf (container):** a plugin-driven server agent for collecting and reporting time series data, which collects host/container metrics and exposes them in Prometheus format.
- **Prometheus:** an open-source systems monitoring and alerting toolkit that scrapes metrics from instrumented jobs and stores all scraped samples locally.

This architecture follows modern observability best practices: a lightweight collector (Telegraf) feeds data to a time-series database (Prometheus) that can then power visualization tools like Grafana.

**Learn more:**

- Telegraf supports four categories of plugins – input, output, aggregator, and processor, enabling flexible data collection and transformation

**Links**:

- [Telegraf Official Documentation][1]
- [Prometheus Overview][2]
- Check out a [previous post][3] on my blog for an intro to Prometheus.

---

## Create the Project directories and files

```bash
mkdir monitoring-stack
cd monitoring-stack
mkdir telegraf
```

Example layout:

```txt
.
├── docker-compose.yml
├── prometheus.yml
├── demo-app/
│   └── app.py
└── telegraf/
    └── telegraf.conf
```

---

### Create `telegraf/telegraf.conf`

This config file is what we need to create/adjust to monitor metrics on a Linux system.

```toml
[agent]
  interval = "10s"
  round_interval = true
  omit_hostname = false

###############################################################################
# INPUTS
###############################################################################

# CPU, memory, disk, network
[[inputs.cpu]]
  percpu = true
  totalcpu = true
  collect_cpu_time = false

[[inputs.mem]]

[[inputs.disk]]
  ignore_fs = ["tmpfs", "devtmpfs"]

[[inputs.net]]

# Simple application metrics via StatsD (UDP/TCP on :8125)
[[inputs.statsd]]
  service_address = ":8125"
  delete_gauges = false
  delete_counters = false
  delete_timings = false
  delete_sets = false

###############################################################################
# OUTPUTS
###############################################################################

# Expose metrics for Prometheus
[[outputs.prometheus_client]]
  listen = ":9273"
  path = "/metrics"
```

What this does:

- Collects core host metrics every 10s.
- Serves them on `http://localhost:9273/metrics` inside the container (published to the host via Docker).

The `[agent]` section controls global collection behavior. The `interval` setting determines how frequently Telegraf samples metrics, while `round_interval` ensures collection happens at predictable times. Input plugins define what metrics to gather, and output plugins control where data gets sent.

**Configuration tips:**

- Each configuration file needs at least one enabled input plugin (where the metrics come from) and at least one enabled output plugin (where the metrics go)
- You can generate a sample config with all available plugins using `telegraf --sample-config > telegraf.conf`
- [Telegraf Configuration Guide][4]

---

### Create `docker-compose.yml`

This file will define the Containers to run our applications and how they should be configured. If you are not familiar with Docker and containers, check out a [previous post][5] to get started.

```yaml
services:
  telegraf:
    image: telegraf:latest
    volumes:
      - ./telegraf/telegraf.conf:/etc/telegraf/telegraf.conf:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/hostfs:ro
    ports:
      - "9273:9273" # Prometheus scrapes here
    environment:
      - HOST_ETC=/hostfs/etc
      - HOST_PROC=/host/proc
      - HOST_SYS=/host/sys
      - HOST_MOUNT_PREFIX=/hostfs

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports:
      - "9090:9090"

  demo_app:
    image: python:3.14-slim
    working_dir: /app
    volumes:
      - ./demo-app:/app:ro
    command: ["python", "app.py"]
    depends_on:
      - telegraf
```

The volume mounts for Telegraf enable it to read host system metrics from `/proc` and `/sys` even though it runs in a container. The environment variables tell Telegraf where to find these host paths.

(Leaving `container_name` unset lets Docker Compose namespace the containers automatically, avoiding conflicts if you already run Prometheus elsewhere. I sometimes run multiple prometheus containers when testing new metrics.)

---

### Configure Prometheus Scraping (`prometheus.yml`)

This file will configure Prometheus to collect (scrape) the metrics from Telegraf.

```yaml
global:
  scrape_interval: 10s

scrape_configs:
  - job_name: "telegraf"
    static_configs:
      - targets: ["telegraf:9273"]
```

This adds a single job named `telegraf` that connects over Docker's internal network to the Telegraf container. The job name is added as a label `job=<job_name>` to any timeseries scraped from this config, which helps organize and identify metrics in Prometheus.

The `scrape_interval` controls how often Prometheus polls the target. Setting it to match Telegraf's collection interval (10s) ensures minimal data loss and efficient metric delivery.

**Learn more:**

- [Prometheus Configuration Documentation][6]
- [Prometheus Getting Started][7]

---

## Start the Stack

```bash
docker compose up -d
docker compose ps
```

You should see both `telegraf` and `prometheus` in the `Up` state.

---

### Verify Telegraf Is Exporting Metrics

```bash
curl http://localhost:9273/metrics | head
```

Expected output snippet:

```txt
# HELP cpu_usage_idle Idle CPU time
# TYPE cpu_usage_idle gauge
cpu_usage_idle{cpu="cpu-total"} 92.4
```

Each metric line includes a HELP comment describing the metric, a TYPE declaration (gauge, counter, histogram, etc.), and the actual data point with any tags/labels. This should all be in plain text.

---

### Verify Prometheus Is Scraping Telegraf

Open the UI at `http://localhost:9090`.

1. Navigate to **Status -> Targets**. You should see `telegraf` with state **UP**.
2. In **Graph**, run query `cpu_usage_idle` to confirm samples are flowing.

This confirms the scrape pipeline is working end-to-end. Prometheus stores data in its local TSDB by default (in the `./data` directory relative to where Prometheus runs).

---

## App Metrics Example (StatsD)

Telegraf can also collect custom application metrics. StatsD is a lightweight network daemon that collects and aggregates metrics from your applications and systems. StatsD listens for metric data sent from your applications over UDP (or TCP). Instead of applications directly writing metrics to a time-series database, they send simple, standardized messages to StatsD. StatsD then aggregates these metrics and periodically flushes them to a backend storage system like Graphite, InfluxDB, or Prometheus. Telegraf has a plugin to accept packets in StatsD format.

A StatsD packet will send metric data in this format: `api.requests:1|c`

Here’s a minimal example that emits two StatsD metrics (`orders_processed` gauge and `api_requests` counter) from a tiny Python container and lets Prometheus scrape them via Telegraf.

1. **Create the demo app** at `demo-app/app.py`:

```python
"""Minimal StatsD emitter for Telegraf."""
import os, random, socket, time

STATSD_HOST = os.getenv("STATSD_HOST", "telegraf")
STATSD_PORT = int(os.getenv("STATSD_PORT", "8125"))

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

while True:
    # Gauge: how many orders were processed in this interval
    sock.sendto(f"orders_processed:{random.randint(0,50)}|g".encode(), (STATSD_HOST, STATSD_PORT))
    # Counter: count API hits
    sock.sendto("api_requests:1|c".encode(), (STATSD_HOST, STATSD_PORT))
    time.sleep(5)
```

2. **Enable StatsD in Telegraf** (already present in the config above):

```toml
[[inputs.statsd]]
  service_address = ":8125"
```

3. **Add the demo container** to `docker-compose.yml` (already shown):

```yaml
demo_app:
  image: python:3.14-slim
  working_dir: /app
  volumes:
    - ./demo-app:/app:ro
  command: ["python", "app.py"]
  depends_on:
    - telegraf
```

4. **Bring everything up** (rebuild if the stack was already running):

```bash
docker compose down
docker compose up -d --build
```

5. **Query the app metrics in Prometheus** at `http://localhost:9090`:

- `orders_processed` (gauge) shows the latest emitted value.
- `rate(api_requests[1m])` shows requests per second from the counter.

If you see values changing every few seconds, Telegraf is successfully receiving StatsD packets and exposing them for Prometheus to scrape. This same pattern works for any app/library that can send StatsD metrics(or another Telegraf input like Prometheus remote_write, Influx line protocol, etc.).


---

## Optional: Add Grafana (Highly Recommended)

Append this service to `docker-compose.yml` and restart with `docker compose up -d`:

```yaml
grafana:
  image: grafana/grafana:latest
  container_name: grafana
  ports:
    - "3000:3000"
```

Grafana default credentials: `admin / admin`.

Add Prometheus as a data source: **Configuration -> Data Sources -> Prometheus -> http://prometheus:9090**.

After you add and configure a data source, you can use it as an input for many operations, including: Query the data with Explore, Visualize it in panels, and Create rules for alerts.

**Learn more:**

- [Grafana Getting Started][8]
- [Grafana Data Sources Guide][9]
- [Grafana Documentation][10]

---

## Next steps

This foundation scales well: you can add more scrape targets, implement custom dashboards, set up alerting rules, or integrate with other observability tools. The flexibility of Telegraf's plugin ecosystem means you can adapt this stack to bare metal servers, virtual machines at home and in the cloud.

### Extend Your Telegraf Inputs

Drop additional plugins into `telegraf.conf` as your needs grow. With 300+ plugins, Telegraf is the way to start collecting metrics from cloud services, applications, IoT sensors, and more. Some popular additions:

- Docker container stats: `[[inputs.docker]]`
- Kubernetes inventory: `[[inputs.kube_inventory]]`
- Systemd service states: `[[inputs.systemd_units]]`
- SMART drive health: `[[inputs.smart]]`
- Application metrics via StatsD: `[[inputs.statsd]]`
- Cloud provider metrics: AWS CloudWatch, Azure Monitor, GCP Stackdriver

Each plugin has its own configuration options and can be mixed and matched to build a comprehensive monitoring solution.

**Explore all available plugins:**

- [Telegraf Plugins Documentation][11]
- [GitHub Telegraf Repository][12]

_New disclaimer I am adding: I used an LLM to help create this post but afterwards I spent more than an hour editing it to the final form._

 [1]: https://docs.influxdata.com/telegraf/v1/
 [2]: https://prometheus.io/docs/introduction/overview/
 [3]: /posts/prometheus/
 [4]: https://docs.influxdata.com/telegraf/v1/configuration/
 [5]: /posts/containers/
 [6]: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
 [7]: https://prometheus.io/docs/prometheus/latest/getting_started/
 [8]: https://grafana.com/docs/grafana/latest/getting-started/
 [9]: https://grafana.com/docs/grafana/latest/datasources/
 [10]: https://grafana.com/docs/
 [11]: https://docs.influxdata.com/telegraf/v1/plugins/
 [12]: https://github.com/influxdata/telegraf
