---
title: Colima
author: aj
date: 2024-01-13
draft: true
categories:
  - Containers
tags:
  - containers
  - docker
  - macos

---

Colima is a tool that allows you to run container runtimes on macOS (and Linux) with minimal setup. It uses Lima, a lightweight virtual machine manager, to create and manage VMs that run Docker or Containerd. Colima also supports Kubernetes integration, so you can run a local cluster with K3s.

## Installation

To install Colima, you can use Homebrew, a package manager for macOS. If you don’t have it, you can install it by following the instructions [here](https://brew.sh/). Once you have Homebrew, you can install Colima with this command:

```shell
brew install colima
```

Alternatively, you can use MacPorts, Nix, or other installation options as described [on GitHub](https://github.com/abiosoft/colima).

## Starting Colima

To start Colima, you can use the `colima start` command with some optional flags. For example, you can specify the number of CPUs, memory, disk size, architecture, runtime, and Kubernetes options for your VM. Here are some examples of how to start Colima with different configurations:

- Start Colima with the default settings (2 CPUs, 2 GB memory, 60 GB disk, Docker runtime):

```shell
colima start
```

- Start Colima with 4 CPUs, 4 GB memory, 100 GB disk, and Containerd runtime:

```shell
colima start —cpu 4 —memory 4 —disk 100 —runtime containerd
```

- Start Colima with Kubernetes enabled and Traefik ingress controller:

```shell
colima start —kubernetes —kubernetes-ingress
```

- Start Colima with Rosetta 2 emulation (for M1 Macs):

```shell
colima start —arch aarch64 —vm-type=vz —vz-rosetta
```

You can see the full list of available flags by running `colima start —help`.

## Using Colima

Once Colima is started, you can use the Docker or containerd CLI to interact with your containers. For example, you can run the following commands to pull and run a hello-world image:

```shell
# For Docker runtime
docker pull hello-world
docker run hello-world

# For containerd runtime
colima nerdctl pull hello-world
colima nerdctl run hello-world
```

You can also use Docker Compose to run multi-container applications. For example, you can create a `docker-compose.yml` file with the following content:

```yaml
version: “3.9”
services:
  web:
    image: nginx
    ports:
      - “80:80”
  db:
    image: mysql
    environment:
      MYSQL_ROOT_PASSWORD: example
```

Then, you can run the following commands to start the services:

```shell
# For Docker runtime
docker compose up -d

# For Containerd runtime
colima nerdctl compose up -d
```

You can access the web service by visiting http://localhost:80 in your browser.

### Kubernetes

If you enabled Kubernetes, you can use `kubectl` to interact with your cluster. For example, you can run the following commands to get the cluster information and the nodes:

```shell
kubectl cluster-info
kubectl get nodes
```

You can also deploy applications to your cluster using `kubectl` or `helm`. For example, you can run the following commands to install a WordPress application:

```shell
# Create a namespace for WordPress
kubectl create namespace wordpress

# Install WordPress using helm
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install wordpress bitnami/wordpress —namespace wordpress
```

You can access the WordPress service by visiting the URL shown in the helm output.

## Stopping Colima

To stop Colima, you can use the `colima stop` command. This will stop the VM and free up the resources. You can also use the `colima delete` command to delete the VM and remove all the data. Note that this is irreversible, so make sure you backup any important data before deleting the VM.

## Conclusion

Colima is a simple and powerful tool that lets you run container runtimes on macOS (and Linux) with minimal setup. It leverages Lima to create and manage VMs that run Docker or Containerd. It also supports Kubernetes integration, so you can run a local cluster with K3s. Colima is a great alternative to Docker Desktop, especially for M1 Mac users who want to run containers with Rosetta 2 emulation.