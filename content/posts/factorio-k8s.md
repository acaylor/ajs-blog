---
title: Factorio kubernetes game server
author: aj
image: /images/factorio_logo.png
date: 2023-05-13
categories:
  - Containers
tags:
  - containers
  - kubernetes
  - factorio

---

In a [previous post][1] I deployed a factorio game server using docker. The same image can be deployed onto kubernetes.

## Installing factorio on Kubernetes

#### Requirements

In order to proceed, you must have a k8s platform, the `kubectl` command line utility, and a persistent provider. If you are not familiar with kubernetes, check out a [previous post][2] to get started.

### Deployment to k8s 

In order to deploy factorio onto a kubernetes cluster, the deployment needs to be configured in `YAML` format document.

### factorio manifests

#### factorio-pvc.yaml

This file will request persistent storage for the container(s). This will utilize the `longhorn` storage provider. For more information, see [a previous post][3] on the topic.

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

#### factorio-deploy.yaml

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

#### Install to your cluster

To install these on your cluster, use `kubectl`. I recommend creating a dedicated `namespace` in the cluster for this game server.

```bash
kubectl create namespace factorio

kubectl apply -f factorio-pvc.yaml -n factorio

kubectl apply -f factorio-deploy.yaml -n factorio
```

Verify it worked:

```bash
kubectl get all -n factorio
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


## Mods

In order to move mods onto the container's persistent storage, you will need to copy the files from your game's `mods` directory onto the server using `kubectl cp`

```bash
kubectl cp mods/ factorio/factorio-57c96d8b8d-7rcf9:/factorio/
```

Replace with the name of your factorio pod: `kubectl get po -n factorio`

Once the mods are copied, delete the pod to reload the server with the mods.

## Next steps

To delete these resources, delete the objects created for the factorio server: `Deployment` , `Service`, `PersistentVolumeClaim` and `PersistentVolume` if your storage class does not automatically delete unclaimed volumes.

## Troubleshooting

If you have trouble accessing the game server from the game itself, check that there is not a firewall blocking the port exposed as a `NodePort`. 

The logs of the factorio pod may also provide information as to what might be wrong:

`kubectl get logs factorio-foobar`

Replace with the name of your factorio pod: `kubectl get po -n factorio`.

 [1]: /posts/factorio/
 [2]: /posts/kubernetes/
 [3]: /posts/longhorn/
