---
title: Prometheus remote write
author: aj
date: 2025-04-17

categories:
  - Observability
tags:
  - prometheus
  - metrics

---

Prometheus can be configured to write metrics to a remote prometheus API to achieve replication and/or sharding. If you are looking for information about what to do with Prometheus or what it is, check out [a previous post][1] to get an overview. I am using remote write to have one Prometheus server running in Kubernetes which I have configured to remote write metrics to another Prometheus server on my network that has a larger disk and is outside the k8s cluster.

## Remote write config

As long as remote write is enabled on the prometheus binary, you just need to add this config to Prometheus YAML config:

```yaml
# other config above
remoteWrite:
  - url: https://prometheus.example.com/api/v1/write
```

Replace that `url` with your Prometheus instance. The important thing to note is the endpoint for remote write which will be `/api/v1/write`.

### Remote write tuning

During operation, Prometheus will continuously calculate the optimal number of shards to use based on the incoming sample rate, number of outstanding samples not sent, and time taken to send each sample. Each remote write destination starts a queue which reads from the write-ahead log (WAL), writes the samples into an in memory queue owned by a shard, which then sends a request to the configured endpoint. The flow of data looks like:

```txt
      |-->  queue (shard_1)   --> remote endpoint
WAL --|-->  queue (shard_...) --> remote endpoint
      |-->  queue (shard_n)   --> remote endpoint
```

Notes:

- When one shard backs up and fills its queue, Prometheus will block reading from the WAL into any shards. Failures will be retried without loss of data unless the remote endpoint remains down for more than 2 hours. After 2 hours, the WAL will be compacted and data that has not been sent will be lost.
- Using remote write increases the memory footprint of Prometheus. Most users report ~25% increased memory usage, but that number is dependent on the shape of the data. 
- For each series in the WAL, the remote write code caches a mapping of series ID to label values, causing large amounts of series churn to significantly increase memory usage.
- In addition to the series cache, each shard and its queue increases memory usage. Shard memory is proportional to the `number of shards * (capacity + max_samples_per_send)`. 
- When tuning, consider reducing `max_shards` alongside increases to `capacity` and `max_samples_per_send` to avoid inadvertently running out of memory. The default values for `capacity: 10000` and `max_samples_per_send: 2000` will constrain shard memory usage to less than 2 MB per shard.
- Remote write will also increase CPU and network usage. However, for the same reasons as above, it is difficult to predict by how much. It is generally a good practice to check for CPU and network saturation if your Prometheus server falls behind sending samples via remote write (`prometheus_remote_storage_samples_pending`).

 [1]: /posts/prometheus/