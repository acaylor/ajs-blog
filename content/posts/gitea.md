---
title: Gitea
author: aj
date: 2024-06-18
categories:
  - Software Development
tags:
  - git
  - containers
  - gitea
---

![gitea_logo](/images/gitea_logo.png)

## Setting Up Gitea in a Docker Container and Securing it with Nginx

[Gitea][1] is a lightweight, self-hosted Git service that can be easily deployed in a Docker container. In this post, we'll go through the process of setting up Gitea in a Docker container and securing it with Nginx as a reverse proxy.

## Prerequisites

First, you need to install Docker on your server. If you are not familiar with Docker, check out [a previous post][2] to get started and install the required software.

Second, if you want to access Gitea remotely over HTTPS, you need to set up a DNS record that points to the system where Gitea is running. You can name the hostname anything but this example will be `gitea.example.com`.

Next, create a directory to store persistent data for the Gitea container.

`mkdir -p gitea`

## Create a Docker Container for Gitea

Create a Docker container for Gitea. Note this will use a [sqlite][3] database which is fine for testing and a single user but for any environment with multiple users, check out using mySQL as an alternative.

### docker run

You can create the container with the docker CLI command.

```shell
docker run -d --name=gitea \ 
  -p 10022:22 -p 10080:3000 \ 
  -v ./gitea:/data gitea/gitea:latest
```

This command creates a new Docker container named `gitea`, maps the container's SSH port 22 to the host's port 10022, and the HTTP port 3000 to the host's port 10080.

You can stop here and access your Gitea instance using the hostname or IP of the system where the container was run and the port 10080. If using your local system, you can navigate to this URL:

<http://localhost:10080>

Cleanup this container by entering the command:

```shell
docker stop gitea && docker rm gitea
```

The container image and volume can be cleaned by entering 

```shell
docker system prune -a
```

Now if you want to use HTTPS, a reverse proxy can be used to encrypt traffic from the network to the Gitea container.

---

## Install and Configure Nginx with Gitea

This example uses Nginx to proxy requests to Gitea and secure using SSL/TLS encryption via HTTPS. If you are not familiar with Nginx, check out [a previous post][4] to learn more.

First, create a `docker-compose.yml` file with the following contents:

```yaml
volumes:
  gitea: {}

services:
  gitea:
    image: docker.io/gitea/gitea:1.21.10
    container_name: gitea
    restart: unless-stopped
    volumes:
      - gitea:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - gitea
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
```

This is defining two services in the Docker Compose stack: nginx and gitea. The nginx service uses the official Nginx image with Alpine Linux, and exposes port 80 and 443 to the host machine. It also depends on the gitea service, which means that it will wait for Gitea to be started before starting itself.

Next, create an Nginx configuration file called `nginx.conf` in the same directory as your `docker-compose.yml` file:

```nginx
# nginx.conf
server {
    listen 443 ssl;
    server_name gitea.example.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        proxy_pass http://gitea:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

In this configuration Nginx will listen on port 443 for requests to `gitea.example.com`. Nginx will use the private key and certificate key specified under `ssl_certificate` and `ssl_certificate_key`. Providing a certificate is out of scope for my post but if you are interested in how to create a wildcard certificate for a domain that you own, check out a [previous post][5] where I set one up for free.

Create a directory to store certificates and mount them in the Nginx container:

`mkdir -p certs`

We then define a server block with the domain name and port for our reverse proxy. The `location /` block specifies that all incoming requests should be proxied to Gitea, using the `proxy_pass` directive. We also set headers in the `proxy_set_header` directives to preserve the original hostname and IP address of the client.

Start your Docker Compose stack by running `docker-compose up -d` in your terminal. Once the containers are started, you can test your reverse proxy configuration by making requests to <https://gitea.example.com/> from a web browser or command line tool like `curl`. The request should be routed to Gitea, and you should see the Gitea homepage displayed in your browser.

![gitea](/images/gitea_splash.png)

You now have a reverse proxy set up using Nginx that routes incoming requests to Gitea. You can repeat this process for other services in your Docker Compose stack to create a complete reverse proxy solution.

For more information about how to configure Gitea, check out the [official documentation][1].

 [1]: https://docs.gitea.com
 [2]: /posts/containers/
 [3]: https://www.sqlite.org
 [4]: /posts/nginx/
 [5]: /posts/homelab-wildcard-cert/