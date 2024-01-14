---
title: Docker Containers
author: aj
image: /images/docker_logo.png
date: 2021-09-12
updated: 2024-01-13
categories:
  - Containers
tags:
  - containers
  - docker

---

_updated: 2024-01-13_

All these Virtual Machines have gobbled up the RAM and CPU cores on my systems. Now I'm going to take a look at a different way to run software: Docker.

![docker_logo](/images/docker_logo.png)

## Docker and containers

[Docker][1] is an [open-source project][2] for automating the deployment of applications into containers. Docker containers can run anywhere, on your laptop/desktop, on a server, or in the cloud. Containers can run natively on Linux and Windows. However, Windows images can run only on Windows hosts and Linux images can run on Linux hosts and Windows hosts, where host means a server or a virtual machine. Containers also do not have to run with Docker. There are other container platforms.

## Comparing Docker containers with virtual machines

| Virtual Machines                                                                                                                                                                    | Docker Containers                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ![virtual_machine_hardware_software](/images/virtual-machine-hardware-software.png)                                                                                                              | ![docker_containers_hardware_software](/images/docker-container-hardware-software.png)                                                                                                                                                                                                                                     |
| Virtual machines include the application, the required libraries or binaries, and a full guest operating system. Full virtualization requires more resources than containerization. | Containers include the application and all its dependencies. However, they share the OS kernel with other containers, running as isolated processes in user space on the host operating system. (Except in Hyper-V containers, where each container runs inside of a special virtual machine per container.) |

Source: Microsoft [Documentation][5]

## Container key concepts

* __Images__: an image is a read-only template for creating containers. Images can be _based_ on another image with customizations.
* __Containers__: a container is an instance of an image. Containers can be created, deleted, started, and stopped. By default containers do not have persistent storage.
* __Registry__: a registry is a library of container images. Docker Hub is the default public registry that anyone can use. You can create a private registry that requires authentication to push and pull container images.

## Installing Docker

Docker can be installed on Windows, macOS, and various Linux distributions. The most up to date instructions will be on the official [Docker Documentation site.][8]


## Getting started with docker

You will need to log into the system where docker is installed. 

On Linux, You will want to add the user account you have to the `docker` group or all docker commands will need to be run with `sudo`.

```shell
sudo usermod -aG USERNAME docker
```

If you just added your user to the docker group, log out of the shell and log back in. Now to download a container and run some basics. Run the following to download an image that provides a basic tutorial that you can view in your browser through the loopback network interface.

```shell
# -d tells the container to run in the background
# -p will bind the container port 80 to the host port 80
docker run -d -p 80:80 docker/getting-started
```

That command will download the docker image `docker/getting-started` from the public Docker Hub and run it locally on port 80. Open a browser and go to the URL `http://localhost` to proceed through a tutorial.

![docker_tutorial](/images/docker_tutorial.png)

## Docker alternatives

There are alternatives to running Docker and Docker desktop on your system. Check out [a previous post][10] that shows some other ways to run containers.

 [1]: https://www.docker.com/
 [2]: https://github.com/docker/docker
 [3]: https://docs.microsoft.com/en-us/dotnet/architecture/microservices/container-docker-introduction/media/docker-defined/virtual-machine-hardware-software.png
 [4]: https://docs.microsoft.com/en-us/dotnet/architecture/microservices/container-docker-introduction/media/docker-defined/docker-container-hardware-software.png
 [5]: https://docs.microsoft.com/en-us/dotnet/architecture/microservices/container-docker-introduction/docker-defined
 [6]: https://docs.ansible.com/ansible/latest/user_guide/playbooks_reuse_roles.html
 [7]: https://galaxy.ansible.com
 [8]: https://docs.docker.com/get-docker/
 [9]: https://brew.sh
 [10]: /posts/docker-alternatives/