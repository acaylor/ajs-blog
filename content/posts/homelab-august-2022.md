---
title: State of the homelab, August 2022
author: aj
date: 2022-08-07
categories:
  - Homelab
tags:
  - homelab
---

My homelab has evolved quite a bit over time. After implementing a [wiki][1], I have tracked servers and services deployed there. This blog will serve as a nice location to periodically record the state of the homelab.

The lab all started in 2016. After the first hardware failure (a z270 asus motherboard), the lab shrunk to one raspberry pi.

### 2016

![homelab_2016](/images/homelab_2016.png)

In 2018 I acquired some Dell Poweredge R510 servers. One of the mainboards died when I attempted to change the CPUs. The other Dell ran until late 2021 when it was powered off due to noise and power consumption.

### 2018

![homelab_2018](/images/homelab_2018.png)

## 2022

Now in 2022 there are more nodes with lower power consumption.

### Network diagram

Here is a basic diagram showing the network design of the homelab and cloud services in use:

![homelab_diagram_2022](/images/homelab_diagram_2022.png)

### Infrastructure diagram

The network diagram had a basic layout of how the homelab network is designed. Here is the infrastructure layer:

![homelab_infra_2022](/images/homelab_infra_2022.png)

### Homelab services

Here is a more detailed diagram with all of the services mapped out:

![homelab_2022](/images/homelab_2022.png)

### Homelab grafana dashboard

Here is the grafana dashboard that is on the lab tv 24/7

![grafana_2022](/images/grafana_2022.png)

 [1]: /posts/dokuwiki/
