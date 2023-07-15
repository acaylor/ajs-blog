---
title: Dokuwiki k8s
author: aj
date: 2023-07-15
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

Previously, I had [a post][1] here with steps to install Dokuwiki with Docker. If you have a suitable Kubernetes platform, proceed. If you are not familiar with Kubernetes, see [a post on the topic][2].

### Requirements

In order to proceed, you must have a k8s platform, the `kubectl` command line utility, and a persistent storage volume.

I recommend creating a Kubernetes namespace for the wiki resources:

```bash
kubectl create namespace wiki
```

### Dokuwiki manifests

In order to deploy Dokuwiki onto a Kubernetes cluster, the deployment needs to be configured in `YAML` format document. This defines all of the resources that will be created in the Kubernetes cluster in order to run your application. In this case for Dokuwiki, we need to create a container that runs the Dokuwiki server, a storage volume to store the files that are created for each wiki page, a service exposes the network port used for the Dokuwiki server, and an ingress which is used to route network traffic from outside the cluster to the Dokuwiki service and container.

#### dokuwiki-pvc.yaml

This file will request persistent storage for the wiki container(s). This will utilize the `longhorn` storage provider. For more information, see [a previous post][3] on the topic.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dokuwiki-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 500Mi
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
  replicas: 1
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
              value: "1001"
            - name: PGID
              value: "1001"
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

#### Apply these manifests

Use these files to deploy a `PersistentVolumeClaim` and the `Deployment` to your cluster:

```bash
kubectl apply -f dokuwiki-pvc.yaml -f dokuwiki-deployment.yaml -n wiki
```

The `-n wiki` is to deploy the resources in the namespace created earlier.

Verify the objects are ready:

```bash
kubectl get deploy -n wiki
```

```bash
kubectl get pvc -n wiki
```

#### Create an in cluster service object

Once the deployment is ready (which means the PVC was bound also), a `Service` object is needed to route traffic to the Dokuwiki container.

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

Note that these are IP addresses on the Kubernetes cluster private network and are not externally accessible without creating a load balancer or similiar resource.

#### Exposing the service object with Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dokuwiki-ingress
spec:
  tls:
  - hosts:
      - wiki.example.net
    secretName: lan-tls
  rules:
  - host: wiki.example.net
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

I use a wildcard certificate for my local area network. For information on how to obtain something similar, check out [a post on the topic][4].

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

If using an ingress, create DNS records on your local network to point host (A) records to your Kubernetes worker nodes. Incoming traffic to ports 80 and 443 on those nodes will be intercepted by the ingress web server and routed to the appropriate cluster service. This is also often where SSL/TLS will terminate if downstream cluster services are not using TLS.

## Setting up Wiki

Once the container is running, navigate to the URL in your browser that matches a DNS record for the ingress:

```
http://wiki.example.net/install.php
```

![dokuwiki_install](/images/dokuwiki_install.png)

### Once you have completed setup

#### First, restart the container

Get the name of the pod generated by the Deployment file:

```bash
kubectl get pods -n wiki
```

#### Next, log in as an superuser and configure nice URLs

1. login as the superuser created in setup and 
2. set "Use nice URLs" in the `admin/Configuration` Settings panel to `.htaccess` 
3. Check the box: Use slash as namespace separator in URLs to enable nice URLs. 

![wiki_config](/images/wiki_config.png)

By default, DokuWiki does no URL rewriting, resulting in URLs like this:

`http://wiki.example.net/doku.php?id=page`

These URLs are considered ugly and are not indexed well by some search engines. 

For more details on configurations possible, check out the [Dokuwiki wiki][5].



 [1]: /posts/dokuwiki/
 [2]: /posts/kubernetes/
 [3]: /posts/longhorn/
 [4]: /posts/homelab-wildcard-cert/
 [5]: https://www.dokuwiki.org/dokuwiki/