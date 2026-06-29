---
title: Diagrams as code with D2
author: aj
date: 2026-06-27
image: /images/diagrams-with-d2/d2-logo.svg
description: 'Using D2 to turn a Docker Compose observability stack into a readable system diagram.'

categories:
  - Software
tags:
  - diagrams
  - software
  - developer tools
  - d2
---

I have a previous post about [creating diagrams with code][1]. In that post I used Mermaid and the Python `diagrams` package. Since then, I have found that D2 fits a different diagramming job.

I still like Python `diagrams` when the picture is really an architecture diagram: cloud providers, Kubernetes clusters, load balancers, databases, network edges, that kind of thing. The icon library is the point. It helps the reader immediately understand what kind of thing each node represents.

I have started using [D2][2] at work, and it feels better when I want to explain a workflow, a service relationship, or the rough shape of a system. D2 lets me write a small text file and get a useful diagram without spending much time on layout.

That makes it a good fit for higher level system maps.

## What D2 is

D2 stands for Declarative Diagramming. It is a small language for turning text into diagrams: you describe the nodes, groups, labels, and relationships, and the D2 renderer turns that into an image.

The smallest useful D2 file looks something like this:

```d2
browser -> grafana: open dashboards
grafana -> loki: query logs
grafana -> prometheus: query metrics
```

That gives you boxes and labeled arrows without dragging anything around by hand. From there you can add containers, shapes, styles, icons, layout direction, and export formats.

Rendered, that small file looks like this:

![Simple D2 diagram showing a browser opening Grafana, with Grafana querying Loki and Prometheus](/images/diagrams-with-d2/basic-observability.svg)

That is the part I care about most: the source of truth stays in a text file. I can commit it, review it, regenerate it, and change it with the same workflow I use for code. Since it is code, it is also easy for AI agents to use.

## Installing D2

On macOS, the easiest path is Homebrew:

```bash
brew install d2
d2 version
```

D2 also ships an install script. I like running the dry run first so I can see what it plans to do:

```bash
curl -fsSL https://d2lang.com/install.sh | sh -s -- --dry-run
curl -fsSL https://d2lang.com/install.sh | sh -s --
d2 version
```

The [official install docs][3] also cover standalone release archives, installing from source with Go, Windows installers and package managers, and Docker images. If Homebrew is not the right fit, start there.

## Where D2 fits

I think about the tools this way:

- Mermaid is convenient when the diagram lives directly in Markdown and the platform already renders it.
- Python `diagrams` is useful when recognizable infrastructure icons are part of the message.
- D2 is a good default when I want a plain system map with groups, labels, and readable relationships.

## The source system

For this post I will walk through an example software stack.

For this example I used a Docker Compose file from my Grafana test repo:

```bash
curl -fsSL https://raw.githubusercontent.com/acaylor/grafana/refs/heads/main/docker-compose.yml
```

The compose file runs a local observability stack:

- `grafana` for dashboards, alerts, and querying data
- `loki` for log storage
- `fluentd` for collecting container logs
- `otel-collector` for receiving Fluentd-forward logs and shipping them onward
- `prometheus` for scraping metrics
- `influxdb` for time-series storage
- `telegraf` for host metrics
- `node-server` as a sample application

Compose gives me the inventory: services, ports, volumes, `depends_on`, and logging drivers. It does not automatically explain the intent of the system. That is where I like D2. I can choose the story I want the diagram to tell.

## Why this works better in D2

This compose file does not need vendor icons. The important part is the relationship between a few local services:

- containers send logs to `fluentd`
- `otel-collector` receives forwarded logs
- `loki` stores logs
- `grafana` queries logs and metrics
- `prometheus`, `influxdb`, and `telegraf` cover the metrics side
- named volumes show where state survives container replacement

D2 makes that easy to express directly. I can draw the service boundary, group related things, label the arrows, and keep the diagram focused on intent.

## The edit loop

I keep the D2 file next to the rendered image:

```text
public/images/diagrams-with-d2/
  grafana-observability.d2
  grafana-observability.svg
```

Then I render it with the D2 CLI:

```bash
d2 grafana-observability.d2 grafana-observability.svg
```

That gives me a tight edit loop: change the text file, render the SVG, done.

## D2 source

Here is the D2 source code for the diagram:

```d2
direction: down

classes: {
  service: {
    shape: rectangle
    style: {
      fill: "#fff8e8"
      stroke: "#3b3428"
      stroke-width: 2
    }
  }
  store: {
    shape: cylinder
    style: {
      fill: "#f4efe2"
      stroke: "#3b3428"
      stroke-width: 2
    }
  }
  endpoint: {
    shape: rectangle
    style: {
      fill: "#f7f7f7"
      stroke: "#555"
      stroke-dash: 4
    }
  }
}

user: "browser" {
  class: endpoint
}

compose: "docker compose project" {
  style: {
    fill: "#fcfaf5"
    stroke: "#8a5300"
    stroke-width: 2
  }

  app: "node-server\nsample app\n:3001" {
    class: service
  }

  grafana: "grafana\nUI + alerts\n:3000" {
    class: service
  }

  prometheus: "prometheus\nmetrics scrape\n:9090" {
    class: service
  }

  influxdb: "influxdb\nmetrics store\n:8086" {
    class: store
  }

  telegraf: "telegraf\nhost metrics" {
    class: service
  }

  fluentd: "fluentd\nlog router\n:24224" {
    class: service
  }

  otel: "otel-collector\nfluent forward\n:8006" {
    class: service
  }

  loki: "loki\nlog store\n:3100" {
    class: store
  }
}

volumes: "named volumes" {
  class: endpoint
  fluentd: "fluentd-storage"
  grafana: "grafana-storage"
  influxdb: "influxdb-storage"
  loki: "loki-storage"
}

user -> compose.grafana: "open dashboards"

compose.app -> compose.fluentd: "container logs"
compose.grafana -> compose.fluentd: "container logs"
compose.prometheus -> compose.fluentd: "container logs"
compose.influxdb -> compose.fluentd: "container logs"
compose.telegraf -> compose.fluentd: "container logs"
compose.loki -> compose.fluentd: "container logs"

compose.fluentd -> compose.otel: "forward"
compose.otel -> compose.loki: "logs"

compose.telegraf -> compose.influxdb: "write metrics"
compose.prometheus -> compose.app: "scrape metrics"

compose.grafana -> compose.loki: "query logs"
compose.grafana -> compose.prometheus: "query metrics"
compose.grafana -> compose.influxdb: "query metrics"

compose.fluentd -> volumes.fluentd: "persist"
compose.grafana -> volumes.grafana: "persist"
compose.influxdb -> volumes.influxdb: "persist"
compose.loki -> volumes.loki: "persist"
```

The result:

![D2 diagram of a Grafana observability Docker Compose stack](/images/diagrams-with-d2/grafana-observability.svg)

## What I leave out

A diagram like this is not a replacement for the compose file. I do not try to include every environment variable, bind mount, health check, or exact startup dependency. Those details matter when running the stack, but they make the drawing noisy.

For this kind of diagram I include:

- the services a reader needs to recognize
- the ports people are likely to open in a browser or scrape from another tool
- the main data paths
- the stateful volumes
- labels on arrows where the protocol or purpose is useful

The other details can stay in the compose file.

## Closing thoughts

I still like Python `diagrams` when I want an infrastructure architecture picture with recognizable icons. I am reaching for D2 more often when I need a visual explanation of how pieces of a project relate to each other.

[1]: /posts/diagrams-as-code
[2]: https://d2lang.com/
[3]: https://d2lang.com/tour/install/
