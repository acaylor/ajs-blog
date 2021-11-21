---
title: Rancher Desktop
author: aj
image: /images/rancher-desktop-logo.png
date: 2021-11-20
categories:
  - Containers
tags:
  - containers
  - rancher

---
![rancher_desktop](/images/rancher-desktop-logo.png)
Rancher Desktop is an [open-source project][1] to bring Kubernetes and container management to your workstation.

For more information about containers, check out [a previous post][2].

## Installing Rancher Desktop

Rancher Desktop can be installed on Windows, macOS, and various Linux distributions. The most up to date installation packages will be on the official [GitHub release page.][4] This application has an auto-update feature once it is installed onto you system.

![rancher_desktop](/images/rancher-desktop.png)


## nerdctl

 Rancher Desktop can build, push, and pull container images (powered by `nerdctl`)

`nerdctl` is a Docker-compatible command line interface for interacting with the container runtime [containerd][3].

This utility is installed as part of Rancher Desktop. It can be used to run commands you may be familiar with if you have used docker before. You can run the commands from your shell on macOS and Linux or Powershell on Windows.

### Running a container image with nerdctl

To run an existing container image and provide the image with a volume mount:

```bash
nerdctl run hello-world
```

You should see an output similar to this:

```
docker.io/library/hello-world:latest:                                             resolved       |++++++++++++++++++++++++++++++++++++++|
index-sha256:cc15c5b292d8525effc0f89cb299f1804f3a725c8d05e158653a563f15e4f685:    done           |++++++++++++++++++++++++++++++++++++++|
manifest-sha256:f54a58bc1aac5ea1a25d796ae155dc228b3f0e11d046ae276b39c4bf2f13d8c4: done           |++++++++++++++++++++++++++++++++++++++|
config-sha256:feb5d9fea6a5e9606aa995e879d862b825965ba48de054caab5ef356dc6b3412:   done           |++++++++++++++++++++++++++++++++++++++|
layer-sha256:2db29710123e3e53a794f2694094b9b4338aa9ee5c40b930cb8063a1be392c54:    done           |++++++++++++++++++++++++++++++++++++++|
elapsed: 0.7 s                                                                    total:  4.4 Ki (6.3 KiB/s)

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
```

### Viewing container logs

To print the output of the container logs, enter:

```
nerdctl logs <container_id/container_name>
```

### Running containers with compose templates

`nerdctl` can also be used to run containers in docker-compose templates.

```yaml
version: '2'
services:
  hello-world:
    image: alpine
    command: [/bin/echo, 'Hello World!']
```

```
nerdctl compose up
```

You should see an output similar to this:

```
INFO[0000] Creating network hello-world_default
INFO[0000] Ensuring image alpine
docker.io/library/alpine:latest:                                                  resolved       |++++++++++++++++++++++++++++++++++++++|
index-sha256:635f0aa53d99017b38d1a0aa5b2082f7812b03e3cdb299103fe77b5c8a07f1d2:    done           |++++++++++++++++++++++++++++++++++++++|
manifest-sha256:5e604d3358ab7b6b734402ce2e19ddd822a354dc14843f34d36c603521dbb4f9: done           |++++++++++++++++++++++++++++++++++++++|
config-sha256:0a97eee8041e2b6c0e65abb2700b0705d0da5525ca69060b9e0bde8a3d17afdb:   done           |++++++++++++++++++++++++++++++++++++++|
layer-sha256:97518928ae5f3d52d4164b314a7e73654eb686ecd8aafa0b79acd980773a740d:    done           |++++++++++++++++++++++++++++++++++++++|
elapsed: 0.8 s                                                                    total:  2.1 Ki (2.6 KiB/s)
INFO[0000] Creating container hello-world_hello-world_1
INFO[0001] Attaching to logs
hello-world_1 |Hello World!
INFO[0001] Container "hello-world_hello-world_1" exited
INFO[0001] All the containers have exited
INFO[0001] Stopping containers (forcibly)
INFO[0001] Stopping container hello-world_hello-world_1
```
### Next steps

Using `nerdctl` is only half of what Rancher Desktop is capable of. It also lets you run a local kubernetes environment. That is a more robust platform for orchestrating container based services.

  [1]: https://rancherdesktop.io/
  [2]: /posts/containers/
  [3]: https://containerd.io/
  [4]:https://github.com/rancher-sandbox/rancher-desktop/releases