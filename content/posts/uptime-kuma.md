---
title: Configuring a status page in the cloud with uptime kuma
author: aj
type: post
date: 2022-03-13
categories:
  - cloud
tags:
  - uptime kuma
  - cloud
  - containers
---

[Uptime kuma][1] is an open-source tool for monitoring uptime for

- HTTP(s)
- TCP
- HTTP(s) Keyword
- Ping
- DNS Record
- Push
- Steam Game Server

There was [a previous post][2] here about setting a up virtual server in the cloud to run similar open-source software statping. Check out that post to create a virtual server in AWS. Statping is not maintained and uptime kuma is already more popular in 2022.

## Install with Docker

Uptime kuma can run as a standalone container but this example will include an additonal container to handle TLS encryption and rotating the TLS certificates.

### Compose template

```yaml
---
version: "2.1"
services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: uptime-kuma
    volumes:
      - uptime_data:/app/data
    restart: unless-stopped
  swag:
    image: ghcr.io/linuxserver/swag
    container_name: swag
    cap_add:
      - NET_ADMIN
    environment:
      - PUID=1100
      - PGID=1100
      - TZ=America/New_York
      - URL=status.example.com
      - VALIDATION=http
    volumes:
      - swag_config:/config
    ports:
      - 443:443
      - 80:80
    restart: unless-stopped
volumes:
  swag_config: {}
  uptime_data: {}
```

### Upgrading to new versions

Run these commands in the directory with the `docker-compose.yml` template:

```bash
docker-compose pull
docker-compose up -d
```

## Configure proxy

SWAG image comes with a list of preset reverse proxy configs for popular apps and services. This container "Secure web application gateway" is maintained by the folks at [linuxserver.io][3]. There is a template for uptime-kuma but it uses the subdomain method which is not desired on the resource limited AWS instance. Create a new file in the `/config/nginx/proxy-confs` directory.

You can open a shell into swag container:

```bash
docker exec -it swag /bin/bash
```

Once in the container shell:

```bash
cd /config/nginx/proxy-confs
nano uptime-kuma.subfolder.conf
```

```conf
location
- {
    # enable the next two lines for http auth
    #auth_basic "Restricted";
    #auth_basic_user_file /config/nginx/.htpasswd;

    # enable the next two lines for ldap auth, also customize and enable ldap.conf in the default conf
    #auth_request /auth;
    #error_page 401 =200 /ldaplogin;

    # enable for Authelia, also enable authelia-server.conf in the default site config
    #include /config/nginx/authelia-location.conf;

    include /config/nginx/proxy.conf;
    include /config/nginx/resolver.conf;
    set $upstream_app uptime-kuma;
    set $upstream_port 3001;
    set $upstream_proto http;
    proxy_pass $upstream_proto://$upstream_app:$upstream_port;

}
```

Inside that conf file, the location is set to `/` {, which will cause an issue because there is already a location defined for `/` inside the default site config for SWAG.

So we need to edit the default site config at `/config/nginx/site-confs/default` and comment out the location block for `/` inside our main server block so it reads:

```conf
    #location
    #{
    #    try_files $uri $uri/ /index.html /index.php?$args =404;
    #}
```

Now nginx will use `/` base URL for the proxy config only.

Restart SWAG container:

```bash
docker restart swag
```

Now proceed to the URL of the system with the containers and uptime kuma should be in setup mode. Configure a new user and password and you will be taken to the dashboard. Sites can be added by selecting "Add New Monitor"

![uptime_kuma_add](/images/uptime_kuma_add.png)

To monitor a website all you need is to fill out the "URL" text box and scroll down and select "Save".

The dashboard requires authentication but the status page will be publicly accesible:

![uptime_kuma](/images/uptime_kuma.png)

 [1]: https://github.com/louislam/uptime-kuma
 [2]: /posts/statping/
 [3]: https://linuxserver.io/
