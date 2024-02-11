---
title: Prometheus run on macOS
author: aj
date: 2024-02-10
categories:
  - Observability
tags:
  - macos
  - prometheus
  - metrics

---

On macOS, you can run a Prometheus server by running the binary that is compatible with Apple silicon. If you are looking for information about what to do with Prometheus, check out [a previous post][1] to get an overview.

## Install

If you are using a Mac, I recommend using [homebrew][2] to install Prometheus along with many other applications.

```shell
brew install prometheus
```

## Configure prometheus

You can configure this Prometheus server by creating/updating the file `/opt/homebrew/etc/prometheus.yml`

## Run prometheus in the background

You can run Prometheus with homebrew services or by running the installed binary.

```shell
/opt/homebrew/opt/prometheus/bin/prometheus_brew_services > ~/.prometheus.log 2>&1 &
```

This command will run prometheus and log the output to the file `.prometheus.log` in your home directory.

When run from `brew services`, `prometheus` is run from
`prometheus_brew_services` and uses the flags in:

```shell
$HOMEBREW_PREFIX/etc/prometheus.args
```

When Prometheus is running, an API is available on your local system `http://localhost:9090`

## Using prometheus

You can use prometheus to collect many different types of metrics. Check out [a previous post][1] about prometheus and how to create graphs based on metrics collected using Grafana.

 [1]: /posts/prometheus/
 [2]: https://brew.sh