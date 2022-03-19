---
title: Rancher Desktop Kubernetes
author: aj
image: /images/rancher-desktop-logo.png
date: 2022-02-18
draft: true
categories:
  - Containers
  - Kubernetes
tags:
  - containers
  - rancher
  - kubernetes

---

![rancher_desktop](/images/rancher-desktop-logo.png)

Rancher Desktop is an [open-source project][1] to bring Kubernetes and container management to your workstation.

For more information about installing Rancher Desktop or containers, check out [a previous post][2].

If you are not familiar with Kubernetes, check out [a previous post][3] about getting started.

Installation is trivial on most platforms, I will briefly touch on installation on Linux as I happen to be using openSUSE at the time of this post.

## RPM package installation

⚠️ Note: Red Hat based distributions such as Fedora package QEMU, which is needed here, differently than other distributions. If using a Red Hat distro, use the AppImage download instead.

On openSUSE:

```bash
sudo zypper addrepo https://download.opensuse.org/repositories/isv:/Rancher:/stable/rpm/isv:Rancher:stable.repo
sudo zypper install rancher-desktop
```

### RPM uninstall

```bash
sudo zypper remove --clean-deps rancher-desktop
sudo zypper removerepo isv_Rancher_stable
```

## AppImage install

To use the AppImage, ensure the file is executable and then execute it.

```bash
wget https://download.opensuse.org/repositories/isv:/Rancher:/stable/AppImage/rancher-desktop-latest-x86_64.AppImage
chmod +x rancher-desktop-latest-x86_64.AppImage
./rancher-desktop-latest-x86_64.AppImage
```

## Kubernetes

Once Rancher Desktop is installed and running, verify that the kubernetes cluster was created:

```bash
kubectl get nodes
```

You should see a single node which is the vm that was created on your local machine:

```
NAME                   STATUS   ROLES                  AGE   VERSION
lima-rancher-desktop   Ready    control-plane,master   10h   v1.21.9+k3s1
```

### Deploying a simple application

Deploy a web application and view it on your browser:

```bash
kubectl create deployment hello-world --image=rancher/hello-world
```

Verify the container was deployed:

```bash
$ kubectl get po
NAME                           READY   STATUS    RESTARTS   AGE
hello-world-57d7479b49-whcsh   1/1     Running   0          34s
```

You should see Status: "Running". The container was deployed but is only accessible on the kubernetes cluster network. To make the application available outside the cluster, a Service API object must be created and associated with the deployment.

```bash
$ kubectl expose deployment hello-world --type=ClusterIP --port=80
service/hello-world exposed
```

View the new service:

```bash
$ kubectl get svc
NAME          TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
kubernetes    ClusterIP   10.43.0.1       <none>        443/TCP   10h
hello-world   ClusterIP   10.43.115.117   <none>        80/TCP    5s
```

Now we can view the service by using the kube-proxy to proxy the service to a port on the local computer:

```bash
kubectl port-forward svc/hello-world 8080:80
```

This will proxy traffic to the container on port `8080` of the local computer where rancher desktop is installed.

Navigate to http://localhost:8080 in your browser to view the hello-world application.


Rancher desktop can easily be used to run containers/k8s on your machine for development and testing.

### Application settings

The Rancher desktop application allows you to manage container images, adjust the version of kubernetes used, reset the kubernetes cluster completely, as well as manage the supporting utilities such as `kubectl`, `nerdctl`, and `helm`.

The desktop application will also prompt and guide the process of updating to the latest version.

 [1]: https://rancherdesktop.io/
 [2]: /posts/rancher-desktop/
 [3]: /posts/kubernetes/