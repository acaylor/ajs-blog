---
title: Using a Raspberry Pi as a reverse proxy
author: aj
date: 2021-10-10
updated: 2024-02-03
categories:
  - Homelab
  - Containers
  - Rasperry Pi
  - Linux
  - ansible
tags:
  - containers
  - docker
  - homelab
  - nginx proxy manager
  - raspberry pi
  - reverse proxy
  - pi
  - linux

---
 

I will be using another Raspberry Pi to serve as a [reverse proxy][4] for my network. With [Nginx Proxy manager][2], I can manage my proxy configurations in a web app. This application is a front end for [nginx][1] which is a very popular web server that also works for proxying TCP/IP connections and encrypting traffic.

## Installing Nginx Proxy Manager

I will be managing this software with docker. If you have not worked with docker before, I have a [blog post][9] about the basics of docker and installation methods. 

There is already an example docker-compose template on the official website that will make launching this application trivial. Not all container images are built to be compatible with the processor of the Raspberry Pi but this image is compatible. Make sure to choose passwords other than "PASSWORD" in your compose template. Save the following template as `docker-compose.yml` and I recommend not opening the file permissions of this template to the world i.e. `chmod 0640`

```yaml
version: "3"
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: always
    ports:
      # Public HTTP Port:
      - '80:80'
      # Public HTTPS Port:
      - '443:443'
      # Admin Web Port:
      - '81:81'
    environment:
      # These are the settings to access your db
      DB_MYSQL_HOST: "db"
      DB_MYSQL_PORT: 3306
      DB_MYSQL_USER: "npm"
      DB_MYSQL_PASSWORD: "PASSWORD"
      DB_MYSQL_NAME: "npm"
      # If you would rather use Sqlite uncomment this
      # and remove all DB_MYSQL_* lines above
      # DB_SQLITE_FILE: "/data/database.sqlite"
      # Uncomment this if IPv6 is not enabled on your host
      # DISABLE_IPV6: 'true'
    volumes:
      - proxy_conf_data:/data
      - proxy_cert_data:/etc/letsencrypt
    depends_on:
      - db
  db:
    image: 'jc21/mariadb-aria:latest'
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: 'DIFFERENT_PASSWORD'
      MYSQL_DATABASE: 'npm'
      MYSQL_USER: 'npm'
      MYSQL_PASSWORD: 'PASSWORD'
    volumes:
      - proxy_db_data:/var/lib/mysql
volumes:
  proxy_db_data: {}
  proxy_conf_data: {}
  proxy_cert_data: {}
```

Now the application can be launched with:

```shell
docker compose up -d
```

When your docker container is running, connect to it on port `81` for the admin interface. Enter the hostname / IP address of the Pi in your browser and the port number:

`http://docker-pi.local:81`

Default Admin User:

```
Email:    admin@example.com
Password: changeme
```

Immediately after logging in with this default user you will need to change the password.

### Upgrading to new versions

Run these commands in the directory with the `docker-compose.yml` template:

```shell
docker compose pull
docker compose up -d
```

## Install and configure Nginx Proxy manager with Ansible

I have created an Ansible [role][5] to automate this configuration. I have a [previous post][6] about Ansible, check that out for information about Ansible. The role includes other roles to install Docker if needed. When you run the role against a Linux system, Portainer and Nginx Proxy manager will be installed and configured with a cron job to handle updating containers to the latest versions. Check out [my previous post][7] for more information about Portainer.

To use this ansible role, create a `requirements.yml` file to pull the role from my [public Github repo][8]:

```yaml
- src: https://github.com/acaylor/docker_proxy_host
```

Create an ansible playbook to reference my role for execution `playbook.yml`:

```yaml
---
# target all inventory hosts, you could use inventory groups instead
- hosts: all
  # Many tasks here require root access
  become: yes
  vars:
    # password for nginx proxy manager database
    mysql_pw: "password"
    # password for root account nginx proxy manager database
    mysql_root_pw: "differentpassword"
    # This role will also configure iptables firewall
    # Below are tcp ports opened by the role
    firewall_allowed_tcp_ports:
    # Optional: allow SSH
      - "22"
    # Required: allow HTTP traffic
      - "80"
    # Optional: allow remote access to proxy manager interface
      - "81"
    # Required: allow HTTPS traffic
      - "443"
    # Below are udp ports opened by the role
    firewall_allowed_udp_ports:
    # Example: you can also open udp ports
      - ""
    pip_install_packages:
      - name: docker
  roles:
    - docker_proxy_host
```

You can create an inventory file to limit the scope of execution `proxyhosts.ini`:

```ini
[proxyhost]
examplehost.example.org
```

```shell
# Install role from requirements file
ansible-galaxy install -r requirements.yml
# Run the new playbook, use inventory of desired hosts, -K is to ask for become password
ansible-playbook playbook.yml -i proxyhosts.ini -K
```

## Setting up proxy addresses and SSL certificates

Now that the proxy manager is running, this system can be used to intercept and redirect HTTP traffic. Since my homelab uses a consumer Internet Service Provider, I only have one public IP address for my networks. I can forward traffic inbound to my public IP address to this Raspberry Pi onto the appropriate system on my networks. Nginx Proxy Manager can also request free TLS certificates from [Let's Encrypt][3] to encrypt incoming and outbound HTTP traffic.

 [1]: https://nginx.org/en/
 [2]: https://nginxproxymanager.com/
 [3]: https://letsencrypt.org/about/
 [4]: https://www.cloudflare.com/learning/cdn/glossary/reverse-proxy/
 [5]: https://docs.ansible.com/ansible/latest/user_guide/playbooks_reuse_roles.html
 [6]: /posts/ansible/
 [7]: /posts/portainer/
 [8]: https://github.com/acaylor/docker_proxy_host
 [9]: /posts/containers/