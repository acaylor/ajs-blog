---
title: Factorio container game server
author: aj
image: /images/factorio_logo.png
draft: true
date: 2022-03-19
categories:
  - Containers
tags:
  - containers
  - docker
  - factorio

---

## Installing factorio on Kubernetes

Originally, this post only had steps to install factorio with docker. If you have a suitable k8s platform, proceed. If you are not familiar with Kubernetes, see [a post on the topic][].

#### Requirements

In order to proceed, you must have a k8s platform, the `kubectl` command line utility, and a persistent storage volume.

### factorio manifests

In order to deploy factorio onto a kubernetes cluster, the deployment needs to be configured in `YAML` format document.

#### factorio-pvc.yaml

This file will request persistent storage for the wiki container(s). This will utilize the `longhorn` storage provider. For more information, see [a previous post][] on the topic.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: factorio-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 5Gi
```

#### factorio-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: factorio
  name: factorio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: factorio
  template:
    metadata:
      labels:
        app: factorio
    spec:
      containers:
        - name: factorio-container
          image: factoriotools/factorio:stable
          env:
            - name: UPDATE_MODS_ON_START
              value: 'true'
          ports:
            - containerPort: 34197
              protocol: UDP
              name: "factorio-port"
          volumeMounts:
            - mountPath: "/factorio"
              name: factorio-storage
      volumes:
        - name: factorio-storage
          persistentVolumeClaim:
            claimName: factorio-pvc
```

#### Create an in cluster service object

Enter the following command with the `kubectl` utility to create a cluster service object that can be used to route traffic to the pods.

```bash
kubectl expose deployment factorio --type=NodePort
```

View the newly created object:

```bash
kubectl describe svc factorio
```

The output should be similar:
```
Name:                     factorio
Namespace:                factorio
Labels:                   app=factorio
Annotations:              <none>
Selector:                 app=factorio
Type:                     NodePort
IP Family Policy:         SingleStack
IP Families:              IPv4
IP:                       10.43.73.110
IPs:                      10.43.73.110
Port:                     <unset>  34197/UDP
TargetPort:               34197/UDP
NodePort:                 <unset>  32069/UDP
Endpoints:                10.42.4.30:34197
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>
```

Take note of the `NodePort` as this will be the entrypoint to connect to the game server.

Any worker node on the cluster will accept traffic to this port and route it to the factorio pod. Do not run multiple replicas of the server because the map storage is similar to a database, multiple processes modifying the map at the same time will cause corruption.

Game server configuration files can be found inside the factorio pod under `/factorio`. If you make changes, you will need to scale the pods to 0 and then scale back up to effectively restart the game server.

### Scaling the server pod

Enter this to get the factorio replicaset:
```bash
kubectl get rs
```
Take the name of the ReplicaSet and apply it to the following command to update the replica count:

```bash
kubectl scale --replicas=0 rs/factorio-abcdef123
```

See original post below for configurations and to expose the game server to the internet, check out [the section below][] regarding port forwarding.


