---
title: Grafana Alloy migration on k8s
author: aj
date: 2025-05-02

image: /images/loki_logo.png

categories:
  - Homelab
  - Logging
tags:
  - homelab
  - logging
  - grafana alloy

---

In [a previous post][1], I started using Grafana Alloy to collect logs from my systems. You can also use this project in Kubernetes with a Helm chart. If you are not familiar with Kubernetes, check out [a previous post][2] that provides a high level overview.

## Install on Kubernetes

If you are using Kubernetes, the chart can be used to install and configure Grafana Alloy to collect logs from containers.

To deploy Alloy on Kubernetes using Helm, run the following commands in a terminal window:

```bash
helm repo add grafana https://grafana.github.io/helm-charts

helm repo update

helm install --namespace monitoring alloy grafana/alloy
```

That will install using the default values. To override, create a `values.yaml` file or supply values at the helm install invocation.

Example values:

```yaml
alloy:
  configMap:
    content: |-
      // Inline config file for alloy
      logging {
        level = "info"
        format = "logfmt"
      }
      // Write logs to loki
      loki.write "default" {
        endpoint {
          url = "https://loki.example.com/api/v1/push"
        }
      }
      // further config below
```

In my case, I uninstalled the promtail helm chart from my cluster and then installed the alloy chart. The [Official documentation][3] has an example of how to configure log collection in kubernetes and how to relabel metadata that is not collected by default that will become `labels` on the log messages.

### Full values

Here is the full values that I used based on the official documentation.

```yaml
alloy:
  configMap:
    content: |-
      logging {
        level = "info"
        format = "logfmt"
      }
      loki.write "default" {
        endpoint {
          url = "https://loki.example.com/loki/api/v1/push"
        }
      }
      discovery.kubernetes "pod" {
        role = "pod"
      }
      discovery.relabel "pod_logs" {
        targets = discovery.kubernetes.pod.targets
        rule {
          source_labels = ["__meta_kubernetes_namespace"]
          action = "replace"
          target_label = "namespace"
        }
        rule {
          source_labels = ["__meta_kubernetes_pod_name"]
          action = "replace"
          target_label = "pod"
        }
        rule {
          source_labels = ["__meta_kubernetes_pod_container_name"]
          action = "replace"
          target_label = "container_name"
        }
        rule {
          source_labels = ["__meta_kubernetes_pod_label_app_kubernetes_io_name"]
          action = "replace"
          target_label = "app"
        }
        rule {
          source_labels = ["__meta_kubernetes_namespace", "__meta_kubernetes_pod_container_name"]
          action = "replace"
          target_label = "job"
          separator = "/"
          replacement = "$1"
        }
        rule {
          source_labels = ["__meta_kubernetes_pod_uid", "__meta_kubernetes_pod_container_name"]
          action = "replace"
          target_label = "__path__"
          separator = "/"
          replacement = "/var/log/pods/*$1/*.log"
        }
        rule {
          source_labels = ["__meta_kubernetes_pod_container_id"]
          action = "replace"
          target_label = "container_runtime"
          regex = "^(\\S+):\\/\\/.+$"
          replacement = "$1"
        }
      }
      loki.source.kubernetes "pod_logs" {
        targets = discovery.relabel.pod_logs.output
        forward_to = [loki.process.pod_logs.receiver]
      }
      loki.process "pod_logs" {
        stage.static_labels {
          values = {
            cluster = "homelab",
          }
        }
        forward_to = [loki.write.default.receiver]
      }
      loki.source.kubernetes_events "cluster_events" {
        job_name   = "integrations/kubernetes/eventhandler"
        log_format = "logfmt"
        forward_to = [
          loki.process.cluster_events.receiver,
        ]
      }
      loki.process "cluster_events" {
        forward_to = [loki.write.default.receiver]

        stage.static_labels {
          values = {
            cluster = "homelab",
          }
        }

        stage.labels {
          values = {
            kubernetes_cluster_events = "job",
          }
        }
      }
```

To supply a values file, add this to a helm install command: `--values values.yaml`

## Bonus: argoCD install

I use argocd to deploy helm charts. Here is an example argoCD application that applies helm values to configure allow to collect logs from k8s pods and collect k8s events. I have applied the label `cluster=homelab` to my configuration so change that to anything you want to help identify these logs. Ensure to update the `url` for the loki endpoint to your instance.

Here is example `application.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: alloy                                       # Name of ArgoCD application CR
  namespace: argocd                                    # Namespace in which argocd is deployed
spec:
  destination:
    namespace: monitoring                              # Namespace in which alloy is deployed
    server: https://kubernetes.default.svc
  project: default
  source:
    chart: alloy                                   # Using the alloy helm chart from grafana helm registry
    repoURL: https://grafana.github.io/helm-charts
    targetRevision: 1.0.1                           # Promatail chart version
    helm:
      valuesObject:
        alloy:
          configMap:
            content: |-
              logging {
                level = "info"
                format = "logfmt"
              }
              loki.write "default" {
                endpoint {
                  url = "https://loki.example.com/loki/api/v1/push"
                }
              }
              local.file_match "node_logs" {
                path_targets = [{
                  __path__ = "/var/log/syslog",
                  job = "node/syslog",
                  node_name = sys.env("HOSTNAME"),
                  cluster = "homelab",
                }]
              }
              loki.source.file "node_logs" {
                targets = local.file_match.node_logs.targets
                forward_to = [loki.write.default.receiver]
              }
              discovery.kubernetes "pod" {
                role = "pod"
              }
              discovery.relabel "pod_logs" {
                targets = discovery.kubernetes.pod.targets
                rule {
                  source_labels = ["__meta_kubernetes_namespace"]
                  action = "replace"
                  target_label = "namespace"
                }
                rule {
                  source_labels = ["__meta_kubernetes_pod_name"]
                  action = "replace"
                  target_label = "pod"
                }
                rule {
                  source_labels = ["__meta_kubernetes_pod_container_name"]
                  action = "replace"
                  target_label = "container_name"
                }
                rule {
                  source_labels = ["__meta_kubernetes_pod_label_app_kubernetes_io_name"]
                  action = "replace"
                  target_label = "app"
                }
                rule {
                  source_labels = ["__meta_kubernetes_namespace", "__meta_kubernetes_pod_container_name"]
                  action = "replace"
                  target_label = "job"
                  separator = "/"
                  replacement = "$1"
                }
                rule {
                  source_labels = ["__meta_kubernetes_pod_uid", "__meta_kubernetes_pod_container_name"]
                  action = "replace"
                  target_label = "__path__"
                  separator = "/"
                  replacement = "/var/log/pods/*$1/*.log"
                }
                rule {
                  source_labels = ["__meta_kubernetes_pod_container_id"]
                  action = "replace"
                  target_label = "container_runtime"
                  regex = "^(\\S+):\\/\\/.+$"
                  replacement = "$1"
                }
              }
              loki.source.kubernetes "pod_logs" {
                targets = discovery.relabel.pod_logs.output
                forward_to = [loki.process.pod_logs.receiver]
              }
              loki.process "pod_logs" {
                stage.static_labels {
                  values = {
                    cluster = "homelab",
                  }
                }
                forward_to = [loki.write.default.receiver]
              }
              loki.source.kubernetes_events "cluster_events" {
                job_name   = "integrations/kubernetes/eventhandler"
                log_format = "logfmt"
                forward_to = [
                  loki.process.cluster_events.receiver,
                ]
              }
              loki.process "cluster_events" {
                forward_to = [loki.write.default.receiver]

                stage.static_labels {
                  values = {
                    cluster = "homelab",
                  }
                }

                stage.labels {
                  values = {
                    kubernetes_cluster_events = "job",
                  }
                }
              }
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true

```

To have argoCD install this chart and use your values, apply the `application.yaml` to your cluster. Once everything is healthy, the argocd application should return healthy and synced:

```bash
kubectl get application -n argocd
```

Unfortunately this is much more complicated than configuring promtail. There is a benefit though to collect node logs and kubernetes events along with the pod logs.

This configuration allows me to view logs in Grafana. You can query by labels. In this example I apply a label to all of my log messages `cluster=homelab` and that query will return all the logs collected by Alloy. Some other labels that should work for querying include: `pod, app, namespace`.

For more information on how to set up Grafana check out [a previous post][4]. I have been using Grafana for nearly 8 years now.

 [1]: /posts/promtail-to-alloy/
 [2]: /posts/kubernetes/
 [3]: https://grafana.com/docs/alloy/latest/collect/logs-in-kubernetes/
 [4]: /posts/prometheus-homelab/