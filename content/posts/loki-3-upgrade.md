---
title: Grafana Loki v2 to v3 upgrade
author: aj
date: 2025-02-01

image: /images/loki_logo.png

categories:
  - Homelab
  - Logging
tags:
  - homelab
  - loki
  - logging
  - grafana

---

Just a quick post to upgrade Grafana Loki to v3. If you are not familiar with this project, it is an open-source system for aggregating application, system, and other log files for querying and potentially configuring alert notifications when something goes wrong. Check out a [previous post][] where I set up Loki in my homelab.

## step 1: update to latest minor release of 2.x

First if you are already running a Grafana Loki deployment, upgrade to the latest minor revision of version 2.x.


### update config to stop using boltdb and use tsdb

When I set up my Loki instance the documentation example showed using a subsystem `boltdb` for storing logs on the filesystem. This was deprecated in favor of using tsdb which I believe is a similar backend to Prometheus for metrics.

Update your Loki config file, the location will depend on whether you are running Loki as a container, as a system daemon, or on a platform such as k8s.

Add `storage_config` if it is not already in the Loki config file. Configure where the `tsdb` files will be saved. In my example they will be stored in `/var/lib/loki`:

```yaml
storage_config:
  tsdb_shipper:
    active_index_directory: /var/lib/loki/tsdb-index
    cache_location: /var/lib/loki/tsdb-cache
```

Update the `schema_config` to save logs after the current date (or any date you want):

```yaml
schema_config:
  configs:
    - from: 2025-01-31
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h
```

In my example I am only retaining logs for 24 hours but size this according to how much storage you have. The recommendation for Loki though is to use object based storage such as cloud storage buckets or a project such as openEBS or Minio. For my homelab, storing it on a mounted partition is sufficient for query performance.

Restart the loki service and ensure the config was accepted. Restarting will depend on how you run Grafana Loki.

 I see a log message that the tsdb was initialized:

```log
Jan 30 22:44:40 loki loki[796]: level=info ts=2025-01-30T22:44:40.346810271Z caller=table_manager.go:136 index-store=tsdb-2025-01-31 msg="uploading tables"
```

## Upgrade to v3

Here is the shortlist of things from the [official docs][2]. Check that site for more up to date information.

- Structured metadata is enabled by default and requires `tsdb` and v13 schema or Loki won’t start. Refer to Structured Metadata, Open Telemetry, Schemas and Indexes.
- The shared_store config is removed. Refer to Removed shared_store and shared_store_key_prefix from shipper configuration.
- Loki now enforces a max line size of `256KB` by default (you can disable this or increase this but this is how Grafana Labs runs Loki). Refer to Changes to default configure values.
- Loki now enforces a max label limit of 15 labels per series, down from 30. Extra labels inflate the size of the index and reduce performance, you should almost never need more than 15 labels. Refer to Changes to default configure values.
- Loki will automatically attempt to populate a `service_name` label on ingestion. Refer to `service_name` label.
- There are many metric name changes. Refer to Distributor metric changes, Embedded cache metric changes, and Metrics namespace.

Here is a neat trick to use with docker from their documentation. This will check your current loki config file against a container running v3.

```bash
docker run --rm -t -v \
  "${PWD}":/config grafana/loki:3.0.0 \
  -config.file=/config/loki-config.yaml \
  -verify-config=true
```

### If running locally

If managing Loki on a Linux system with systemd, All I did to upgrade was install the new package, shut down the service and reload it with the same config file.

```bash
# Download a .deb for a debian based distro
wget https://github.com/grafana/loki/releases/download/v3.3.2/loki_3.3.2_amd64.deb
# Install the package
sudo dpkg -i loki_3.3.2_amd64.deb
# Reload systemd
sudo systemctl daemon-reload
# Stop Loki
sudo systemctl stop loki
# Start loki with the new version
sudo systemctl start loki
```

Verify the service is running and you can check the health of Loki by making a request to this endpoint:

```bash
curl loki.example.com/ready
```

Once I checked Grafana, Logs were still available from before the upgrade. Check your storage config most likely if you have issues upgrading.

 [1]: /posts/loki-homelab-logging/
 [2]: https://grafana.com/docs/loki/latest/setup/upgrade/