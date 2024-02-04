---
title: Bridge home networks with Wireguard
author: aj
date: 2024-02-03
categories:
  - Homelab
tags:
  - wireguard
  - homelab
---

## Remote site project

I am moving but will not be moving in to the new place for at least several weeks. That is what prompted this project. Since I will not be on the property, I wanted to set up some Wi-Fi enabled security cameras until I can move all of my homelab to the new location.

### Project description

This project will involve setting up a "remote site" or "edge" location (which is really the house where I am moving).

* This site will have internet access through a 4G LTE mobile hotspot that is connected to a Wi-Fi router.
  * Once ready, the ISP at the new address will be used as the internet gateway and the 4G hotspot can serve as fail-over internet gateway.
* The Wi-Fi router is configured as a client of the mobile hotspot.
	* Wi-Fi router: [Beryl AX (GL-MT3000)](https://www.gl-inet.com/products/gl-mt3000/)
	* hotspot: [Solis Lite](https://soliswifi.co/pages/solis-lite) mobile Wi-Fi hotspot
* The Wi-Fi router is a VPN client for the primary homelab network.
	* VPN software: Wireguard server in homelab

I have been using a Wireguard server as my VPN for several years. If you are not familiar with Wireguard, check out [a previous post](/posts/wireguard/) to get started and set up a VPN server.

#### Setup

Not much to report. Each device included as usb type C cable and the Beryl included a power adapter with North American and a few European power connectors. Each device had credentials printed on the bottom of the device with an SSID and passphrase to access a Wi-Fi network.

The hotspot requires that you download a mobile app which includes 1 GB per month of free data worldwide. You can use the app to purchase additional data in various increments of time and data usage. This is not a hotspot I would recommend for any type of business, I am a home user and the sole user of the hotspot. I hope to be using the hotspot when traveling internationally so this experiment feels less like a waste of money.

### solis lite

This is a hockey puck sized mobile hotspot capable of international data usage. It includes 1GB per month for free and offers pay by usage through their mobile phone app.

![solis_lite](/images/solis.jpg)

### Beryl AX Wi-Fi 6 router

![beryl_6_router](/images/beryl_6_router.png)

The "travel" router uses [openwrt](https://openwrt.org/) software and was configurable from a web interface. This interface does not use HTTPS so I recommend configuring it offline with only your workstation/laptop connected directly to avoid sending sensitive configuration data in plain text over that network.

Once logged into openWRT, it was simple to set the router to Wi-Fi [repeater mode](https://docs.gl-inet.com/router/en/4/interface_guide/internet_repeater/) and connect it to the mobile hotspot using the credentials printed on the bottom of the hotspot.

#### Wireguard client setup

The documentation from the vendor includes instructions for configuring a Wireguard VPN <https://docs.gl-inet.com/router/en/4/interface_guide/wireguard_client/#setup-wireguard-client>

When setting up a Wireguard server, if following my [previous post](/posts/wireguard/), there should be a peer .conf file based on the number of `PEERS` are configured as an environment variable. One of these conf files can be used to configure the Wi-Fi router. You can upload the peer.conf file if it is on your local machine or enter it into the web console:

![wireguard_config_example](/images/wireguard_config_example.png)

Make sure the `Endpoint` address points to your Wireguard VPN server. If using a home network, you want to port-forward the Wireguard port `51820` on your home network which will vary based on what type of router or gateway you use in your network. You need to enter the IP or DNS hostname that points to the IP of the gateway that is port-forwarding to the Wireguard server.

#### Multi WAN

This router supports [multi-WAN](https://docs.gl-inet.com/router/en/4/interface_guide/multi-wan/). You can configure the router with multiple Internet access methods, so that when one type of Internet access is not available, it can automatically fail-over to another type of Internet access.

When connecting the WAN ethernet port to an ISP, the router defaults to using that for Internet access. The hotspot remains as a WAN source in repeater mode but that is no the default route to the internet.

## Results

The Wi-Fi router has been working for several weeks now and all Wi-Fi security cameras and the smart thermostat in the new location are working without issue. The internet has not performed any failover to 4G LTE but the openWRT interface reports that the hotspot is still available as an internet source.

Once I have moved to the new house, the hotspot and portable Wi-Fi router can be moved to my old address to provide internet for security cameras until moved out completely from the old address.