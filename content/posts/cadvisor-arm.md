---
title: cadvisor for arm64
author: aj
date: 2022-05-15
image: /images/cadvisor_logo.png
categories:
  - Homelab
  - Containers
  - Monitoring
tags:
  - containers
  - cadvisor
  - homelab
  - prometheus
  - grafana
  - raspberry pi
  - metrics

---

![cadvisor_logo](/images/cadvisor_logo.png)
[cadvisor exporter][1] is used by Prometheus to monitor container metrics. If you are not familiar with prometheus, check out [a previous post][2]. The cadvisor program will collect metrics and make them available on a http server. Prometheus needs to be configured to collect metrics from the cadvisor exporter and then grafana can be used to visualize those metrics.

## Build docker image

The existing official image for cadvisor does not have a image published for the arm cpu architecture. This is what is found in a Raspberry Pi CPU and in Apple's M series CPUs.

The same source code can be used to bulid a compatible image and run it alongside other containers on an arm system. The following code was found on a [github issue][3] for the cadvisor github repository.

First prepare the container image with a Dockerfile:

```Dockerfile
FROM golang:buster AS builder
ARG VERSION

RUN apt-get update \
 && apt-get install make git bash gcc \
 && mkdir -p $GOPATH/src/github.com/google \
 && git clone https://github.com/google/cadvisor.git $GOPATH/src/github.com/google/cadvisor

WORKDIR $GOPATH/src/github.com/google/cadvisor
RUN git fetch --tags \
 && git checkout $VERSION \
 && go env -w GO111MODULE=auto \
 && make build \
 && cp ./cadvisor /

# ------------------------------------------
# Copied over from deploy/Dockerfile except that the "zfs" dependency has been removed
# a its not available fro Alpine on ARM
FROM alpine:latest
MAINTAINER dengnan@google.com vmarmol@google.com vishnuk@google.com jimmidyson@gmail.com stclair@google.com

RUN sed -i 's,https://dl-cdn.alpinelinux.org,http://dl-4.alpinelinux.org,g' /etc/apk/repositories

RUN apk --no-cache add libc6-compat device-mapper findutils thin-provisioning-tools && \
    echo 'hosts: files mdns4_minimal [NOTFOUND=return] dns mdns4' >> /etc/nsswitch.conf && \
    rm -rf /var/cache/apk/*

# Grab cadvisor from the staging directory.
COPY --from=builder /cadvisor /usr/bin/cadvisor

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/healthz || exit 1

ENTRYPOINT ["/usr/bin/cadvisor", "-logtostderr"]
```

The container can be deployed with `docker-compose`. Some metrics are disabled, notably the memory metrics. Make sure that the `cadvisor` container is on the same docker network as prometheus server.

`docker-compose.yml`

```yaml
version: '3.6'
services:
  cadvisor:
    container_name: cadvisor
    image: 127.0.0.1:5000/cadvisor
    build:
      context: ./cadvisor
      dockerfile: Dockerfile
      args:
        VERSION: "v0.44.0"
      cache_from:
        - golang:buster
        - alpine:latest
    command:
      - '--allow_dynamic_housekeeping=true'
      - '--housekeeping_interval=30s'
      - '--docker_only=true'
      - '--storage_duration=1m0s'
      - '--event_storage_age_limit=default=0'
      - '--event_storage_event_limit=default=0'
      - '--global_housekeeping_interval=30s'
      - '--disable_metrics=accelerator,cpu_topology,disk,memory_numa,tcp,udp,percpu,sched,process,hugetlb,referenced_memory,resctrl,cpuset,advtcp,memory_numa'
      - '--store_container_labels=false'
    restart: unless-stopped
    devices:
      - /dev/kmsg:/dev/kmsg
    expose:
      - 8080
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /etc/machine-id:/etc/machine-id:ro
```

Start the new container after updating `docker-compose.yml`. The tool will detect the new container and bring it up without disrupting other running containers:

```bash
docker-compose up -d
```

## Configure prometheus server

Once cadvisor is running, the prometheus server needs to be configured to monitor the new exporter. When cadvisor and prometheus are on the same container network, you can configure the target for cadvisor with just the name of the container. Update the prometheus server config:

`/etc/prometheus/prometheus.yml`

```yaml
#Other jobs above
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
  ```

Restart the prometheus container to start scraping the new target.

`docker restart prometheus`

## Visualize new metrics with premade grafana dashboard

The [aformentioned post][2] included deploying grafana. Check it out for help getting grafana running. There are free dashboards available online:

https://grafana.com/grafana/dashboards/

There is a dashboard for cadvisor.

At this time it has the ID `11600`.

1. Navigate to the lefthand menu and Select "+" > "Import" > "Import via grafana.com"

2. Enter the ID of the dashboard you would like to import and then select "Load"

3. You should now see a dashboard like below.

![grafana_cadvisor](/images/grafana_cadvisor.png)

 [1]: https://github.com/google/cadvisor
 [2]: /posts/prometheus/
 [3]: https://github.com/google/cadvisor/issues/1236
