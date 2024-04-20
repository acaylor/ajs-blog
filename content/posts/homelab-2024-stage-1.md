---
title: Homelab, 2024 stage 1 Networking 
author: aj
date: 2024-04-20
categories:
  - Homelab
tags:
  - homelab
---

## Stage 1 Networking

The backbone of the homelab will be the Network. In a US residential property, there will be a commercial telecommunications company that provides connection to the internet. This will vary based on where you live in the world.

Once you have access to the internet, you need to connect your devices to a private network that shares access to the internet through your gateway.

Private networks refer to networks that are restricted in access, typically within a specific organization, such as a business, educational institution, or government agency. These networks are designed to be accessed only by authorized users or devices, offering a higher level of security compared to public networks like the internet. Most people do not realize that their internet service provider sets up a private network for them. For a homelab, you control the network rather than a business or other institution. Here are the basics:

- **Access Control**: Access to a private network is restricted to authorized users or devices. This is typically enforced through authentication mechanisms such as usernames and passwords, digital certificates, or biometric authentication. Additionally, firewalls and other security measures are often employed to prevent unauthorized access. Even the gateway/router that your internet service provider gives you will use a firewall by default.

- **Security**: Security is a primary concern in private networks. Various security measures are implemented to protect the network from unauthorized access. This may include encryption, intrusion detection/prevention systems, virtual private networks (VPNs), and regular security audits. Even if you do not store sensitive information in your lab, you likely do not want anyone in the world to access your network much like your private home.

- **Infrastructure**: Private networks can be built using various networking technologies, including Ethernet, Wi-Fi, and fiber optics. These networks may include routers, switches, access points, and other network devices to facilitate communication between devices.

### Network infrastructure

For my homelab and home network I will be using Ubiquiti Networks equipment in addition to what my internet service provider installs.

I have been working remotely for my career since 2020. I also live in a house and want to ensure the house maintains a security system and monitors for emergencies such as fire and flooding. 

My internet access is provided by two providers. First provider is through copper coax (known as "cable" sometimes in the USA) and includes cellular LTE backup connection. Second provider is through satellite for access when there is no power in the neighborhood and potentially no LTE connection. I live in a mountainous region that experiences high winds, hail, and snow throughout the year.

![homelab_network_2024](/images/homelab_network_2024.png)

This is a basic network diagram.

### Network Devices

![homelab_network_devices_2024](/images/homelab_network_devices_2024.png)

This is a diagram showing network devices that support the infrastructure.
