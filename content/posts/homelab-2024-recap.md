---
title: Homelab, 2024 recap
author: aj
date: 2025-01-05

categories:
  - Homelab
tags:
  - homelab
---

Over the past year, I have undertaken several projects aimed at enhancing my homelab:

- I transitioned containerized applications to Kubernetes, ensuring scalability, reliability, and easier management of my self-hosted services. Or rather that was my goal. [Here's my previous post][1].

- I set up home assistant and started exporting data from it. This project has allowed me to collect more data about my house and visualize the data with dashboards.

- Additionally, I deployed systems to collect weather data from my house, enabling local monitoring and data analysis.

- I also leveraged prometheus to monitor the power consumption of my computers and network equipment. My goal was to reduce energy costs.

- Finally, more generally, I worked towards decentralizing my self-hosted services, attempting to increase redundancy and resilience while reducing dependence on single points of failure. This is an ongoing effort that will continue into the future. There are still points of failure and the perfect world would allow someone who knows nothing of my setup can power on all the computers and everything will start up and be available.

Here is Grafana dashboard I created for home data:

![grafana_home_2024](/images/grafana_home_2024.png)

 [1]: /posts/homelab-2024-stage-4-k8s/