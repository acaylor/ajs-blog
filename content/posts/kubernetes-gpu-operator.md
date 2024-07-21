---
title: Kubernetes nvidia gpu 
author: aj
image: /images/k8s_logo.png
date: 2024-07-21

categories:
  - Containers
  - Kubernetes
tags:
  - containers
  - kubernetes
  - nvidia

---

A GPU can be used to run applications that leverage machine learning models as well as the name suggests, graphics applications. In the homelab I will use a GPU to run AI models, transcode media files, and any other application that can leverage GPU hardware acceleration.

Using a GPU in a Kubernetes cluster involves setting up the cluster to recognize and allocate GPU resources to pods that require them.


## Prerequisites

First of all, you need a Kubernetes cluster and a computer with a Nvidia GPU that is also joined to the Kubernetes cluster. If you are not familiar with Kubernetes, check out a [previous post][1].

### Install nvidia drivers

Install drivers based on your distribution's third-party repos or by downloading binaries from Nvidia.

Verify the drivers are working:

```bash
nvidia-smi
```

Alternatively, you can install drivers via the operator Helm chart later.

### Install nvidia-container-toolkit

[The NVIDIA Container Toolkit][2] allows users to build and run GPU accelerated containers. The toolkit includes a container runtime library and utilities to automatically configure containers to leverage NVIDIA GPUs.

Here is a example to install the toolkit on a Debian based system.

First you install the apt repo and then you can use `apt-get` commands to install the toolkit.

```bash
#!/usr/bin/env bash

curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
  && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update

sudo apt-get install nvidia-container-toolkit
```

## Install nvidia gpu operator on k8s cluster

This operator will scan nodes in the cluster for Nvidia GPUs and apply labels to nodes to allow pods to know where to schedule to use a GPU device.

### Prereqs

- `helm` & `kubectl` CLI utilities

First create a namespace for the operator and allow privileged pods:

```bash
kubectl create ns gpu-operator

kubectl label --overwrite ns gpu-operator pod-security.kubernetes.io/enforce=privileged
```

This operator can be installed via helm chart and will identify available GPUs and add labels that can be used for scheduling in k8s.

Add the helm repo:

```bash
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia

helm repo update
```

Install the helm chart with a few value overrides:

```bash
helm install --wait --generate-name \
    -n gpu-operator --create-namespace \
    nvidia/gpu-operator \
    --set driver.enabled=false \
    --set psp.enabled=true
```

If you want the helm chart to install the nvidia drivers, omit the option `driver.enabled=false`.

Once the install completes you should see output:

```txt
NAME: gpu-operator-1720620673
LAST DEPLOYED: Wed Jul 10 08:11:19 2024
NAMESPACE: gpu-operator
STATUS: deployed
REVISION: 1
TEST SUITE: None
```

## Deploy a sample application to test the operator

You can create a pod that requests using a GPU to confirm that the operator installed all of the proper labels onto the cluster.

Create a file `pod.yaml`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cuda-vectoradd
spec:
  restartPolicy: OnFailure
  containers:
  - name: cuda-vectoradd
    image: "nvcr.io/nvidia/k8s/cuda-sample:vectoradd-cuda11.7.1-ubuntu20.04"
    resources:
      limits:
        nvidia.com/gpu: 1

```

To create this pod:

```bash
kubectl apply -f pod.yaml
```

To see if the pod worked, check the logs:

```bash
kubectl get pods
```

Once you see the name of the pod:

```bash
kubectl logs pod/$pod_name_here
```

The logs should indicate success.

## Next steps

If the validation was a success, now other pods can be scheduled and use a GPU.

 [1]: /posts/kubernetes/
 [2]: https://github.com/NVIDIA/nvidia-container-toolkit