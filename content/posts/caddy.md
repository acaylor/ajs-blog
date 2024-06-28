---
title: Using Caddy as a reverse proxy
author: aj
date: 2024-06-22
image: /images/caddy_logo.png
categories:
  - Homelab
  - Networking
tags:
  - containers
  - docker
  - homelab
  - caddy 
  - reverse proxy

---

![Caddy_logo](/images/caddy_logo.png)

I will be using Caddy to serve as a [reverse proxy][1] for my network. With [Caddy][2], I can manage my proxy configurations in a single file. Caddy is an easy to configure web server and can also function as a reverse proxy. Caddy is free and open-source software.

On a system where I want to securely expose services running on containers, Caddy is easy for me to pick a certificate and then define all of the proxy rules for each container in a single file. I can run Caddy as a container as well making the management of my proxy server easy and lightweight. The configuration syntax is much more simple than nginx which is [what I typically use][3] for a proxy server.

## Installing with Docker

### Requirements

In order to run the Caddy server, I will be using a Docker container. In order to keep this post concise, please check out [my previous post][4] on Docker if you are not familiar with the technology.

In order to proceed, you must have a suitable system with Docker installed. See above for posts that will help you meet these requirements. There are alternative ways to run containers without Docker. Check out [a previous post][5] to see some alternatives to Docker.

### Install with Docker compose file

To set up Caddy as a reverse proxy using Docker, you can use a `docker-compose.yml` file to define and run the Caddy service. Below are the steps and the necessary configuration. The alternative is to use a `docker run` command but this `.yml` file will save the configuration and help you remember how the container is configured.

## Example

Here's a simple example of how you can use Caddy as a reverse proxy for other containers in a Docker Compose stack:

First, create a `docker-compose.yml` file with the following contents:

```yaml
version: '3'
services:
  caddy:
    image: caddy/caddy
    ports:
      - "8000:80"
    depends_on:
      - webserver1
      - webserver2
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
  webserver1:
    image: nginx
    environment:
      - NGINX_HOST=webserver1.example.com
      - NGINX_PORT=80
  webserver2:
    image: nginx
    environment:
      - NGINX_HOST=webserver2.example.com
      - NGINX_PORT=80
```

In this example, we're defining two services in our Docker Compose stack: `caddy` and `webserver1`/`webserver2`. The `caddy` service uses the official Caddy image and exposes port 80 to the host machine port 8000. It also depends on both `webserver1` and `webserver2`, which means that it will wait for those services to be started before starting itself.

The `webserver1` and `webserver2` services are defined as separate Nginx containers, with ports 80 exposed and environment variables set to specify the hostname and port for each service. You can adjust the ports and hostnames used to your environment.

Next, create a `Caddyfile` file in the same directory as your `docker-compose.yml` file:

```Caddyfile
# Caddyfile

example.com {
    reverse_proxy / webserver1:80 {
        header Host webserver1.example.com
    }
}

example2.com {
    reverse_proxy / webserver2:80 {
        header Host webserver2.example.com
    }
}
```

In this `Caddyfile`, we're defining two server blocks, one for each hostname that we want to proxy requests for (`example.com` and `example2.com`). Each block defines a reverse proxy rule that routes incoming requests to the respective backend service (in this case, `webserver1` or `webserver2`) based on the URL path.

The `reverse_proxy` directive specifies the URL path that we want to route requests for, and the `header Host` directive sets the `Host` header in the request to match the hostname of the backend service.

Start the Docker Compose stack by running `docker compose up -d` in a terminal.

Once the containers are started, you can test your reverse proxy configuration by making requests to `http://localhost/example.com/` and `http://localhost/example2.com/` from a web browser or command line tool like `curl`.

The request should be routed to either `webserver1` or `webserver2`, depending on the hostname in the URL.

### Docker network

As long as the containers are on the same network, which is the case when you define them in a Docker Compose stack, Caddy can be used to proxy traffic to containers without exposing lots of ports on the host where Docker is installed.

If you want to connect containers that are not managed in the same Compose file and you are using Docker, you can create a Docker network to connect these containers.

To create a Docker network and use it in your Compose file, follow these steps:

Run the following command to create a new network called "my-network":

```shell
docker network create my-network
```

In your `docker-compose.yml` file, add the following lines:

```yaml
version: '3'
services:
  caddy:
    image: caddy/caddy
    networks:
      - my-network
networks:
  my-network:
    external: true
```

This will create a new network called "my-network" and attach it to the service named "my-service". The `external` keyword tells Docker Compose that this is an existing network, rather than one created by the Compose file.

1. Start your services using `docker-compose up -d`.
2. Verify that the network has been successfully created by running `docker network ls`. You should see a line with "my-network" in it.
3. To use this network in another service, add the following lines to the Compose file:

```yaml
version: '3'
services:
  my-other-service:
    image: my-other-image
    networks:
      - my-network
```
This will attach "my-other-service" to the same network as "my-service".

You can now use this network in your Compose file to connect multiple services together. I am still using NGINX in my lab but setting up Caddy to proxy container based apps on my Raspberry Pi 4 has been a breeze. I know there are other reverse proxy apps out there that could have tighter integration with containers that I may explore in the future.

 [1]: https://en.wikipedia.org/wiki/Reverse_proxy
 [2]: https://caddyserver.com
 [3]: /posts/nginx/
 [4]: /posts/containers/
 [5]: /posts/docker-alternatives/