---
title: Manage Helm apps with ArgoCD app-of-apps
author: aj
date: 2026-03-15
description: >
  How to manage Helm applications using the ArgoCD app-of-apps pattern, including structuring Git repositories for GitOps, automating app enrollment, and best practices for maintaining Kubernetes app deployments.
categories:
  - Containers
  - Kubernetes
tags:
  - containers
  - kubernetes
  - argoCD
  - helm
  - gitops
---

I recently started cleaning up how I manage applications in [Kubernetes][1] with [ArgoCD][2] (Check out those links for an intro k8s and ArgoCD). For a while I was applying individual `Application` manifests with `kubectl` manually, which works fine when there are only a few apps. Over time that started to feel messy because there are so many apps.

I wanted something more predictable. The pattern I landed on is a root ArgoCD application that discovers child applications from Git. Each app gets its own directory with an `app.yaml`, a `values.yaml`, and optionally a `templates/` directory for extra manifests. Once that structure is in place, managing Helm charts becomes much more repeatable whether the chart comes from a public repository or from one of my own apps.

## Why move to app-of-apps

The main issue with manually applying `app.yaml` files is not that it is difficult. The problem is that it creates a gap between what is in Git and what is actually enrolled in ArgoCD.

That usually shows up in a few ways:

- New applications have to be applied manually.
- Git can contain manifests that look managed but are not active in the cluster yet.
- There is no single place that answers the question, "what apps belong in this cluster?"
- Moving an app into GitOps still depends on a manual step.

The app-of-apps pattern fixes that by making one root app responsible for discovering the child apps that belong to the cluster.

GitOps is a methodology that uses a Git repository as the single source of truth for declaring and managing the desired state of your applications and infrastructure. By storing Kubernetes manifests and application definitions in version-controlled repositories, you can ensure that what's deployed in your cluster matches the code. ArgoCD leverages this approach by continuously monitoring the Git repo and reconciling the cluster to match it, enabling automated, auditable, and recoverable application management workflows.

## Root application

The root `Application` points at a directory in Git and only includes manifests that match the child app layout:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: homelab-root
  namespace: argocd
spec:
  destination:
    namespace: argocd
    server: https://kubernetes.default.svc
  project: default
  source:
    path: argo-apps
    repoURL: https://git.example.com/aj/manifests.git
    targetRevision: main
    directory:
      recurse: true
      include: '{apps/*/app.yaml}'
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - ApplyOutOfSyncOnly=true
```

The key part is the `include` rule:

```yaml
include: '{apps/*/app.yaml}'
```

That lets me migrate applications gradually. Older manifests can stay elsewhere in the repository without being picked up accidentally. Only directories that follow the new structure will be deployed and kept in sync.

## App catalog layout

Each application gets its own directory:

```text
argo-apps/apps/<app>/
  app.yaml
  values.yaml
  templates/
```

I like this layout because each file has a clear job:

- `app.yaml` defines the ArgoCD `Application`.
- `values.yaml` stores Helm values.
- `templates/` contains Kubernetes manifests the chart does not provide.

That separation makes the repo easier to maintain. ArgoCD wiring, Helm values, and local manifests live together without being mixed into one giant file.

## Multi-source application pattern

The child applications use ArgoCD multi-source support. This is the part that makes the layout flexible:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: example-app
  namespace: argocd
spec:
  destination:
    namespace: example-app
    server: https://kubernetes.default.svc
  project: default
  sources:
    - chart: example-chart
      repoURL: https://example.invalid/charts
      targetRevision: 1.2.3
      helm:
        releaseName: example-app
        valueFiles:
          - $values/argo-apps/apps/example-app/values.yaml
    - repoURL: https://git.example.com/aj/manifests.git
      targetRevision: main
      ref: values
    - repoURL: https://git.example.com/aj/manifests.git
      targetRevision: main
      path: argo-apps/apps/example-app/templates
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

This does three different jobs:

1. Pull the Helm chart from a Helm repository or OCI-backed chart source.
2. Pull the `values.yaml` file from Git using a source with `ref: values`.
3. Pull extra manifests from the local `templates/` directory.

That split is what makes the pattern useful. The chart can stay upstream, while the values and cluster-specific resources stay in Git beside the app definition.

If you are building out a starter template for new apps, the layout can look like this:

```text
argo-apps/apps/_template/
├── app.yaml.example
├── README.md
├── templates
│   ├── namespace.yaml.example
│   └── servicemonitor.yaml.example
└── values.yaml.example
```

In practice, the most useful part of that template is that it shows the full multi-source pattern in one place. That gives you a copy-paste starting point for new apps instead of rebuilding the same ArgoCD wiring every time.

Here is an example `app.yaml.example`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: example-app
  namespace: argocd
spec:
  destination:
    namespace: example-app
    server: https://kubernetes.default.svc
  project: default
  sources:
    - chart: example-chart
      repoURL: https://example.invalid/charts
      targetRevision: 1.2.3
      helm:
        releaseName: example-app
        valueFiles:
          - $values/argo-apps/apps/example-app/values.yaml
    - repoURL: https://git.example.com/aj/manifests.git
      targetRevision: main
      ref: values
    - repoURL: https://git.example.com/aj/manifests.git
      targetRevision: main
      path: argo-apps/apps/example-app/templates
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

The matching `values.yaml.example` can stay very small. It only needs to show where chart-specific configuration belongs:

```yaml
fullnameOverride: example-app

serviceMonitor:
  enabled: false

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    memory: 256Mi
```

Then if the chart does not include a `ServiceMonitor`, or if you want to manage it separately, the local templates directory can include something like this:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: example-app
  namespace: example-app
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: example-app
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

That is the pattern I like most. The chart stays upstream, the values stay in Git, and the supporting resources stay next to the application they belong to.

## Why this works well for Helm charts

In practice, many Helm deployments need more than the chart alone. A chart might install the main application, but you may still need local resources such as:

- A `ServiceMonitor`
- A PVC
- An ingress resource
- A namespace manifest
- A policy or secret reference that only exists in your environment

Trying to force all of that into Helm values usually makes the configuration harder to read. Spreading those resources across unrelated directories is not much better. Keeping them next to the app makes the application directory the full deployment unit.

## Third-party charts and your own charts

This pattern works the same way whether the chart is public or private.

For a third-party chart, the main source usually includes:

- `chart`
- `repoURL`
- `targetRevision`

If you publish your own charts to a Helm repository or OCI registry, the same pattern applies. If the chart itself lives in Git instead of a chart repository, the chart source will look a little different, but the overall structure still holds up well.

The important idea is not where the chart comes from. The useful part is that ArgoCD owns the application definition, Git owns the values and supporting manifests, and each app directory becomes the single place to review what gets deployed.

## Adding a new application

My workflow for a new app now looks like this:

1. Create `argo-apps/apps/<app>/`.
2. Copy the files from `argo-apps/apps/_template/`.
3. Update `app.yaml` with the chart name, repo URL, version, namespace, and release name.
4. Put chart configuration into `values.yaml`.
5. Add extra manifests to `templates/` only if they are needed.
6. Validate the chart and templates locally.
7. Commit to `main` and let the root app discover the new child application.

That is a lot cleaner than manually applying a new ArgoCD application and then trying to remember whether it is fully managed in Git.

## Validation before enrollment

One thing I like about this setup is that it naturally supports validating one app at a time before it becomes part of the catalog.

Render the chart locally:

```bash
helm template <release> <repo>/<chart> \
  --version <ver> \
  --namespace <ns> \
  --values argo-apps/apps/<app>/values.yaml
```

Validate any extra manifests:

```bash
kubectl apply --dry-run=client -f argo-apps/apps/<app>/templates/
```

This makes it easier to catch mistakes before the root app deploys the new child app.

## Final thoughts

The best part of this pattern is that it stays boring. This is the first big change I am making to how I use ArgoCD in nearly 4 years. The root app only discovers `apps/*/app.yaml`. Each child app follows the same layout. Helm values live in Git, and extra manifests live beside the application that needs them.

If you are currently applying ArgoCD applications manually, moving to app-of-apps is a straightforward upgrade. You do not need to redesign the whole cluster. You just need a root app, a consistent app catalog, and a template for new applications. From there, managing Helm applications becomes much more predictable.

---

_New disclaimer: I used an LLM to help create this post. Opinions expressed are likely from me and not the LLM._

[1]: /posts/kubernetes
[2]: /posts/argocd
