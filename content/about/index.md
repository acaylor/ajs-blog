---
title: About
author: aj
type: about
date: 2021-04-11T18:49:19+00:00
---

This site is a personal blog focused on software, technology, and [the cloud][1]. The main purpose of this blog is to share what technology I am working with at home.

### Author

![author](/images/whoami/whoami.png)

I am a Cloud Systems Engineer. I enjoy working with the latest technology in my homelab. This image was generated with AI DALLE.

### Homelab history

My “lab” began with the first model raspberry pi. I was in school at the time and made a version of the classic game Snake in Java. I compiled this into a jar and put it on the pi with an Apache web server so I could download it on other machines.

Then I set up a proxy tunnel to my network so I could access it from anywhere. Finally I realized how much stuff I could share using networking which led me to set up an actual NAS (Network Attached Storage). I set up Ubuntu with a SMB server and moved my stuff from the pi there. In school we used Java up until the end when I had a web dev class that was all asp.net. My first full stack app was a meal preparation app with a database of recipes. I hosted this on my server and presented it as my final capstone project at university. This was one of the first projects that I was able to use the tool `git` to collaborate with other people contributing code to the project. In that case it was folks from my capstone group in University.

Fast forward to when I actually have real jobs and money to get more equipment. I got a raspberry pi 3 and I started using pi-hole and then I scrapped everything to set everything up from scratch.

My first job in tech was a mix of Windows AD infrastructure but also a large fleet of Linux machines for HPC. At this point I set up a new lab all on a Dell poweredge r610 with ESXi and windows vms for an Active Directory lab.

My second job out of college was all Linux and every one after has been so in 2018 ish I switched to all proxmox hypervisors and truenas(used to be freenas) for NAS.

My next two jobs were all about kubernetes app deployment and so I set up Ubuntu vms with kubernetes installed.

Today my setup is like this:

1. UniFi UDM pro along with cameras and switches
2. Synology NAS 12 tb
3. Backup NAS 4 tb
4. 4 proxmox servers
5. 5 raspberry pis
6. Linux server with Nvidia GPU
7. M4 Mac mini

This uses a lot of power and I would likely not have this many servers without solar to offset the cost. No more TrueNAS I just use Ubuntu Linux and a Synology NAS.

At home though I am usually the only user of services which is why there may be a lack of tooling around Role Based Access Control. As a single user, I rely on a password/secret manager to keep credentials secure. I use Wireguard to access my systems remotely so the only port I have open is for a Wireguard VPN server.

### Contact me

You can reach out to the author through email: [ayyyj@icloud.com][2]

You can request to send me a message on Discord: `.ayyj`

#### Links

- GitHub: [https://github.com/acaylor][3]
- GitLab: [https://gitlab.com/acaylor][4]

[1]: https://en.wikipedia.org/wiki/Cloud_computing
[2]: mailto:ayyyj@icloud.com
[3]: https://github.com/acaylor
[4]: https://gitlab.com/acaylor
