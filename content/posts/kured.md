---
title: Kured
author: aj
image: /images/k8s_logo.png
date: 2023-05-07

categories:
  - Containers
  - Kubernetes
tags:
  - containers
  - kubernetes
  - kured

---

It is important to keep your computers up to date with the latest software and security updates. Running Kubernetes requires some kind of underlying system to run the containers. If you are not familiar with Kubernetes or containers, check out [a previous post][2] to get started.

In [a previous post][1], I looked at a tool, Ansible, to run common tasks on many systems at once. I still use Ansible to patch all of my systems every month. Rebooting kubernetes nodes during this patching playbook works but takes a while and I have yet to add in steps to migrate containers off of a host before rebooting it.

To avoid having to script that, I am now using a tool called `kured` also known as the "Kubernetes Reboot Daemon". This tool handles automatic node reboots when the underlying systems' package manager indicates that a reboot is needed to apply changes.

In Debian based Linux distributions, the package manager will create a file `/var/run/reboot-required` to let you know that system services, libraries, or a new kernel requires that you reboot the system to apply the changes. If you use a Red Hat distro, you can configure `kured` to use a different shell command to determine if a reboot is required.

So if you use a Linux system as your Kubernetes nodes, `kured` will safely reboot nodes one at a time to minimize any downtime as it will `Cordon` and `Drain` nodes which moves containers off of the host that is "cordoned". Once the reboot is complete, the node will be uncordoned and available to run containers once more. Now I simply run the updates and `kured` will slowly reboot the nodes if a reboot is required.

## Installation

In order to proceed, you must have a k8s platform and the `kubectl` command line utility.

Check out [a previous post][2] for help downloading the `kubectl` tool or if you want to check out an overview of Kubernetes itself.

The instructions from the [official documentation][3] just provide a single `YAML` file manifest to installed `kured` onto the cluster. Grab the latest version with these commands:

```sh
latest=$(curl -s https://api.github.com/repos/kubereboot/kured/releases | jq -r '.[0].tag_name')
kubectl apply -f "https://github.com/kubereboot/kured/releases/download/$latest/kured-$latest-dockerhub.yaml"
```

Here is how the manifest looks at the time of this post. This is compatible with k8s versions `	1.25.x, 1.26.x, 1.27.x`

```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kured
rules:
# Allow kured to read spec.unschedulable
# Allow kubectl to drain/uncordon
#
# NB: These permissions are tightly coupled to the bundled version of kubectl; the ones below
# match https://github.com/kubernetes/kubernetes/blob/v1.19.4/staging/src/k8s.io/kubectl/pkg/cmd/drain/drain.go
#
- apiGroups: [""]
  resources: ["nodes"]
  verbs:     ["get", "patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs:     ["list","delete","get"]
- apiGroups: ["apps"]
  resources: ["daemonsets"]
  verbs:     ["get"]
- apiGroups: [""]
  resources: ["pods/eviction"]
  verbs:     ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kured
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kured
subjects:
- kind: ServiceAccount
  name: kured
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: kube-system
  name: kured
rules:
# Allow kured to lock/unlock itself
- apiGroups:     ["apps"]
  resources:     ["daemonsets"]
  resourceNames: ["kured"]
  verbs:         ["update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: kube-system
  name: kured
subjects:
- kind: ServiceAccount
  namespace: kube-system
  name: kured
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: kured
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kured
  namespace: kube-system
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kured # Must match `--ds-name`
  namespace: kube-system # Must match `--ds-namespace`
spec:
  selector:
    matchLabels:
      name: kured
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        name: kured
    spec:
      serviceAccountName: kured
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
        - key: node-role.kubernetes.io/master
          effect: NoSchedule
      hostPID: true # Facilitate entering the host mount namespace via init
      restartPolicy: Always
      containers:
        - name: kured
          # If you find yourself here wondering why there is no
          # :latest tag on Docker Hub,see the FAQ in the README
          image: ghcr.io/kubereboot/kured:1.13.0
          imagePullPolicy: IfNotPresent
          securityContext:
            privileged: true # Give permission to nsenter /proc/1/ns/mnt
          ports:
            - containerPort: 8080
              name: metrics
          env:
            # Pass in the name of the node on which this pod is scheduled
            # for use with drain/uncordon operations and lock acquisition
            - name: KURED_NODE_ID
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          command:
            - /usr/bin/kured
#            - --force-reboot=false
#            - --drain-grace-period=-1
#            - --skip-wait-for-delete-timeout=0
#            - --drain-timeout=0
#            - --period=1h
#            - --ds-namespace=kube-system
#            - --ds-name=kured
#            - --lock-annotation=weave.works/kured-node-lock
#            - --lock-ttl=0
#            - --prometheus-url=http://prometheus.monitoring.svc.cluster.local
#            - --alert-filter-regexp=^RebootRequired$
#            - --alert-firing-only=false
#            - --reboot-sentinel=/var/run/reboot-required
#            - --prefer-no-schedule-taint=""
#            - --reboot-sentinel-command=""
#            - --slack-hook-url=https://hooks.slack.com/...
#            - --slack-username=prod
#            - --slack-channel=alerting
#            - --notify-url="" # See also shoutrrr url format
#            - --message-template-drain=Draining node %s
#            - --message-template-reboot=Rebooting node %s
#            - --message-template-uncordon=Node %s rebooted & uncordoned successfully!
#            - --blocking-pod-selector=runtime=long,cost=expensive
#            - --blocking-pod-selector=name=temperamental
#            - --blocking-pod-selector=...
#            - --reboot-days=sun,mon,tue,wed,thu,fri,sat
#            - --reboot-delay=90s
#            - --start-time=0:00
#            - --end-time=23:59:59
#            - --time-zone=UTC
#            - --annotate-nodes=false
#            - --lock-release-delay=30m
#            - --log-format=text
```

#### Installation components

The single `yaml` file that is applied to the cluster has a few k8s API objects that will be added to your cluster: 

- ClusterRole, This is a set of API permissions that are needed to perform the checks and reboots
- ClusterRoleBinding, This applies the permissions from the ClusterRole to the account that kured will use to access the k8s API
- Role, this allows the kured service account to access the kured API objects
- RoleBinding, this applies the Role to the kured service account
- ServiceAccount, this is an account for kured to perform operations against the kubernetes API
- Daemonset, this is the bread and butter of kured. It will create a container that runs on every node that handles the kured operations of checking whether the node needs to be rebooted and handles safely draining containers off of nodes before they are rebooted.

#### Test

To test whether it worked, simply create the file that indicates that a node needs to be rebooted:

```sh
sudo touch /var/run/reboot-required
```

By default `kured` will check every 60 minutes but you can override this behavior by uncommenting the following line in the `DaemonSet` manifest:

`- --period=1h`

Change it to something else such as `30s` if you want to check every 30 seconds.

To edit the object on the cluster:

```sh
kubectl edit daemonset kured -n kube-system
```

#### Reboot command for Red Hat distros

If you are using RHEL or similar (Rocky, Alma, Centos, SUSE), you can tell `kured` to use this command instead: `sh -c "! needs-restarting --reboothint"`

You can configure `kured` to do this by uncommenting the following line in the `DaemonSet` manifest:

`- --reboot-sentinel-command='sh -c "! needs-restarting --reboothint"'`

 [1]: /posts/ansible/
 [2]: /posts/kubernetes/
 [3]: https://kured.dev/docs/installation/
