---
title: Grafana k8s monitoring chart
author: aj
date: 2025-04-19
draft: true
image: /images/grafana_logo.png

categories:
  - Homelab
  - Logging
  - Observability
tags:
  - homelab
  - logging
  - grafana alloy
  - prometheus
  - metrics
---

The maintainers of Grafana have released a helm chart that leverages the Alloy project to collect logs and metrics from Kubernetes and easily send those to a remote backend such as Prometheus or Grafana Loki.

Helm values to enable collection of metrics and logs from Kubernetes pods and events and nodes.

```yaml
cluster: # Cluster configuration, including the cluster name
  name: homelab
destinations: # List of destinations where telemetry data will be sent
  # - name: hostedMetrics
  #   type: prometheus
  #   url: https://prometheus.example.com/api/prom/push
  #   auth:
  #     type: basic
  #     username: "my-username"
  #     password: "my-password"
  - name: localPrometheus
    type: prometheus
    url: https://prometheus.example.com/api/v1/write
  - name: hostedLogs
    type: loki
    url: https://loki.example/loki/api/v1/push
# Features to enable, which determines what data to collect
clusterMetrics:
  enabled: true
clusterEvents:
  enabled: true
podLogs:
  enabled: true
nodeLogs: # Gathering logs from journald requires a volume mount to the Node's /var/log/journal directory.
  enabled: true
# Telemetry collector definitions
alloy-metrics:
  enabled: true
alloy-logs:
  enabled: true
alloy-singleton:
  enabled: true
```

Ensure the URL for your prometheus, Loki, or other backend is correct.

The kubernetes mixin dashboards can work with some modifications. Found on GitHub Issue. https://github.com/grafana/k8s-monitoring-helm/issues/1073

https://github.com/kubernetes-monitoring/kubernetes-mixin provides a set of Grafana dashboards and Prometheus alerts for Kubernetes.

Install jsonnet and jsonnet-bundler.

```bash
# On MacOS using brew
brew install jsonnet jsonnet-bundler
```

Install the dashboard with jb to the current directory

```bash
# This will produce a jsonnetfile.json file in the current working directory
jb init

# This will install the kubernetes-mixin to the ./vendor directory
jb install https://github.com/kubernetes-monitoring/kubernetes-mixin

# make sure to add the vendor directory to your .gitignore file
```

Add a mixin libsonnet file that imports the mixin dashboards.

```json
local kubernetes = import "kubernetes-mixin/mixin.libsonnet";

kubernetes {
  _config+:: {
    cadvisorSelector: 'job="integrations/kubernetes/cadvisor"',
    kubeletSelector: 'job="integrations/kubernetes/kubelet"',
    kubeStateMetricsSelector: 'job="integrations/kubernetes/kube-state-metrics"',
    nodeExporterSelector: 'job="integrations/node_exporter"',
    kubeSchedulerSelector: 'job="kube-scheduler"',
    kubeControllerManagerSelector: 'job="kube-controller-manager"',
    kubeApiserverSelector: 'job="integrations/kubernetes/kube-apiserver"',
    kubeProxySelector: 'job="integrations/kubernetes/kube-proxy"',
    podLabel: 'pod',
    hostNetworkInterfaceSelector: 'device!~"veth.+"',
    hostMountpointSelector: 'mountpoint="/"',
    windowsExporterSelector: 'job="integrations/windows_exporter"',
    containerfsSelector: 'container!=""',

    grafanaK8s+:: {
      dashboardNamePrefix: '',
      dashboardTags: ['kubernetes', 'infrastructure'],
    },
  },
}
```

Generate the dashboards.

```bash
mkdir -p files/dashboards

jsonnet -J vendor -m files/dashboards -e '(import "mixin.libsonnet").grafanaDashboards'
```

[]: https://github.com/grafana/k8s-monitoring-helm/tree/main/charts/k8s-monitoring
