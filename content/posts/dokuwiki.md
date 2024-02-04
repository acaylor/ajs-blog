---
title: Dokuwiki homelab wiki
author: aj
date: 2021-12-04
updated: 2024-02-03
categories:
  - Utilities
tags:
  - dokuwiki
  - wiki
  - tools
  - containers
  - docker

---

[Dokuwiki][1] is an open-source [wiki][2] software that isn't too fancy, perfect for documenting a personal homelab. This software does not require a database and is easy to host and backup running as a container.

## Installing and configuring Dokuwiki with Docker

In order to run the Dokuwiki server, I will be using a docker container inside of a virtual machine. In order to keep this post concise, please check out [my previous post][3] on docker if you are not familiar with the technology. I also have [a post][4] on setting up virtual machines and [yet another post][5] on setting up a dedicated system to run virtual machines with proxmox.

#### Requirements

In order to proceed, you must have a suitable Linux System with docker and docker-compose installed. See above for posts that will help you meet these requirements.

The container image that will be used here is created by the [LinuxServer.io][6] team who keep up with regular security updates and publish images that are not affected by the rate limits of the public Docker Hub.

### Dokuwiki template

In order to preserve the configuration of the Dokuwiki server that is running in a docker container, we can user a `docker-compose` template. Save the following as a `docker-compose.yml` file in a location that you will remember and that is not readable by any user.

```yaml
---
version: "2.1"
services:
  dokuwiki:
    image: lscr.io/linuxserver/dokuwiki
    container_name: dokuwiki
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York # Replace with your timezone
    volumes:
      - dokuwiki_config:/config
    ports:
      - 80:80
      - 443:443 #optional
    restart: unless-stopped
volumes:
  dokuwiki_config: {}
```

Once this template has been saved, the Dokuwiki server can be started with the following command:

```bash
docker compose up -d
```

### Upgrading to new versions

Run these commands in the directory with the `docker-compose.yml` template:

```bash
docker compose pull
docker compose up -d
```

### Port forwarding

Now in order to connect to your Dokuwiki server from the internet, you must open the associated port in your firewall and if on a consumer ISP, the best bet is to [port forward][7] the Dokuwiki port to your Internet gateway or router provided by your ISP.

In the example above, the server was configured to use port **80/tcp**

### Proxy

Another way to route traffic to the wiki and use multiple web applications behind a single ip address is to use a reverse proxy.

For more information on how to set up a reverse proxy server, see [a previous post][8].


## Setting up Wiki

Once the container is running, navigate to the URL in your browser where you forwarded the connection:

```
http://$IP:$PORT/install.php
```

![dokuwiki_install](/images/dokuwiki_install.png)

### Once you have completed setup

#### First, restart the container

```bash
docker compose restart
```

#### Next, log in as an superuser and configure nice URLs

1. login as the superuser created in setup and 
2. set "Use nice URLs" in the `admin/Configuration` Settings panel to `.htaccess` 
3. Check the box: Use slash as namespace separator in URLs to enable nice URLs. 

![wiki_config](/images/wiki_config.png)

By default, DokuWiki does no URL rewriting, resulting in URLs like this:

`http://example.com/doku.php?id=page`

These URLs are considered ugly and are not indexed well by some search engines. 

For more details on configurations possible, check out the [Dokuwiki wiki][9].

 [1]: https://www.dokuwiki.org/dokuwiki/
 [2]: https://www.dictionary.com/browse/wikis
 [3]: /posts/containers/
 [4]: /posts/getting-started-with-virtual-machines/
 [5]: /posts/proxmox-installation/
 [6]: https://linuxserver.io
 [7]: https://portforward.com/
 [8]: /posts/pi-proxy/
 [9]: https://www.dokuwiki.org/dokuwiki/