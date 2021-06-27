---
title: Getting started in the homelab
author: aj
date: 2021-06-27T10:17:52-04:00

categories:
  - Homelab
tags:
  - homelab
  - pi-hole
  - raspberry pi

---
This post is focused on where I got started with my [homelab][1] many years ago. My lab started with a [Raspberry Pi Model B+][2] in 2014. I installed [Raspbian][3] and hooked up a small monitor and battery and had a mobile Linux station. After upgrading to a beefier “server” system in 2017 I decided to repurpose that Pi into a network-wide ad blocker. This was accomplished with the [Pi-hole][4] open-source project. This software filters out advertisements by acting as your network’s [DNS server][5] and will send DNS requests to known advertising domains to [/dev/null][6] or a DNS [blackhole][7].

## Installing pi-hole

There are multiple ways to install pi-hole and multiple platforms where you can install. Whether you install on a physical system or a virtual machine or a container, you will use pi-hole as your network DNS server.

I will be installing pi-hole on a Raspberry Pi as I have used the same Pi for years and the whole setup is simplified with a [bash script][8] written by the maintainers of the pi-hole project.

### Installing with Git and bash

I will clone the project&#8217;s source repository and then run the installation script from my copy of the repo.

```bash
git clone --depth 1 https://github.com/pi-hole/pi-hole.git
cd "pi-hole/automated install/”
sudo bash basic-install.sh
```

There are other options if you [follow the official documentation][9].

During the installation, you will want to pick your upstream DNS provider. This is where pi-hole will look for DNS requests that are not on the block list. I have taken a slightly different approach and will be configuring cloudflared on my Pi in order to leverage DNS over HTTPS which will encrypt DNS requests to the upstream DNS server. Since I will be doing that, during the pi-hole installation I select `127.0.0.1#5053` as my upstream DNS provider which is another way to direct traffic to your local system through the l[oopback network interface][10].

#### Next you must configure your network to use Pi-hole

Once you have installed the pi-hole software ensure that you open the proper firewall ports for clients to send DNS requests to your pi-hole system. On Raspbian, I am using [UFW][11] and I recommend you enable this and then open the following ports to use pi-hole. You can skip port 80 if you do not want to utilize the web interface.

```bash
# Run as root or prefix with sudo
ufw enable
ufw allow 80/tcp
ufw allow 53/tcp
ufw allow 53/udp
ufw allow 67/tcp
ufw allow 67/udp
```

On most home networks your router would utilize [DHCP][12] to handle network clients. You will need to [configure your router][13] to offer the pi-hole as the DNS server for DHCP clients.

### Configuring DNS over HTTPS

After you configure your router to point clients to your pi-hole, you are good to go but if you would like to encrypt your DNS requests, you can use a DNS provider like Cloudflare to contact their public DNS server over HTTPS.

There is a [good guide on the official documentation][14] on how to configure DNS over HTTPS with pi-hole and cloudflared. Stay tuned for a future post where we can automate that installation.

 [1]: https://www.reddit.com/r/homelab/
 [2]: https://en.wikipedia.org/wiki/Raspberry_Pi#History
 [3]: https://en.wikipedia.org/wiki/Raspberry_Pi_OS#Release_history
 [4]: https://pi-hole.net/
 [5]: https://en.wikipedia.org/wiki/Name_server
 [6]: https://en.wikipedia.org/wiki/Null_device
 [7]: https://en.wikipedia.org/wiki/Black_hole
 [8]: https://www.gnu.org/software/bash/
 [9]: https://docs.pi-hole.net/main/prerequisites/
 [10]: https://en.wikipedia.org/wiki/Localhost
 [11]: https://www.linux.com/learn/introduction-uncomplicated-firewall-ufw
 [12]: https://en.wikipedia.org/wiki/Dynamic_Host_Configuration_Protocol
 [13]: https://discourse.pi-hole.net/t/how-do-i-configure-my-devices-to-use-pi-hole-as-their-dns-server/245
 [14]: https://docs.pi-hole.net/guides/dns/cloudflared/