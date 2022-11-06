---
title: Docker Alternatives
author: aj
image: /images/docker_logo.png
date: 2022-11-06

categories:
  - Containers
tags:
  - containers
  - docker
  - podman
  - containerd
  - nerdctl

---

When it comes to running containers, `docker` is the most widely used tool with millions of container images available on the [public docker hub][1]. If you are not familiar with docker, check out [a previous post][2] to get an introduction. I am looking at Alternatives since docker is no longer used as a container runtime in the kubernetes platform. I use kubernetes in my homelab to orchestrate container based services accross multiple computers. If you are not familiar with kubernetes, check out [a previous post][3] for an introduction.

## Alternatives

When exploring alternives to docker, I will be looking at options you can install on Linux systems.

### Podman

[Podman][4] is a open-source container engine developed by the folks who release Red Hat Enterprise Linux (RHEL) and develop Fedora Linux with the community. The biggest difference between podman and docker is that podman does not need a system daemon running like docker. Another difference is that podman by default will run in userspace instead of as root. Podman can also run collections of multiple containers together similar to a deployment in kubernetes.


#### Installing podman on macOS

I recommend using [homebrew][5] to install podman. Once you have homebrew available, install with one command:

```sh
brew install podman
```

On macOS, you must create a `podman machine` which is a virtual machine after installing via homebrew.

##### Create podman machine

```sh
podman machine init

podman machine start

podman info
```

#### Installing podman on Linux

Most linux distributions have podman in their package repositories.

For Red Hat distros: `sudo dnf install podman`

- For RHEL 8: `sudo dnf module enable container-tools:rhel8`

For Debian based distros including Ubuntu: `sudo apt-get install podman`

For Arch based distros: `sudo pacman -S podman`

For SUSE based distros: `sudo zypper install podman`

#### Installing podman on windows

If you are on windows you can use a Linux virtual machine to run podman or enable the windows feature "Windows System for Linux". The maintainers of podman have a guide on how to set everything up on [GitHub][6].

#### Using podman

Most docker commands can simply be run with podman using the same syntax. The exception being `docker compose`.

##### Running a container

```sh
podman run -dt -p 80:80/tcp nginx:alpine
```

##### List running containers

```sh
podman ps
```

##### List container process ids

```sh
podman top container-foo-id
```

##### Delete a container

```sh
podman rm container-foo-id
```

---

### runc

Initially `runc` was part of docker but was released standalone in 2015. This is a low level container runtime that does not include all of the features of docker such as networking, storage overlays, and building images. This tool is not designed for users but for usage inside the other software on this post such as docker, podman, and containerd.

### containerd

Next is containerd which actually uses `runc` to provide an interface between the operating system and the lower level runc daemon. Interestingly, docker uses containerd by default under the hood. Kubernetes also can use containerd to run your containers. There is an open-source [tool][7] called `nerdctl` that provides the commands to build and run container images that docker users will quickly recognize.

contai`nerdctl` is another tool where you can swap the `docker` command for `nerdctl` and interact with containers with the same commands. One advantage over podman is the ability to use `compose` to save container templates into `yaml` files.

There are some interesting features that are not available with docker.

- You can run a container before the image is finished pulling which is called "lazy-pulling"
- You can run containers in rootless mode but requires more configuration than podman.
- You can run encrypted container images with OCIcrypt

Unlike podman, containerd is not trying to compete with docker. In fact docker utilizes containerd but does not incorporate all the features of the containerd API. `nerdctl` can be used by developers who want to try experimental features that are in development and not available with docker yet.

#### Prerequisites

In order to use `nerdctl` you need containerd installed on your system. Then you can simply download the `nerdctl` binary and add it to your $PATH.

#### Install on macOS

On macOS, you need to use a virtual machine provided by the Lima project. Lima can be installed with [homebrew][5].

```sh
brew install lima
```

Once lima is installed you can leverage `nerdctl`:

```sh
limactl start

lima nerdctl run -d -p 127.0.0.1:8000:80 nginx:alpine
```

This will run the `nginx:alpine` container image from the public docker hub and bind to the localhost interface of the mac on the port you specify, 8000 in this case.

#### Install on Linux

##### Download nerdctl

You can download the latest `nerdctl` and containerd from [GitHub][8]

```sh
wget https://github.com/containerd/nerdctl/releases/download/v1.0.0/nerdctl-full-1.0.0-linux-amd64.tar.gz
```

Extract to `~/.local` in your home directory. Make sure `~/.local/bin` is included in your $PATH (`export PATH=$HOME/.local/bin:$PATH`)

```sh
tar xvf nerdctl-full-1.0.0-linux-amd64.tar.gz ~/.local/
```

Run the included script to run containers without root:

```sh
bash -C ~/.local/bin/containerd-rootless-setuptool.sh install
```

Now enable the containerd service for your user account:

```sh
systemctl --user start containerd.service
```

Test that you can run a container:

```sh
nerdctl run -d -p 8000:80 nginx:alpine
```

Check the port on you local system:

```sh
curl localhost:8000
```

Or visit `http://localhost:8000` in a browser. You should see "Welcome to nginx!" in the browser or the `<title>Welcome to nginx!</title>` in the terminal.

---

## Building and running a container

To demonstrate interoperability, you can perform this process with docker, podman, or contai`nerdctl`.

### Prepare source code

This example will be a simple Nodejs server.

First make a `package.json` file to include the library dependencies.

```json
{
  "dependencies": {
    "express": "*"
  },
  "scripts": {
    "start": "node index.js"
  }
}
```

Create a javascript file `index.js`

```js
const express = require('express')

const app = express();

app.get('/', (req, res)=> {
     res.send("hello from a container")
});
app.listen(8080, () => {
     console.log("Listening on port 8080");
});
```

Create a `Dockerfile`

```Dockerfile
FROM node:alpine
WORKDIR usr/app
COPY ./ ./
RUN npm install
CMD ["npm", "start"]
```

### Build the container

Now build the image with any of the aformentioned tools:

```sh
podman build --tag example .
```

### Run built image

Now run the image that you built:

```sh
podman run -d -p 8080:8080 example
```

Now connect to the web server in a browser or terminal and yo ushould see the message configured in `index.js`

```sh
curl localhost:8080
hello from a container
```

or visit `http://localhost:8080` in a browser

#### Clean up

Stop all containers:

```sh
podman stop $(podman ps -a -q)
```

Remove all containers:

```sh
podman rm $(podman ps -a -q)
```

 [1]: https://hub.docker.com
 [2]: /posts/containers/
 [3]: /posts/kubernetes/
 [4]: https://podman.io/
 [5]: https://brew.sh
 [6]: https://github.com/containers/podman/blob/main/docs/tutorials/podman-for-windows.md
 [7]: https://github.com/containerd/nerdctl
 [8]: https://github.com/containerd/nerdctl/releases
