---
title: Factorio container game server
author: aj
image: /images/factorio_logo.png
date: 2022-02-11
categories:
  - Containers
tags:
  - containers
  - docker
  - factorio

---

[Factorio][1] is a game where you crash land on an alien planet and build a factory to create a space ship and escape the dangerous world you landed on.

![factorio_logo](/images/factorio_logo.png)

*Update 02-00-22*

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

---

*Original post only included below:*

---

## Configuring the server

Someone has already created an amazing [container image][2] that will start the game server as a non-root user and supports mods out of the box.

Only one volume/directory is needed to store the persistent data of the game server. In this example, the container will run on a Linux system with docker and the game server files will be stored in `/opt/factorio`. The game server runs on UDP port 34197 by default. This can be changed but the game client will expect the default port. If you are not familiar with running containers, see [a previous post][3] on how to get started with docker.

If using a directory mount, after making any changes, the file permissions must be mapped to the factorio user that will run the server software inside the container. This user has a `uid` of `845`.

After making any changes, run:

```bash
chown -R 845:845 /opt/factorio
```

Using `docker-compose` and the template below, a fully functional factorio server can be created in seconds.

```yaml
version: '2'
services:
  factorio:
    image: factoriotools/factorio
    ports:
      - "34197:34197/udp"
    environment:
      - UPDATE_MODS_ON_START=true
    volumes:
      - /opt/factorio:/factorio
```

If you start this container, the server configuration will be auto-generated. This file can be modified to meet your requirements and then you can restart the container to reload the server configuration.

Once this template has been saved, the factorio server can be started with the following command:

```bash
docker-compose up -d
```

You can directly connect to the server from the game main menu: 

Multiplayer > Connect to address

`hostname_or_ip:port` i.e. `factorio_host:34197`

### Upgrading to new versions

Run these commands in the directory with the `docker-compose.yml` template:

```bash
docker-compose pull
docker-compose up -d
```

### Port forwarding

Now in order to connect to your factorio server from the internet, you must open the associated port in your firewall and if on a consumer ISP, the best bet is to [port forward][4] the factorio port to your Internet gateway or router provided by your ISP.

In the example above, the server was configured to use port **34197/udp**


### Server settings

If using the volume mount `/opt/factorio` , the server settings can be found under `/opt/factorio/config/server-settings.json`.

### Saves

A new map/save file is created when the server starts for the first time. If you have a map from a single player game, this can be used by the server. The default save will be found in `/opt/factorio/_autosave1.zip`

The `map-gen-settings.json` and `map-settings.json` files in `/opt/factorio/config` can be modified to generate a new map/save. The server will always use the newest save. Timestamps can be checked with `ls -lt /opt/factorio`

To load an existing map/save, 
- Stop the container and run the command `touch oldsave.zip`. This resets the modified date. Next, restart the container. 
- Another option is to delete all saves except one.

To generate a new map stop the container, delete all of the saves and restart the container.

### Mods

The easiest way to import mods is to copy the `mods` directory from your system to the container's persistent volume `/opt/factorio/mods`

In the container compose template above, the environment variable `UPDATE_MODS_ON_START` will update the mod files when the container starts/restarts.

 [1]: https://www.factorio.com/
 [2]: https://hub.docker.com/r/factoriotools/factorio
 [3]: /posts/containers/
 [4]: https://portforward.com/

