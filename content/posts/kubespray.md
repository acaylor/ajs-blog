---
title: Deploy Kubernetes with kubespray
author: aj
image: /images/k8s_logo.png
date: 2022-08-28

categories:
  - Containers
  - Kubernetes
tags:
  - containers
  - kubernetes
  - kubespray
---

Kubernetes, also known as k8s, is an open-source system for automating deployment, scaling, and managment of containerized applications. For more of an overview, take a look at a [previous post][1] getting started with a simple kubernetes environment. This post is looking at a tool to deploy a kubernetes cluster with multiple nodes and most importantly it can be used on physical computers, a virtual machine, or a cloud based virtual server. To get started, you need SSH access to systems that you want to use as kubernetes nodes and install [ansible][2] on your workstation.

## Kubespray

To use [kubespray][3] you need to use the `git` repository.

If you do not have git installed visit: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git

Once git is installed, use `git clone` to download:

```bash
git clone https://github.com/kubernetes-sigs/kubespray.git
```

I recommend using a tagged version of the repository. Running `git tag` will show you the tags available. The project uses semantic versioning so if you are installing for the first time, use the latest tag.

vMAJOR.MINOR.Patch

For example:

```bash
cd kubespray
git checkout v2.19.0
```

## Setup ansible

To ensure your python environment matches the tested versions, utilize a python virtual environment to run kubespray. After cloning the kubespray repository, you can set up a virtual environment:

```bash
VENVDIR=kubespray-venv
KUBESPRAYDIR=kubespray
ANSIBLE_VERSION=2.12
virtualenv  --python=$(which python3) $VENVDIR
source $VENVDIR/bin/activate
cd $KUBESPRAYDIR
pip install -U -r requirements-$ANSIBLE_VERSION.txt
test -f requirements-$ANSIBLE_VERSION.yml && \
  ansible-galaxy role install -r requirements-$ANSIBLE_VERSION.yml && \
  ansible-galaxy collection -r requirements-$ANSIBLE_VERSION.yml
```

### Setup inventory

You can setup the cluster with any systems that are on the same network and you have SSH access. Once you have the IP address for each server you want to configure, you can generate the inventory that ansible will use:

```bash
cp -r inventory/sample inventory/mycluster
declare -a IPS=(10.0.0.1 10.0.0.N)
CONFIG_FILE=inventory/mycluster/hosts.yml python3 contrib/inventory_builder/inventory.py ${IPS[@]}
```

Now there will be inventory files for you to use to customize the cluster if you desire.

```
inventory/mycluster/hosts.yml
inventory/mycluster/group_vars/k8s_cluster/addons.yml
inventory/mycluster/group_vars/k8s_cluster/k8s-cluster.yml
```

- `hosts.yml` is the file generated above. You can replace the names of the nodes here if you desire.
- `addons.yml` has a bunch of optional addons commented out that you can enable. If you are in a homelab, I recommend setting up metallb and nginx ingress controller to facilitate access to anything deployed on the cluster.
- `k8s-cluster.yml` has configuration for the kubernetes cluster. The defaults will work but you can choose a different networking subsytem here for example.

In the `k8s-cluster.yml` all I have changed is enabling the following option so that my workstation has a `kubeconfig` file to access the kubernetes API with `kubectl`.

`kubeconfig_localhost: true`

#### Addons

The addons I recommend are the nginx ingress controller and metallb.

MetalLB hooks into your Kubernetes cluster, and provides a network load-balancer implementation. It allows you to create Kubernetes services of type `LoadBalancer` in clusters that don't run on a cloud provider, and thus cannot simply hook into 3rd party products to provide load-balancers. In a homelab this is how you can assign static IP addresses to applications that you deploy in a cluster.

I recommend the following options in the `addons.yml` :

```yaml
metrics_server_enabled: true
ingress_nginx_enabled: true

metallb_enabled: true
metallb_speaker_enabled: true
metallb_ip_range:
  - "10.0.0.1-10.0.0.100"
```

The `metallb_ip_range` can be a block of addresses or you can use a whole CIDR block such as `10.0.1.0/16`

If you want to use metallb, head back to the `k8s-cluster.yml` and make sure the following option is set:

`kube_proxy_strict_arp: true`

### Run kubespray

Once the inventory is prepared, you can run the ansible playbook to complete the setup:

```bash
ansible-playbook -i inventory/mycluster/hosts.yml -u ubuntu --private-key=~/.ssh/id_ansible --become cluster.yml
```

The `-u` flag is the user to connect to your servers with SSH. The `--private-key` flag is a private SSH key for ansible to use to authenticate to the servers where you want to deploy kubernetes. The `--become` flag is needed to run certain tasks with `sudo` as a lot of changes are needed to be made to the target systems.

If you do not have an SSH key, run `ssh-keygen` on your workstation and `ssh-copy-id` command to copy the key to the remote systems where you want to connect.

If `kubeconfig_localhost` is enabled `admin.conf` will appear in the `inventory/mycluster/artifacts/` directory after deployment. To use this with `kubectl`, copy it to your home directory `~/.kube/config` or set the environment variable `KUBECONFIG=/path/to/admin.conf`

## lab environment nginx ingress

If you are using a test environment and enabled the addons for `ingress_nginx` and `metallb_ip_range`. Here is an example service to create so that you can give the nginx ingress server a static ip address in the range that you configured in `addons.yml`.

`service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  # annotations:
    # metallb.universe.tf/address-pool: single-ip
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  externalTrafficPolicy: Local
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
    name: http
  - port: 443
    targetPort: 443
    protocol: TCP
    name: https
  selector:
    app.kubernetes.io/name: ingress-nginx
```

Add this to your cluster:

`kubectl apply -f service.yaml`

And then you can see the ip address assigned as `EXTERNAL_IP`:

```bash
kubectl get svc -n ingress-nginx ingress-nginx
NAME            TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
ingress-nginx   LoadBalancer   10.10.10.10   10.0.0.1    80:32034/TCP,443:31326/TCP   8d
```


 [1]: /posts/kubernetes/
 [2]: /posts/ansible/
 [3]: https://kubespray.io/#/
