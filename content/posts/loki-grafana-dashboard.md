---
title: Loki grafana log dashboard
author: aj
date: 2022-07-16
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

Grafana Loki was introduced in a [previous post][1]. If you do not have grafana and loki, check out that post to get started. Today we will set up a grafana dashboard to explore log files that are collected by Loki. As mentioned in the previous post, logs are sent to grafana loki using an agent called promtail. This agent can securely forward logs over HTTPS so all log messages will be encrypted in transit.

Previously we looked at a promtail configuration to collect all log files in the system under the directory `/var/log/`. After sending those logs to loki, we can create a dashboard to explore those logs and search for keywords.

## Configuring promtail agent

Promtail can be easily deployed with a docker container as demonstrated in the [previous post][1] on grafana loki. Since I am using these tools in a homelab, one of the main systems I use is Proxmox which is a debian based linux distribution. Proxmox provides a system for managing virtual machines and supports connecting multiple systems together. If you are not familiar with proxmox, check out a [previous post][2] to get started.

I do not recommend installing the docker software onto Proxmox systems and promtail can run as a single executable file on a linux system. To deploy promtail quickly to multiple linux systems, we can use ansible.

If you are not familiar with ansible, check out a [previous post][3] to get started.

This ansible role will work with debian based systems. The role will create a non-root user to run the promtail process and that user will have permission to audit `.log` files in `/var/log/`. I do not know if this will work on Red Hat linux systems, they likely require SELinux configurations to scrape log files.

### Promtail ansible role

I have created an ansible [role][4] to install and configure promtail agent. This will need to target any systems where you want to collect logs.

To use this role, create a `requirements.yml` file to download the role from [my public github repo][5]:

```yaml
- src: https://github.com/acaylor/promtail_config
```

Create an ansible playbook to execute this role:

```yaml
---
- hosts: all
  vars:
    loki_url: "http://your.loki.url"
  roles:
    - promtail_config
```

You can create an inventory file to target multiple systems. Here is an example in `.ini` file format:

```ini
[proxmox]
pve.example.net
pve2.example.net
pve3.example.net
[pi]
pi.example.net
```

To run the role:

```bash
# Install role from requirements file
ansible-galaxy install -r requirements.yml
# Run the new playbook, use inventory of desired hosts, -K is to ask for become password
ansible-playbook playbook.yml -i proxyhosts.ini -K

```

---

## Create dashboard

To create this dashboard, you need a grafana installation. Check out a [previous post][6] to get started with grafana.

In previous posts, I have imported public grafana dashboards using a simple ID. Let's import a dashboard in JSON format. I have uploaded my loki dashboard configuration to github and when this dashboard is imported, it will ask you to specify a loki datasource in order for the panels to function.

### Download dashboard file

Download the dashboard file from my [github][7]

### Import dashboard

Navigate to grafana select "Dashboards" => "Import" on the navigation menu or head to the url: [http://your.grafana.url/dashboard/import](http://localhost:3000/dashboard/import)

Select "Upload JSON file" and select the file downloaded from my github. Select your loki datasource to proceed.

### Screenshot

Here is how the dashboard should look, if you have multiple servers sending logs, the "instance" drop down will allow you to select which system you are looking at.

![loki_dashboard](/images/loki_dashboard.png)

 [1]: /posts/loki-homelab-logging/
 [2]: /posts/proxmox-installation/
 [3]: /posts/ansible/
 [4]: https://docs.ansible.com/ansible/latest/user_guide/playbooks_reuse_roles.html
 [5]: https://github.com/acaylor/promtail_config
 [6]: /posts/prometheus/
 [7]: https://raw.githubusercontent.com/acaylor/grafana/main/dashboards/loki-dashboard.json
