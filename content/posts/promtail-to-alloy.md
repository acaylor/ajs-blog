---
title: Grafana Promtail to Alloy migration
author: aj
date: 2025-04-19

image: /images/loki_logo.png

categories:
  - Homelab
  - Logging
tags:
  - homelab
  - promtail
  - logging
  - grafana alloy

---

Promtail was a project I used as part of the Grafana Loki log collection ecosystem. It was deprecated as Grafana now recommends using the Grafana Alloy project to help collect telemetry data. Promtail made it relatively easy to collect logs from containers and files on a *nix system. I also used the Kubernetes helm chart to collect pod logs in Kubernetes and forward to Grafana Loki.

[My last post][4] about Grafana Loki was upgrading from v2 to v3. Now that my Loki server is upgraded, I am migrating my installations of promtail to use Alloy instead for log collection.

## Grafana Alloy

Alloy is a distribution of the Opentelemetry project from Grafana labs. Opentelemetry is a growing set of APIs for collecting metrics, logs, and traces from your systems and applications. Grafana Alloy combines the strengths of the leading collectors into one place. Whether observing applications, infrastructure, or both, Grafana Alloy (and OTEL) can collect, process, and export telemetry signals to scale your observability approach. [Official docs][1].

1. It receives data from one or many inputs.
2. It optionally transforms input data.
3. Finally it transmits transformed inputs to one or many backends.

It covers my use cases:

- Collecting logs from the Linux journal
- Discover "targets" such as all pod logs in Kubernetes.
- Apply metadata to associate Logs, metrics, and traces.
- Relabel data before sending it to a remote backend.
- Compatible with Prometheus for metrics and Grafana Loki for logs.

## Install on Docker hosts

On systems where you are running Docker as a container run time and want to collect telemetry such as logs, Alloy can run as a container along the others on the system with Docker. There are images for Linux containers using amd64 or arm64 CPU architecture.

You need Docker running. Check out [a previous post][3] to get started with containers if you are not familiar.

### First step for the migration

My first step is to convert my promtail configuration from the original yaml file to a config file for Grafana Alloy. The maintainers provided a simple tool to assist the migration. This tool is using HCL instead of YAML.

Example usage:

```bash
alloy convert --source-format=promtail --bypass-errors -o alloy.hcl promtail.yaml
```

To invoke the `alloy` command, you need to have alloy on your system. Check out the [Official docs][1] to see how to install `alloy` on your local system for example on Linux or MacOS. Here was the config that I used for promtail:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: https://loki.example.com/loki/api/v1/push

scrape_configs:
- job_name: containers
  static_configs:
  - targets:
      - localhost
    labels:
      job: containerlogs
      __path__: /var/lib/docker/containers/*/*log

  pipeline_stages:
  - json:
      expressions:
        output: log
        stream: stream
        attrs:
  - json:
      expressions:
        tag:
      source: attrs
  - regex:
      expression: (?P<image_name>(?:[^|]*[^|])).(?P<container_name>(?:[^|]*[^|])).(?P<image_id>(?:[^|]*[^|])).(?P<container_id>(?:[^|]*[^|]))
      source: tag
  - timestamp:
      format: RFC3339Nano
      source: time
  - labels:
      tag:
      stream:
      image_name:
      container_name:
      image_id:
      container_id:
  - output:
      source: output
```

I do not know if all of these options should be ported to Alloy but the CLI tool produced this configuration for Alloy based on my config to collect docker container logs:

```hcl
local.file_match "containers" {
	path_targets = [{
		__address__ = "localhost",
		__path__    = "/var/lib/docker/containers/*/*log",
		job         = "containerlogs",
	}]
}

loki.process "containers" {
	forward_to = [loki.write.default.receiver]

	stage.json {
		expressions = {
			attrs  = "",
			output = "log",
			stream = "stream",
		}
	}

	stage.json {
		expressions = {
			tag = "",
		}
		source = "attrs"
	}

	stage.regex {
		expression = "(?P<image_name>(?:[^|]*[^|])).(?P<container_name>(?:[^|]*[^|])).(?P<image_id>(?:[^|]*[^|])).(?P<container_id>(?:[^|]*[^|]))"
		source     = "tag"
	}

	stage.timestamp {
		source = "time"
		format = "RFC3339Nano"
	}

	stage.labels {
		values = {
			container_id   = null,
			container_name = null,
			image_id       = null,
			image_name     = null,
			stream         = null,
			tag            = null,
		}
	}

	stage.output {
		source = "output"
	}
}

loki.source.file "containers" {
	targets               = local.file_match.containers.targets
	forward_to            = [loki.process.containers.receiver]
	legacy_positions_file = "/tmp/positions.yaml"
}

loki.write "default" {
	endpoint {
		url = "https://loki.example.com/loki/api/v1/push"
	}
	external_labels = {}
}

```

We can see if this worked by starting an allow container that has access to the Docker container log files. The container can be configured and started with a Docker Compose yaml template `docker-compose.yaml`:

```yaml
services:
  alloy:
    container_name: alloy
    image: docker.io/grafana/alloy:latest
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        tag: "{{.ImageName}}|{{.Name}}|{{.ImageFullID}}|{{.FullID}}"
    ports:
      - 12345:12345
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - './alloy.hcl:/etc/alloy/config.alloy'
    command: run --server.http.listen-addr=0.0.0.0:12345 --storage.path=/var/lib/alloy/data /etc/alloy/config.alloy
```

For now you need to configure the container to start a server on port 12345 by adding that flag to the run command for the container. Supply a compatible config file in the same directory as the `docker-compose.yml` file `alloy.hcl`.

Once I started the container with `docker compose up -d`, my container logs were sent to Loki. It is worth noting that I saw the logs duplicated that were already collected by Promtail. Not worth fixing in my homelab but you may want to prepare your Docker hosts before starting up alloy.

Note that Alloy also supports collecting logs via the Docker daemon but I prefer this approach were we do not allow alloy to mount the Docker socket but instead just present the container log files for collection.

## Install on macOS

Logs on macOS can also be collected with Alloy. To install Alloy on macOS, I recommend [homebrew][2]:

```bash
# Add grafana tap
brew tap grafana/grafana
# Install package from Grafana
brew install grafana/grafana/alloy
```

### Configure on macOS

Alloy can be run as a homebrew service so the program will start when you log in:

```bash
brew services start alloy
```

Edit the default configuration file at `$(brew --prefix)/etc/alloy/config.alloy`. Here is an example config file to collect the macOS system log file:

```hcl
local.file_match "local_files" {
     path_targets = [{"__path__" = "/var/log/*.log"}]
     sync_period = "5s"
 }

loki.source.file "log_scrape" {
    targets    = local.file_match.local_files.targets
    forward_to = [loki.process.filter_logs.receiver]
    tail_from_end = true
  }
loki.process "filter_logs" {
    stage.drop {
        source = ""
        expression  = ".*Connection closed by authenticating user root"
        drop_counter_reason = "noisy"
      }
    forward_to = [loki.write.grafana_loki.receiver]
    }
loki.write "grafana_loki" {
    endpoint {
      url = "https://loki.example.com/loki/api/v1/push"

      // basic_auth {
      //  username = "admin"
      //  password = "admin"
      // }
    }
  }
```

If you update the configuration you can restart alloy with brew:

```bash
brew services restart alloy
```

And now the macOS logs should be forwarded to Loki. This was a big win for me cause I totally neglected to collect macOS logs with Promtail even though it was possible.

Some logs that Alloy picked up on my mac:

```json
{
	"__path__" = "/var/log/alf.log",
}, {
	"__path__" = "/var/log/fsck_apfs.log",
}, {
	"__path__" = "/var/log/fsck_apfs_error.log",
}, {
	"__path__" = "/var/log/fsck_hfs.log",
}, {
	"__path__" = "/var/log/install.log",
}, {
	"__path__" = "/var/log/shutdown_monitor.log",
}, {
	"__path__" = "/var/log/system.log",
}, {
	"__path__" = "/var/log/wifi.log",
}
```

## Collect Linux system journal logs

If you are on a Linux system, the setup to install the `alloy` package may vary depending on your distribution. Check the [Official docs][1] for how to install as a package or download an executable binary.

This HCL config block will allow Grafana alloy to collect logs from the Linux journal daemon and ensure that there is a label applied that identifies the service:

```hcl
loki.relabel "journal" {
  forward_to = []

  rule {
    source_labels = ["__journal__systemd_unit"]
    target_label  = "unit"
  }
}

loki.source.journal "systemd_journal" {
	path = "/var/log/journal"
	forward_to = [loki.write.default.receiver]
	relabel_rules = loki.relabel.journal.rules
	labels = {
			instance = "$HOSTNAME",
		}
}
```

Rather than scrape all `.log` files on Linux like I did for macOS, this interacts with the systemd journal which may include some logs that are not logged to `/var/log`. 

### Add journal as volume for containers

If using Docker/containers, we need to add the journal to the volume mounts for the container. Add this volume if using compose:

```yaml
# Other config above
  volumes:
      # Other volumes above
      - /var/log/journal:/var/log/journal:ro
```

Note that when using Docker, I discovered that there is no container image for the armv7 cpu architecture found on a Raspberry Pi 3.

## Alloy UI

You can view a basic debugging UI if you have access to port `12345` on the system where alloy runs. Navigate to `http://localhost:12345` in your browser (or the IP/DNS name of a server where Alloy is running).

 [1]: https://grafana.com/docs/alloy/latest/
 [2]: https://brew.sh
 [3]: /posts/containers/
 [4]: /posts/loki-3-upgrade/
