---
title: Kubernetes persistent storage with openEBS
author: aj
image: /images/k8s_logo.png
date: 2024-07-21

categories:
  - Containers
  - Kubernetes
tags:
  - containers
  - kubernetes
  - openEBS
---

The [openEBS][1] project is simplified, easy to deploy and upgrade, open source, persistent block storage on the Kubernetes platform. If you are not familiar with Kubernetes (k8s), check out [a previous post][2] to get started. If you are using Kubernetes in a homelab which is what I focus on in this blog, you may notice that setting up apps that worked well in Docker are much more challenging in Kubernetes. It is very easy to set up static web apps in Kubernetes as the container image includes all the files you need. However there are a ton of open-source apps out there that obviously need some way to persist data, whether you want a simple to-do list or something complex like an app to access your personal documents, music, pictures, videos, etc.

My main challenge with Kubernetes has been persistent storage. There are a ton of cool open-source projects that folks share and create a Docker image for others to use. I find that a lot of these apps don't give much thought to storage because with Docker the containers can just stick files and databases in the directory `/var/lib/docker/volumes` and you are up and running. A lot of these apps use a simple database, SQLite, to handle persistent storage. This works fine if you have one server that runs the container and handles reading/writing to this simple database. In Kubernetes, you can combine the resources of one or many computers at which point a single SQLite database sitting on one server is not going to work in a cluster of many servers.

Now you may be asking, why would I need something like openEBS? You can leverage [persistent storage within Kubernetes][7] with some built in APIs. You can directly mount a directory or file from the host operating system of a k8s node but then a pod will not be able to reside on any other nodes.

The main benefit of using openEBS is that you get a very easy method to replciate your data across mulitple nodes. If one node fails, you have reasonable confidence that your data volume will be intact on another node. Also you will not be limited to scheduling a pod on the same node where a local volume is mounted. In the background openEBS will attempt to keep volume replicas in sync. 

Alternatively, openEBS can be used to manage a single volume on a specific node which functions very similar to Docker. This directory can then be backed up manually or there are projects out there designed for the task.


## Installing openEBS on Kubernetes

In order to proceed, you must have a k8s platform, the `kubectl` command line utility, and the `helm` command line tool.

Check out [a previous post][2] for help downloading the `kubectl` tool.

### Installing helm

#### Install helm on Linux

Some distributions have package repositories available but you can simply download the appropriate release of `helm` and add it to the executable `$PATH` of a *nix system and get going.

The latest release can be found on [Github][3]

```bash
wget https://get.helm.sh/helm-v3.11.3-linux-amd64.tar.gz

tar -zxvf helm-v3.11.3-linux-amd64.tar.gz
```

##### Add to PATH

In order to execute `helm` commands:

```bash
sudo cp helm /usr/local/bin/helm
sudo chmod 755 /usr/local/bin/helm
```

Now as a non-root user, check the program is working:

```bash
helm version
```

#### Install helm on macOS

If you are on macOS, I recommend using the [Homebrew][4] package manager.

```bash
brew install helm
```

Now as a non-root user, check the program is working:

```bash
helm version
```

#### Install helm on Windows

You can install helm with Chocolatey. Check out [my post on setting up Windows][5] for info on how to get started with Chocolatey.

```powershell
choco install kubernetes-helm
```

```powershell
helm version
```

### Install openEBS helm chart

Once you install the openEBS helm chart, you will be able to leverage openEBS as your Kubernetes `StorageClass` allowing you to mount persistent block storage to a pod. openEBS will create storage volumes on the worker node's filesystem that is managed by openEBS.

#### Add openEBS repo

```bash
helm repo add openebs https://openebs.github.io/openebs
```

Refresh your helm repos:

```bash
helm repo update
```

#### Install

Install the helm chart into the `openEBS-system` namespace. This is the `1.4.1` release. Check the [official site][1] for the latest release.

```bash
helm install openebs openebs/openebs --namespace openebs --create-namespace --version 4.1.0
```

Check if resources are running in the new namespace:

```bash
kubectl get all -n openebs
```

#### Install if using argoCD

If you are using argoCD to manage applications on the cluster, simply create the following manifest and apply it to your cluster. If you are not familiar with argoCD, check out [a previous post][6]

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: openebs
  namespace: argocd
spec:
  destination:
    namespace: openebs
    server: https://kubernetes.default.svc
  project: default
  source:
    chart: openebs
    repoURL: https://openebs.github.io/openebs
    targetRevision: 4.1.0
    helm:
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Apply to your cluster:

```bash
kubectl apply app.yaml
```

## Next steps

Now you can use openEBS to create [Kubernetes objects][7] `PersistentVolume` which are consumed by pods using `PersistentVolumeClaims`.

You can see what storage classes are available:

```bash
kubectl get storageclass
```

 [1]: https://openebs.io
 [2]: /posts/kubernetes/
 [3]: https://github.com/helm/helm/releases
 [4]: https://brew.sh
 [5]: /posts/setting-up-windows/
 [6]: /posts/argocd/
 [7]: https://kubernetes.io/docs/concepts/storage/persistent-volumes/