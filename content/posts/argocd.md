---
title: Deploy software on Kubernetes with argoCD
author: aj
image: /images/argo_logo.png
date: 2022-09-25

categories:
  - Containers
  - Kubernetes
tags:
  - containers
  - kubernetes
  - argoCD
---

Once you have a kubernetes environment running, a tool like [argoCD][1] can help you manage applications that you want to deploy on kubernetes. ArgoCD expects a pattern of using [git][2] repositories as the source of truth for defining the state of your applications. You can communicate with the kubernetes API by submiting requests in [YAML][3] or [JSON][4] format. I am going to be focusing on managing applications with [helm][5] charts.

ArgoCD automates the deployment of applications in kubernetes. Application deployments can track updates to git branches, tags, or pinned to a specific version of manifests at a specific commit.

ArgoCD installs to a kubernetes cluster and continuously monitors running applications and compares with the state of the configured git repositories.

## Try argoCD

You can try argoCD in any kubernetes environment including dev environments such as minikube. If you are not familiar with kubernetes, check out [a previous post][6] about getting started with kubernetes.

### Quick install

To install argo, create the specified namespace and apply the latest version of the argoCD deployment manifest.

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

## Production install

Outside of a dev environment, you want to manage the state of argoCD application in a declarative manner similar to how argoCD is managing the state of your applications.

ArgoCD will be installed using a `helm` chart.

You will need access to your own kubernetes cluster and the helm CLI installed on your machine.

### Installing helm

Helm is available on package manager for several operating systems. For the latest release, you can also download pre-compiled binaries on the GitHub release page:

https://github.com/helm/helm/releases

#### Install on macOS

You can install helm using `brew` on macOS:

```sh
brew install helm
```

#### Install on windows

You can install helm on windows using the Chocolatey package manager. If you are not familiar with Chocolatey, check out [a previous post][7]

```powershell
choco install kubernetes-helm
```

#### Install on fedora linux

On Fedora, you can install from the fedora repositories using the `dnf` package manager:

```bash
sudo dnf install helm
```


### Install argoCD helm chart

Once you have the `helm` binary installed, add the argoCD helm repository and install the argoCD chart:

```sh
helm repo add argo https://argoproj.github.io/argo-helm
```

Then:

```sh
helm install my-release argo/argo-cd
```

You can customize the deployment with a `values.yaml` file. For example to deploy in a HA configuration:

```values.yaml
redis-ha:
  enabled: true

controller:
  replicas: 1

server:
  autoscaling:
    enabled: true
    minReplicas: 2

repoServer:
  autoscaling:
    enabled: true
    minReplicas: 2

applicationSet:
  replicas: 2
```

To install with the values file:

```sh
helm install my-release -f values.yaml argo/argo-cd
```

## Deploying a helm application with argocd

Here is an example of how to manage an application deployed using a helm chart with argoCD. You can store this in a git repository and apply it to a cluster with argoCD installed.


```argo-example-helm.yaml
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: longhorn
  namespace: argocd
spec:
  destination:
    namespace: longhorn-system 
    server: https://kubernetes.default.svc
  project: default
  source:
    chart: longhorn 
    repoURL: https://charts.longhorn.io
    targetRevision: 1.3.1
    helm:
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

This manifest uses the api added by argoCD to deploy a argo Application object in the `argocd` namespace. The example above will install an application that will provision Persistent Volume objects using partitions on the kubernetes worker nodes.

Deploy the application to your cluster using `kubectl` if you do not have this tool, check out [a previous post][6] to find out where to get it.

```sh
kubectl apply -f argo-example-helm.yaml
```

You can see resources deployed in your cluster:

```sh
kubectl get all -n argocd
```

See argo applications by searching for the custom resource:

```sh
kubectl get applications -n argocd
```

Once argoCD has completed deploying an application the previous command should show the name of the application along with the sync and health status:

```
NAME         SYNC STATUS   HEALTH STATUS
longhorn     Synced        Healthy
```

## Next steps

After you have deployed argoCD, you can access argo using the CLI or the web UI.

There is an intial admin token created to interact with argoCD:

```sh
kubectl get secrets -n argocd
```

You are looking for `argocd-initial-admin-secret`.

This token can be used with the built-in `admin` user to access the UI or CLI.

### Argo UI

You can access the UI by port forwarding the connecting with `kubectl`

```sh
kubectl get services -n argocd
```

You are looking for the service `argocd-server`.

```sh
kubectl port-forward service/argocd-server -n argocd 4443:443
```

That will make the argoCD UI available on your `localhost` port `4443`.

In a future post I will be using the argoCD CLI to manage a custom application with a git repository and the `kustomize` utility.

## Clean up

You can remove argoCD from your kubernetes cluster by removing the `argoCD` namespace.

```sh
kubectl delete namespace argocd
```

 [1]: https://argo-cd.readthedocs.io/en/stable/
 [2]: https://en.wikipedia.org/wiki/Git
 [3]: https://en.wikipedia.org/wiki/YAML
 [4]: https://en.wikipedia.org/wiki/JSON
 [5]: https://helm.sh/
 [6]: /posts/kubernetes/
 [7]: /posts/setting-up-windows/
