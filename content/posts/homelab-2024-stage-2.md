---
title: Homelab, 2024 stage 2 
author: aj
date: 2024-04-21
categories:
  - Homelab
tags:
  - homelab
  - security
---

## Stage 2 Security  

The next stage of setting up my homelab will include ensuring that my network is secure and I have a mechanism for monitoring my systems for malicious software or unauthorized access. I will be sharing my guidelines as I am not comfortable showing my own firewall rules and configuration.

### Network Security

Network security begins at your gateway to the internet. Your internet service provider (ISP) will assign a "public" or internet accessible IP address that will be configured on a network interface of the gateway/router in your network. You want to ensure that only authorized connections are allowed inbound to your public IP address as anyone who knows your IP address can attempt to open connections to your gateway.

#### Find your public IP address

If you have a system with a terminal or web browser, you can see what your public, internet facing IP address is by visiting the following URL: <http://ipv4.icanhazip.com>

```shell
curl ipv4.icanhazip.com
```

#### Securing your network

To secure your gateway, you want to configure a firewall on your gateway. If you are using a gateway/router provided by an internet service provider, typically the firewall is already enabled.

- *firewall*: a system that monitors and controls incoming and outgoing IP traffic between a trusted network and a potentially untrusted network. This is typically implemented as software on a system acting as a network gateway.
- *gateway*: a system used in telecommunications networking that routes network traffic from one discrete network to another. Can be implemented as software or as an embedded hardware system.

If you are interested in setting up a dedicated firewall system, check out projects such as [pfsense](https://www.pfsense.org/) and [opnsense](https://opnsense.org/). If you go with Ubiquiti networks like I have, they provide documentation on how to configure your network VLANs and firewalls.

Unless you know you need to allow certain network traffic from the internet inbound to your network (this is not the same as you accessing the internet from a mobile device or personal computer), you should try and block all inbound traffic, including ICMP (ping) requests. If an attacker cannot ping your address or connect to any TCP ports, they will be unlikely to waste time attacking your network.

### Network monitoring

My network is separated into 3 VLANs. My homelab devices and software will only reside within a trusted VLAN. The only devices that I trust to configure on this VLAN must meet certain criteria to monitor and ensure they remain secure.

#### Trusted VLAN

Any device that has a network connection must provide access to monitor the following:

- Application and System logs: any software application or software running as an operating system must provide access to log output. Ideally I can access these logs from a central location.
- Application and System metrics: any software application or software running as an operating system should provide access to run-time metrics or telemetry to monitor the health of the application and how much cpu, memory, storage, etc are consumed during run-time.
- System auditing: any system with a network connection must provide some type of audit log to see who performed a change on the system whether it was a human or a software application.
- Vulnerabilities: any IP address in use on my network must be scanned for commonly known vulnerabilities and should indicate how to address the vulnerability.

Some nice to have monitoring data but not critical for a trusted VLAN:

- Configuration drift: When you configure a software application, you should do so with a file or source code that can be version controlled and compared with the current run-time configuration.
- Configuration security baseline: Certain operating systems have baseline security configuration guidelines published by security researchers. In a perfect world, your systems should adhere to these security baseline configurations. Sometimes a commercial network device does not provide access for the user to alter configuration.
- software inventory: Also in a perfect world, you should have access to an inventory of all the software that is running on your systems and compare that to the latest available version.

#### Untrusted VLANs

Most mobile devices such as Android and iOS phones have proprietary software running that I cannot monitor so these devices are typically untrusted within my network. Even my device is untrusted so I use a VPN client to tunnel into the lab network only when required to do so.

All IoT or "smart home" devices are usually closed off and do not provide any monitoring or auditing data so I do not consider them as devices to add to a trusted VLAN. Usually they are always making API calls to some address on the internet. If you are curious on how to monitor those, set them up on a certain VLAN and use a tool such as Wireshark to monitor the network traffic coming from the IoT devices. You can also check your DNS server's query logs to see what DNS queries are made by the IoT devices.


### Check your IP address for open ports

If you have access to a *nix system outside your network, you can run the `nmap` program to check for "holes" in your firewall also known as open ports. This is an open source program that you can run on most operating systems. If you are on windows or a *nix system with a desktop environment, you can run `zenmap` which is a graphical interface for `namp`. Check out the official site <https://nmap.org/> to download and read the documentation.

I would recommend running this from outside your network. If you have a mobile hotspot and a laptop for example, you can run the scan from the hotspot attempting to connect to your public IP address at home. You can also run `nmap` from a virtual machine running in the cloud. I ran the example below from a free-tier AWS ec2 instance.

#### CLI example

```shell
sudo nmap -A -T4 $your_ip_address
```

The `-A` argument enables OS detection, traceroute, and script scanning. The `-T4` argument speeds up execution. and then you provide the IP address or hostname of your network. Replace `$your_ip_address` with your own public IP address. If you have set up a firewall or expect one to be in place, there should be minimal information returned by `namp`.

```text
Starting Nmap 7.80 ( https://nmap.org ) at 2024-04-21 18:21 UTC
Note: Host seems down. If it is really up, but blocking our ping probes, try -Pn
Nmap done: 1 IP address (0 hosts up) scanned in 2.69 seconds
```

If no information is returned, you can try to remove the `-A` argument and instead run `-Pn`. This tells `nmap` to scan anyways even though the address is not replying to ping or other basic traffic. If no host discovery options are given, it sends an ICMP echo request, a TCP SYN packet to port `443`, a TCP ACK packet to port `80`, and an ICMP timestamp request. Unless you have one of those enabled inbound to your firewall, it should also not respond to ping like in my case.

Running `sudo nmap -Pn` against your IP will skip the ping process. In my case, `nmap` reported that all scanned ports were filtered. So likely my firewall saw the incoming connection and dropped the packet.

```text
Starting Nmap 7.80 ( https://nmap.org ) at 2024-04-21 18:21 UTC
Nmap scan report for 0.0.0.0
Host is up.
All 1000 scanned ports on 0.0.0.0 are filtered

Nmap done: 1 IP address (1 host up) scanned in 101.17 seconds
```

Notice how the scan took over 100 seconds to complete. When you have a firewall configured, inbound traffic will be dropped if it is not permitted by the firewall rules. When traffic is dropped, `nmap` has a difficult time determining if the connection is unstable or whether the traffic is being dropped by a firewall. Threat actors are unlikely to target your network if they cannot see your address responding to pings or port scans.