---
title: Using LXC
author: aj
date: 2021-10-04

categories:
  - Homelab
  - Proxmox
  - Virtual Machines
tags:
  - containers
  - homelab
  - lxc
  - proxmox

---
[LXC][1] is a system container manager. It offers a user experience similar to virtual machines but using Linux containers instead. LXC containers will share the kernel of the host operating system. If you are already using Proxmox, you can create LXC containers on Proxmox nodes and with the web UI. If you would like to set up Proxmox as a platform to host your virtual machines and containers, check out [my previous post][4] about installing Proxmox.

## LXC system templates in Proxmox

Container images provided by Proxmox can be downloaded by opening a compatible storage volume (such as &#8220;local&#8221;) > Select &#8220;CT Templates&#8221; > &#8220;Templates&#8221;.

The equivalent operation through the shell is to run the following commands:

```bash
pveam update
pveam available --section system
# pveam download <storage_volume> <template>.tar.gz
pveam download local debian-10.0-standard_10.0-1_amd64.tar.gz
```

## Setting up a game server &#8211; Valheim

Valheim is a survival and sandbox game in development at Iron Gate Studio and is published by Coffee Stain Studios.

I will be using a Debian 10 container to run the Valheim server. See above for the command to download the latest Debian template. You can use 999 or another number to label the new container.

```bash
pct create 999 local:vztmpl/debian-10-standard_10.7-1_amd64.tar.gz --hostname valheim --memory 4096 --ostype debian --storage local-lvm --timezone host
# When that is complete
lxc-attach 999
```

The folks over at [Linux Game Server Managers][2] have scripts set up to create and manage game servers on Linux that are fully configurable. They have done the work of finding all of the software dependencies.

```bash
# Install dependencies
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install curl wget file tar bzip2 gzip unzip bsdmainutils python util-linux ca-certificates binutils bc jq tmux netcat lib32gcc1 lib32stdc++6
# Create a non root user
adduser vhserver
passwd vhserver
su - vhserver
# Download the LGSM installation script and execute
wget -O linuxgsm.sh https://linuxgsm.sh && 
chmod +x linuxgsm.sh && 
bash linuxgsm.sh vhserver

# Run the vhserver installation
./vhserver install
# Once the install is done start the server
./vhserver start
```

Valheim will be running on several ports to connect to the Steam network and you will need to [forward these ports to your public IP address][3] if you want others to connect. If you are using a firewall on your LXC container (and you should be) you will also need to open these ports for inbound traffic to the container running this server. Here are the potentially required ports when making a steam public server:

* **TCP**: 2456-2457,27015-27030,27036-27037
* **UDP**: 2456-2457,4380,27000-27031,27036

It may be possible to get away with only ports 2456/udp and 2457/udp if you would like to directly connect to the server.

Now it is time to set up some cron jobs to keep the server running and automatically updated.

```bash
crontab -e
*/5 * * * * /home/vhserver/vhserver monitor > /dev/null 2>&1
0 0 * * * /home/vhserver/vhserver update > /dev/null 2>&1
0 0 * * 0 /home/vhserver/vhserver update-lgsm > /dev/null 2>&1
```

This will verify the server is running every 5 minutes. The server will check for updates at midnight local time and the LGSM client will check for updates at midnight on the first day of the week.

### Direct Connect to Valheim server

You can directly connect to a server in-game through the **Join Game** tab by pressing the **Join IP** button.

You can also add a server to your steam server favorites. To access the steam server list: 

1. Navigate to the top left of the steam window  View->Servers, 
2. In the new window press "Add A Server". 
3. Use the command `./vhserver details` to find the current query port, the default is 2457.

### Change the name of your server

You can change the name of your game server by altering the LinuxGSM config. These files are found in `lgsm/config-lgsm/gameserver`

See the [official documentation][5] for details of the configuration.

The configuration that I used was `lgsm/config-lgsm/vhserver/vhserver.cfg`

```
servername="Your_Server"
displayip="Your_server_ip"
```

 [1]: https://linuxcontainers.org/
 [2]: https://linuxgsm.com/lgsm/vhserver/
 [3]: https://portforward.com/valheim/
 [4]: /posts/proxmox-installation/
 [5]: https://docs.linuxgsm.com/configuration/linuxgsm-config