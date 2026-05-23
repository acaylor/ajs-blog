---
title: Shipping Docker logs to Loki from a Raspberry Pi with Fluent Bit
author: aj
date: 2026-05-23
image: /images/loki_logo.png
description: 'Run Fluent Bit on a 32-bit Raspberry Pi to tail Docker json-file logs without the socket and push them to Grafana Loki.'
categories:
  - Homelab
  - Logging
  - Raspberry Pi
tags:
  - docker
  - fluent bit
  - homelab
  - logging
  - loki
  - raspberry pi
---

I have been moving log collection in my homelab away from Grafana Promtail. Promtail has been deprecated for a while, and in [a previous post][1] I migrated some systems to Grafana Alloy. That has worked well on normal Linux servers and in Kubernetes, but one small host in my homelab needed a different solution: an older Raspberry Pi 3 running 32-bit ARM.

This Pi runs a small Docker Compose stack for services like AdGuard Home, cAdvisor, and a log forwarder. The logging target is still Grafana Loki, but the collector needed to run on `armv7` and I did not want to mount the Docker socket just to collect container logs.

## Why not Alloy here?

Grafana Alloy is the recommended successor for Promtail and it is what I use in other parts of my homelab. The problem is architecture support. The Pi 3 can run a 64-bit OS, but this particular system is still on a 32-bit Raspberry Pi OS install. Grafana Alloy container images support `amd64` and `arm64`, but not `armv7`.

I briefly looked at Vector (a Datadog telemetry collector) because it has an ARMv7 image and a clean Docker logs source. The catch is that the Docker logs source expects access to the Docker socket. That works technically, but it is more access than I want to give a log collector on this host.

The setup I had with Promtail only mounted Docker's JSON log files:

```yaml
volumes:
  - /var/lib/docker/containers:/var/lib/docker/containers:ro
```

I was able to keep this existing configuration and swap in Fluent Bit.

## Fluent Bit

[Fluent Bit][2] is a lightweight log and metrics processor. It has [official container images][3] for `arm32v7`, can [tail files directly][4], can parse Docker JSON logs, and has a built-in [Loki output plugin][5].

That combination makes it a good fit for this Raspberry Pi:

- no Docker socket mount
- official ARMv7 image support
- persistent file offsets
- Docker JSON log parsing
- direct push to Loki over HTTPS

## Docker logging tag

My Docker Compose files already configure the `json-file` logging driver with a custom tag. This gives the collector enough metadata to attach useful Loki labels without talking to the Docker daemon.

```yaml
logging:
  driver: 'json-file'
  options:
    tag: '{{.ImageName}}|{{.Name}}|{{.ImageFullID}}|{{.FullID}}'
```

Docker stores that value in the JSON log record under `attrs.tag`. Fluent Bit can parse the JSON log line, then a tiny Lua filter can split the tag into fields for Loki labels.

## Docker Compose

I replaced my old `promtail/` service directory with `fluent-bit/` so my existing deployment script will pick it up automatically.

`docker-compose.yml`

```yaml
services:
  fluent-bit:
    container_name: fluent-bit
    image: cr.fluentbit.io/fluent/fluent-bit:5.0.5
    restart: unless-stopped
    logging:
      driver: 'json-file'
      options:
        tag: '{{.ImageName}}|{{.Name}}|{{.ImageFullID}}|{{.FullID}}'
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf:ro
      - ./parsers.conf:/fluent-bit/etc/parsers.conf:ro
      - ./docker-labels.lua:/fluent-bit/etc/docker-labels.lua:ro
      - fluent-bit-data:/var/lib/fluent-bit

volumes:
  fluent-bit-data:
```

The `fluent-bit-data` volume stores the tail database so Fluent Bit remembers where it left off after restarts.

## Fluent Bit config

This customizes Fluent Bit to fit our needs. Create these files next to the `docker-compose.yml`.

`fluent-bit.conf`

```ini
[SERVICE]
    Flush             5
    Log_Level         info
    Parsers_File      /fluent-bit/etc/parsers.conf
    storage.path      /var/lib/fluent-bit
    storage.sync      normal
    storage.checksum  off

[INPUT]
    Name              tail
    Tag               docker.*
    Path              /var/lib/docker/containers/*/*-json.log
    Parser            docker
    DB                /var/lib/fluent-bit/docker-containers.db
    Mem_Buf_Limit     10MB
    Skip_Long_Lines   On
    Refresh_Interval  10
    storage.type      filesystem

[FILTER]
    Name              lua
    Match             docker.*
    script            /fluent-bit/etc/docker-labels.lua
    call              docker_labels

[OUTPUT]
    Name              loki
    Match             docker.*
    Host              loki.example.com
    Port              443
    TLS               On
    URI               /loki/api/v1/push
    Labels            job=containerlogspi, stream=$stream, image_name=$image_name, container_name=$container_name, image_id=$image_id, container_id=$container_id
    Line_Format       json
    Remove_Keys       stream,attrs,tag,image_name,container_name,image_id,container_id
    Drop_Single_Key   raw
```

Replace `loki.example.com` with the hostname for your Loki server.

## Parser config

The Docker `json-file` driver writes records like this:

```json
{ "log": "message\n", "stream": "stdout", "time": "2026-05-20T12:00:00.000000000Z" }
```

This parser tells Fluent Bit to parse the log line as JSON and use Docker's `time` field as the event timestamp.

`parsers.conf`

```ini
[PARSER]
    Name        docker
    Format      json
    Time_Key    time
    Time_Format %Y-%m-%dT%H:%M:%S.%L
    Time_Keep   Off
```

## Extract Docker labels

Fluent Bit has record accessors for labels, but I wanted to keep the existing Docker tag format and split it into separate fields. For this step I used the solution suggested by AI coding agent Claude Code. A small Lua script is used to attach metadata to the logs so we can query in Loki based on labels like the container name, image, etc.

`docker-labels.lua`

```lua
function docker_labels(tag, timestamp, record)
    local attrs = record["attrs"]
    if type(attrs) ~= "table" then
        return 1, timestamp, record
    end

    local docker_tag = attrs["tag"]
    if docker_tag == nil then
        return 1, timestamp, record
    end

    local image_name, container_name, image_id, container_id =
        string.match(docker_tag, "^([^|]*)|([^|]*)|([^|]*)|([^|]*)$")

    record["tag"] = docker_tag
    record["image_name"] = image_name or ""
    record["container_name"] = container_name or ""
    record["image_id"] = image_id or ""
    record["container_id"] = container_id or ""

    return 1, timestamp, record
end
```

The Loki output then uses those fields as labels.

## Validate the config

Fluent Bit has a dry run option that validates the configuration without starting the full pipeline:

```bash
docker compose run --rm fluent-bit --dry-run -c /fluent-bit/etc/fluent-bit.conf
```

On my system this reported:

```txt
configuration test is successful
```

I also validated the Compose file:

```bash
docker compose config
```

## Start the collector

Start Fluent Bit with Compose:

```bash
docker compose up -d
```

After a few seconds, logs should be available in Grafana with labels such as:

- `job`
- `stream`
- `image_name`
- `container_name`
- `image_id`
- `container_id`

For example:

```txt
{job="containerlogspi", container_name="adguard-pi"}
```

## Closing thoughts

This is a small change, but it is exactly the kind of boring homelab maintenance that future me appreciates. Promtail was a great tool for a long time, but it is deprecated. Alloy is the path I prefer on systems where it fits. For this older Raspberry Pi 3, Fluent Bit keeps the setup lightweight, supported on ARMv7, and limited to read-only access to Docker's log files. I actually kind of prefer this over the heavy config required for Grafana Alloy.

[1]: /posts/promtail-to-alloy
[2]: https://fluentbit.io/
[3]: https://docs.fluentbit.io/manual/installation/docker
[4]: https://docs.fluentbit.io/manual/pipeline/inputs/tail
[5]: https://docs.fluentbit.io/manual/pipeline/outputs/loki
