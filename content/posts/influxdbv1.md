---
title: Capture Nanosecond Metrics with Telegraf + InfluxDB v1
author: aj

date: 2025-12-01

categories:
  - Observability
tags:
  - telegraf
  - influxdb
  - metrics
  - python
---

Telegraf is an open-source metrics collection agent that gathers system and application data, while InfluxDB is a time-series database built for storing these metrics. Telegraf can write directly into InfluxDB with nanosecond precision giving you finer granularity than Prometheus, which stores measurements in milliseconds. This guide shows how to collect metrics from your host and applications, store them in InfluxDB 1.x, and maintain a minimal containerized setup. I have used all of these tools at work and in my homelab. If you are not familiar with Telegraf, check out [a previous post][1] where I set it up along with Prometheus.

By the end you'll have:

- Telegraf writing to InfluxDB
- A demo application sending request latency measurements through Telegraf's InfluxDB listener
- Database queries you can run in the InfluxDB shell or Grafana to detect and visualize microsecond-level performance variations

---

## Why InfluxDB v1?

- **Nanosecond resolution:** InfluxDB 1.x stores timestamps down to the nanosecond, making it ideal for capturing brief performance bursts such as 99th-percentile latencies or timing variations between requests.
- **Stable and proven:** Version 1.12.2 is the latest open-source release in the 1.x series, well-tested and maintained.
- **Predictable container image:** Pinning to `influxdb:1.12.2-alpine` ensures consistency. The `latest` Docker tag will transition to InfluxDB 3 on February 3, 2026, so explicit versioning prevents unexpected upgrades. See [GitHub][2] for more information about new versions of InfluxDB.

---

## Architecture

- **Telegraf (container):** Collects operating system metrics (CPU, memory, disk, network) and accepts InfluxDB line protocol, a plaintext format for time-series data, on port 8186. It then forwards this data to InfluxDB with nanosecond precision. Version 1.36.4 (released November 17, 2025) is the latest Telegraf [release as of December 1, 2025][3].
- **InfluxDB v1:** A time-series database that stores nanosecond-precision measurements.
- **Demo application:** Sends measurement data in InfluxDB line protocol format to Telegraf's HTTP listener.


---

## Project layout

Create a directory for this example where we can store these config files and the source code for an example Python application.

```txt
.
├── docker-compose.yml
├── telegraf/
│   └── telegraf.conf
└── demo-app/
    └── app.py
```

---

## Telegraf config

Create this file in your project directory to configure Telegraf: `telegraf/telegraf.conf`

```toml
[agent]
  interval = "10s"
  round_interval = true
  omit_hostname = false

###############################################################################
# INPUTS
###############################################################################

[[inputs.cpu]]
  percpu = true
  totalcpu = true

[[inputs.mem]]
[[inputs.disk]]
  ignore_fs = ["tmpfs", "devtmpfs"]
[[inputs.net]]
  ignore_protocol_stats = true  # silence deprecated protocol stats path; use [[inputs.nstat]] if you need them

# Accept Influx line protocol from apps (HTTP)
[[inputs.influxdb_listener]]
  service_address = ":8186"
  read_timeout = "10s"
  write_timeout = "10s"

###############################################################################
# OUTPUTS
###############################################################################

[[outputs.influxdb]]
  urls = ["http://influxdb:8086"]
  database = "metrics"
  precision = "ns"
  retention_policy = ""
```

Telegraf can send metrics to multiple destinations. If you're new to the InfluxDB line protocol, the [official reference][4] covers the format used here.

Key differences from a Prometheus approach:

- The output destination changed from `outputs.prometheus_client` to `outputs.influxdb`
- Added `inputs.influxdb_listener` to accept HTTP POST requests containing InfluxDB line protocol directly from your applications

---

## Docker Compose stack

Create a file to configure Docker containers to run our applications: `docker-compose.yml`

```yaml
services:
  telegraf:
    image: telegraf:1.36.4-alpine
    volumes:
      - ./telegraf/telegraf.conf:/etc/telegraf/telegraf.conf:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/hostfs:ro
    ports:
      - "9273:9273"   # internal metrics if you want to keep Prom scrape
      - "8186:8186"   # Influx line protocol ingress
    environment:
      - HOST_ETC=/hostfs/etc
      - HOST_PROC=/host/proc
      - HOST_SYS=/host/sys
      - HOST_MOUNT_PREFIX=/hostfs

  influxdb:
    image: influxdb:1.12.2-alpine
    ports:
      - "8086:8086"
    volumes:
      - influxdb-data:/var/lib/influxdb
    environment:
      - INFLUXDB_DB=metrics
      - INFLUXDB_HTTP_AUTH_ENABLED=false

  demo_app:
    image: python:3.14-slim
    working_dir: /app
    volumes:
      - ./demo-app:/app:ro
    command: >
      sh -c "pip install requests && python app.py"
    depends_on:
      - telegraf

volumes:
  influxdb-data:
```

Notes:

- The InfluxDB container image is explicitly versioned at 1.12.2 to prevent accidental upgrades to version 3 when the `latest` tag changes.
- Omitting `container_name` allows Docker Compose to generate unique names automatically, which is useful if you run multiple instances of this stack.

---

## Demo Python application (`demo-app/app.py`)

This example application simulates an online shopping checkout system and records how long each request takes (latency) with nanosecond precision.

```python
"""Emit nanosecond latency metrics to Telegraf with basic logging."""
import logging
import os
import random
import time

import requests

TELEGRAF_WRITE = os.getenv("TELEGRAF_WRITE", "http://telegraf:8186/write")
SERVICE = os.getenv("SERVICE", "checkout")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

while True:
    start = time.perf_counter_ns()
    time.sleep(random.uniform(0.02, 0.12))  # simulate work
    duration = time.perf_counter_ns() - start

    # Influx line protocol: measurement,tag field value timestamp
    payload = f"latency,service={SERVICE} value={duration} {time.time_ns()}"
    try:
        resp = requests.post(TELEGRAF_WRITE, data=payload, timeout=2)
        resp.raise_for_status()
        logging.info("sent latency=%dns to %s", duration, TELEGRAF_WRITE)
    except Exception as exc:
        logging.warning("failed to send metric: %s", exc)
    time.sleep(1)
```

The example demonstrates sending measurements to InfluxDB via its line protocol:

- `time.time_ns()` records the timestamp in nanoseconds.
- Request duration typically ranges from tens to hundreds of milliseconds; nanosecond precision reveals subtle variations, such as distinguishing a 20-millisecond response from a 20.4-millisecond one.

---

## Bring it up

We can use Docker to start the new applications:

```bash
docker compose up -d
docker compose ps
```

Example output:

```txt
NAME                     IMAGE                    COMMAND                  SERVICE    STATUS          PORTS
influx-test-demo_app-1   python:3.14-slim         "sh -c 'pip install …"   demo_app   Up 5s           
influx-test-influxdb-1   influxdb:1.12.2-alpine   "/entrypoint.sh infl…"   influxdb   Up 6s           0.0.0.0:8086->8086/tcp
influx-test-telegraf-1   telegraf:1.36.4-alpine   "/entrypoint.sh tele…"   telegraf   Up 6s           0.0.0.0:8186->8186/tcp, 0.0.0.0:9273->9273/tcp
```

---

## Verify the flow

### 1) Telegraf is receiving line protocol

```bash
curl -i -XPOST "http://localhost:8186/write" --data-binary "smoke_test,source=cli value=1"
```

You should see an HTTP 204 status with an empty body, confirming Telegraf accepted the line protocol payload.

### 2) Query InfluxDB for nanosecond data

Open the Influx shell:

```bash
docker compose exec influxdb influx -database metrics
```

Run:

```sql
SELECT value FROM latency WHERE service='checkout' ORDER BY time DESC LIMIT 5;
```

You should see timestamps with nanosecond precision. Example:

```txt
name: latency
time                value
----                -----
2025-12-01T21:39:54.017034959Z 121734959
2025-12-01T21:39:52.886631000Z 116816000
2025-12-01T21:39:51.763028583Z 47493583
2025-12-01T21:39:50.707021125Z 70229125
2025-12-01T21:39:49.627060584Z 75160584
```

Exit with <key>CTRL</key>+<key>D</key>

### 3) Quick Grafana panel (optional)

- Add InfluxDB data source: URL `http://influxdb:8086`, DB `metrics`, no auth.
- Query: `SELECT mean("value") FROM "latency" WHERE $timeFilter GROUP BY time($__interval), "service" fill(null)`


---

## Tuning suggestions

- **Reduce storage while preserving peaks:** Add a `[[aggregators.minmax]]` block in Telegraf to record minimum and maximum values at regular intervals, preventing loss of important performance spikes.
- **Filter by hostname:** Keep `omit_hostname = false` and use InfluxDB tags to organize and filter measurements by container or host.
- **Authentication:** Set `INFLUXDB_HTTP_AUTH_ENABLED=true` and configure database users when moving beyond local development.
- **Data retention:** Configure a retention policy for raw nanosecond-precision data, and use continuous queries to create aggregated summaries at 1-second and 1-minute intervals for long-term storage.

---

## What changed from the Prometheus article?

- The storage system switched from Prometheus to InfluxDB v1, gaining nanosecond precision instead of millisecond granularity.
- Telegraf now outputs to `outputs.influxdb`, and the input configuration uses `influxdb_listener` to receive InfluxDB line protocol directly from applications, eliminating conversion overhead.
- The demo application explicitly includes nanosecond timestamps, preserving microsecond-level timing variations in query results.

---

## Prometheus vs InfluxDB: When to use each

Both systems store time-series data collected by Telegraf, but they serve different needs:

### Prometheus

**Pros:**
- **Pull-based model:** Prometheus actively scrapes metrics from targets, making it easier to verify connectivity and debug data collection issues.
- **Built-in alerting:** Includes AlertManager for rule-based notifications without external dependencies.
- **Wider ecosystem:** More integrations, dashboards, and community libraries; industry-standard for Kubernetes monitoring.
- **Lower resource overhead:** Simpler storage model with efficient compression.
- **PromQL:** Powerful query language optimized for analysis and aggregation.

**Cons:**
- **Millisecond precision:** Timestamps rounded to milliseconds; insufficient for detecting microsecond-level variations.
- **Cardinality limitations:** Struggles with high-cardinality data (many unique label combinations).
- **Retention complexity:** Local storage only; long-term archival requires additional systems.

### InfluxDB

**Pros:**
- **Nanosecond precision:** Timestamps stored down to billionths of a second, ideal for performance profiling and detecting brief anomalies.
- **High cardinality support:** Efficiently handles datasets with many unique tag combinations (e.g., per-endpoint metrics across microservices).
- **Push-based ingestion:** Applications send data directly; useful for batch operations and edge computing scenarios.
- **Built-in data retention policies:** Automatic downsampling and deletion based on age.
- **InfluxQL simplicity:** Simpler query syntax than PromQL for straightforward time-series analysis.

**Cons:**
- **No native alerting:** Requires external tools (Grafana, Chronograf) for notifications.
- **Smaller ecosystem:** Fewer pre-built integrations compared to Prometheus.
- **Higher resource consumption:** More memory-intensive, especially for large datasets.
- **Learning curve:** Different paradigm from pull-based monitoring; requires schema planning.

### Choose Prometheus if:
- You monitor Kubernetes clusters or containerized infrastructure.
- You need reliable alerting and have ops teams familiar with AlertManager.
- Your metrics have low cardinality (few unique label combinations).
- You want an industry standard with extensive community support.

### Choose InfluxDB if:
- You need sub-millisecond precision for latency profiling or event tracking.
- You emit high-cardinality metrics (e.g., per-user, per-request measurements).
- You prefer pushing metrics from applications rather than scraping.
- You want automatic retention policies and downsampling built-in.

Both can coexist in the same infrastructure; many organizations use Prometheus for infrastructure monitoring and InfluxDB for application-level metrics. When it comes to choosing a tool for metrics, consider what type of data you need to store and query.

_New disclaimer: I used an LLM to help create this post and then edited it for accuracy and style._

 [1]: /posts/telegraf/
 [2]: https://docs.influxdata.com/influxdb3/core/release-notes/#influxdb-docker-latest-tag-changing-to-influxdb-3-core
 [3]: https://github.com/influxdata/telegraf/releases/tag/v1.36.4
 [4]: https://docs.influxdata.com/influxdb/v1/write_protocols/line_protocol_reference/
