---
title: apcupsd Grafana Dashboard
author: aj
date: 2024-11-06

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

 [1]: /posts/apcupsd/
 [2]: https://github.com/acaylor/grafana/blob/main/dashboards/prometheus-ups-metrics.json