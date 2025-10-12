---
title: apcupsd Grafana Dashboard
author: aj
date: 2024-11-06
updated: 2025-10-12
categories:
  - Homelab
tags:
  - apcupsd
  - grafana
  - prometheus

---

Now that I have started to collect metrics for my APC UPS systems, I built a Grafana dashboard similar to the dashboard I used for Network UPS Tools. Check out [a previous post][1] where I got these metrics set up and into Prometheus.

![ups_dashboard](/images/ups_dashboard.png)

This dashboard is based on a public Grafana dashboard for the NUT exporter that I used previously. Fortunately most metrics from Network UPS Tools are also available here in the apcupsd exporter.

I made some additions at the bottom to estimate total power usage for all UPS systems as well as the estimated power usage of each UPS.

This dashboard along with others I maintain are available on [GitHub][2].

_Link updated: 2025-10-12_

 [1]: /posts/apcupsd/
 [2]: https://raw.githubusercontent.com/acaylor/grafana/refs/heads/main/grafana/provisioning/dashboards/prometheus-ups-metrics.json