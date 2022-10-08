---
title: Using nginx as a reverse proxy
author: aj
date: 2022-10-08
image: /images/nginx_logo.jpg
categories:
  - Homelab
  - Networking
tags:
  - containers
  - docker
  - homelab
  - nginx 
  - reverse proxy

---

![nginx_logo](/images/nginx_logo.jpg)

I will be using nginx to serve as a [reverse proxy][1] for my network. With [Nginx][2], I can manage my proxy configurations in a single server. Nginx is one of the most widely used web servers and can also function as a reverse proxy, load balancer, mail proxy, and HTTP cache. Nginx is free and open-source software.

## Linux example

On Linux distributions, nginx should be available in the software repositories. Once installed and enabled, you will need to open port `80` and/or `443` to access from other systems.

### Red Hat systems

On Red Hat distributions such as [Fedora][3] and [RHEL][4], you can install with the `dnf` package manager.

```sh
sudo dnf install nginx
```

### Debian based systems

On Debian based distributions, you can install with the `apt` package manager.

```sh
sudo apt update
sudo apt install nginx
```

### Enabling nginx server on linux with systemD

When you install nginx on your linux distribution, you can start the web server and have it run on boot by starting and enabling the nginx system daemon.

```sh
systemctl enable --now nginx
```

You can check it worked by entering the system's hostname or IP address into a browser or by accessing the web server port with `curl` or `wget` from a terminal.

#### Test from CLI

From the terminal you can test the new web server by using the `curl` or `wget` commands.

```sh
wget -qO- localhost
```

OR

```sh
curl localhost
```
You should see the HTML output from the default page:

```html
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

## HTTPS reverse proxy example

Here is an example of how to have nginx listen on port 80 to redirect traffic to the secure port `443` which will use a certificate for TLS encryption to support `https` connections.

By default, the configuration file is named `nginx.conf` and placed in the directory `/usr/local/nginx/conf`, `/etc/nginx`, or `/usr/local/etc/nginx`. 

### Disable default configuration

We do not want the default settings interferring with the proxy server.

```sh
sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
```

Each proxy server should have a unique `server_name` and proper `ssl_certificate`. 

```conf
server {
listen 80;
server_name foo.com bar.com;
return 301 https://$server_name$request_uri;
}
server {
listen 443 ssl http2;
server_name foo.com;
ssl_certificate /path/to;
ssl_certificate_key /path/to;
ssl_prefer_server_ciphers on;

location / {
        proxy_pass http://localhost:3100;

        proxy_set_header        Host $host;
        proxy_set_header        X-Real-IP $remote_addr;
        proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header        X-Forwarded-Proto $scheme;
  }
}

```

This example configuration should be saved in `/etc/nginx/conf.d/` and will redirect incoming requests to `foo.com` to the `proxy_pass` which in this example is traffic on the system's port 3100. 

You can configure the firewall to only allow connections to port 443 and incoming requests to the web server will be encrypted.

---

## Docker example

You can also run nginx in a lightweight image with `docker`. If you are not familiar with docker, check out [a previous post][5] to get started.

You can take the configuration file and copy it to a container image to create a container that will act as a reverse proxy.

To build a new container, you need to create a `Dockerfile` and copy the config file into the container image.

### Dockerfile

```Dockerfile
FROM nginx:alpine

COPY example.conf /etc/nginx/conf.d/default.conf
```

You can build the image on the local machine:

```sh
docker build -t proxy .
```

Run the new image:

```sh
docker run -d proxy -p 80:80
```

### Docker compose

Or create a `docker-compose` template in `yaml` format to combine with other containers:

```docker-compose.yml
version: '3'
services:
  proxy:
    build: ./
    ports:
      - 80:80
  example:
    image: k8s.gcr.io/echoserver:1.4
    container_name: example
```

Take the `Dockerfile` from the example and then create a new nginx proxy config file:

```example.conf
server {
  listen 80;
  server_name foo.com;

  location / {
        proxy_pass http://example:8080;

        proxy_set_header        Host $host;
        proxy_set_header        X-Real-IP $remote_addr;
        proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header        X-Forwarded-Proto $scheme;
  }
}
```

Now start the container and connect to `localhost` port `80` to test the proxy.

```sh
docker compose up -d
```

Test by going to http://localhost in the browser or CLI

```sh
curl localhost
```

You can proxy multiple containers they just need to be in different `server {}` blocks in the nginx config file. You will want to use different subdomains for the `server_name` option or different `location /` paths on the nginx host.

You will want to use DNS to help direct traffic to the proper proxied subdomain. You will want to create DNS records for each subdomain that point to the IP address of the system where the nginx proxy is running, whether that is running on docker or on the system. On Linux systems, you can modify `/etc/hosts/` file to test.

```/etc/hosts
192.168.1.100 foo.com
192.168.1.100 bar.com
```

## Next steps

If you created docker containers, you can clean those up with the command `docker compose down` and clean _everything_ with the command `docker system prune -a`

Nginx can also be used to serve static content. This blog is an example of static content copied to an nginx container. The entire site and nginx software is only a ~12 MB container image file.

In the homelab, you can set up nginx along with any other web application to either direct traffic to a different server or use it to bootstrap HTTPS encryption onto a service that otherwise does not use SSL/TLS certificates. One use case in my homelab is to install nginx and grafana loki to collect logs from other systems. Check out [a previous post][6] to see more about grafana loki. By default the loki service does not use HTTPS so by adding an nginx reverse proxy, you can ensure that all logs are encrypted in transit over the network and the only plain text communication is on the host where nginx and loki run.

 [1]: https://en.wikipedia.org/wiki/Reverse_proxy
 [2]: http://nginx.org
 [3]: https://getfedora.org/
 [4]: https://en.wikipedia.org/wiki/Red_Hat_Enterprise_Linux
 [5]: /posts/containers/
 [6]: /posts/loki-homelab-logging/
