---
title: Dokuwiki homelab wiki
author: aj
date: 2021-12-04
categories:
  - Utilities
tags:
  - dokuwiki
  - wiki
  - tools
  - containers
  - docker

---

[Dokuwiki][1] is an open-source [wiki][2] software that isn't too fancy, perfect for documenting a personal homelab. This software does not require a database and is easy to host and backup running as a container.

*Update 02-00-22*

## Installing Dokuwiki on Kubernetes

Originally, this post only had steps to install Dokuwiki with docker. If you have a suitable k8s platform, proceed. If you are not familiar with Kubernetes, see [a post on the topic][].

#### Requirements

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

---

*Original post only included below:*

---
## Installing and configuring Dokuwiki with Docker

In order to run the Dokuwiki server, I will be using a docker container inside of a virtual machine. In order to keep this post concise, please check out [my previous post][3] on docker if you are not familiar with the technology. I also have [a post][4] on setting up virtual machines and [yet another post][5] onsetting up a dedicated system to run virtual machines with proxmox.

#### Requirements

In order to proceed, you must have a suitable Linux System with docker and docker-compose installed. See above for posts that will help you meet these requirements.

The container image that will be used here is created by the [LinuxServer.io][6] team who keep up with regular security updates and publish images that are not affected by the rate limits of the public Docker Hub.

### Dokuwiki template

In order to preserve the configuration of the Dokuwiki server that is running in a docker container, we can user a `docker-compose` template. Save the following as a `docker-compose.yml` file in a location that you will remember and that is not readable by any user.

```yaml
---
version: "2.1"
services:
  dokuwiki:
    image: lscr.io/linuxserver/dokuwiki
    container_name: dokuwiki
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York # Replace with your timezone
    volumes:
      - dokuwiki_config:/config
    ports:
      - 80:80
      - 443:443 #optional
    restart: unless-stopped
volumes:
  dokuwiki_config: {}
```

Once this template has been saved, the Dokuwiki server can be started with the following command:

```bash
docker-compose up -d
```

### Upgrading to new versions

Run these commands in the directory with the `docker-compose.yml` template:

```bash
docker-compose pull
docker-compose up -d
```

### Port forwarding

Now in order to connect to your Dokuwiki server from the internet, you must open the associated port in your firewall and if on a consumer ISP, the best bet is to [port forward][7] the Dokuwiki port to your Internet gateway or router provided by your ISP.

In the example above, the server was configured to use port **80/tcp**

### Proxy

Another way to route traffic to the wiki and use multiple web applications behind a single ip address is to use a reverse proxy.

For more information on how to set up a reverse proxy server, see [a previous post][8].


## Setting up Wiki

Once the container is running, navigate to the URL in your browser where you forwarded the connection:

```
http://$IP:$PORT/install.php
```

![dokuwiki_install](/images/dokuwiki_install.png)

### Once you have completed setup

#### First, restart the container

```bash
docker-compose restart
```

#### Next, log in as an superuser and configure nice URLs

1. login as the superuser created in setup and 
2. set "Use nice URLs" in the `admin/Configuration` Settings panel to `.htaccess` 
3. Check the box: Use slash as namespace separator in URLs to enable nice URLs. 

![wiki_config](/images/wiki_config.png)

By default, DokuWiki does no URL rewriting, resulting in URLs like this:

`http://example.com/doku.php?id=page`

These URLs are considered ugly and are not indexed well by some search engines. 

For more details on configurations possible, check out the [Dokuwiki wiki][9].

 [1]: https://www.dokuwiki.org/dokuwiki/
 [2]: https://www.dictionary.com/browse/wikis
 [3]: /posts/containers/
 [4]: /posts/getting-started-with-virtual-machines/
 [5]: /posts/proxmox-installation/
 [6]: https://linuxserver.io
 [7]: https://portforward.com/
 [8]: /posts/pi-proxy/
 [9]: https://www.dokuwiki.org/dokuwiki/