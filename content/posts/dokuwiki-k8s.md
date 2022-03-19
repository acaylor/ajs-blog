---
title: Dokuwiki k8s
author: aj
date: 2022-03-19
draft: true
categories:
  - Utilities
tags:
  - dokuwiki
  - wiki
  - tools
  - containers
  - kubernetes

---

## Installing Dokuwiki on Kubernetes

Originally, this post only had steps to install Dokuwiki with docker. If you have a suitable k8s platform, proceed. If you are not familiar with Kubernetes, see [a post on the topic][].

### Requirements

In order to proceed, you must have a k8s platform, the `kubectl` command line utility, and a persistent storage volume.

### Dokuwiki manifests

In order to deploy Dokuwiki onto a kubernetes cluster, the deployment needs to be configured in `YAML` format document.

#### dokuwiki-pvc.yaml

This file will request persistent storage for the wiki container(s). This will utilize the `longhorn` storage provider. For more information, see [a previous post][] on the topic.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dokuwiki-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 1Gi
```

#### dokuwiki-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: dokuwiki
  name: dokuwiki
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dokuwiki
  template:
    metadata:
      labels:
        app: dokuwiki
    spec:
      containers:
        - name: dokuwiki-container
          image: lscr.io/linuxserver/dokuwiki
          env:
            - name: PUID
              value: "1000"
            - name: PGID
              value: "1000"
            - name: TZ
              value: "America/New_York"
          ports:
            - containerPort: 80
              name: "http-wiki"
          volumeMounts:
            - mountPath: "/config"
              name: dokuwiki-storage
      volumes:
        - name: dokuwiki-storage
          persistentVolumeClaim:
            claimName: dokuwiki-pvc
```

#### Create an in cluster service object

Enter the following command with the `kubectl` utility to create a cluster service object that can be used to route traffic to the pods.

```bash
kubectl expose deployment dokuwiki --type=ClusterIP --port=80
```

View the newly created object:

```bash
kubectl describe svc dokuwiki
```

The output should be similar:
```
Name:              dokuwiki
Namespace:         dokuwiki
Labels:            app=dokuwiki
Annotations:       <none>
Selector:          app=dokuwiki
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.43.16.162
IPs:               10.43.16.162
Port:              <unset>  80/TCP
TargetPort:        80/TCP
Endpoints:         10.42.4.24:80,10.42.4.25:80
Session Affinity:  None
Events:            <none>
```

Note that these are IP addresses on the kubernetes cluster private network and are not externally accessible without creating a load balancer or similiar resource.

#### Exposing the service object with Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dokuwiki-ingress
spec:
  tls:
  - hosts:
      - wiki.lan.ayjc.net
    secretName: lan-tls
  rules:
  - host: wiki.lan.ayjc.net
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dokuwiki
            port:
              number: 80
```

#### Creating a TLS certificate

I use a wildcard certificate for my local area network. For information on how to configure something similar, check out [a post on the topic][].

Example of tls secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: testsecret-tls
  namespace: default
data:
  tls.crt: base64 encoded cert
  tls.key: base64 encoded key
type: kubernetes.io/tls
```

If using an ingress, create DNS records on your local network to point host (A) records to your kubernetes worker nodes. Incoming traffic to ports 80 and 443 on those nodes will be intercepted by the ingress web server and routed to the appropriate cluster service. This is also often where SSL/TLS will terminate if downstream cluster services are not using TLS.
