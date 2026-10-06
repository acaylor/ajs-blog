---
title: 'Tuning AdGuard Home DNS across homelab VLANs'
author: aj
date: 2026-10-05
description: 'Benchmarking my three AdGuard Home servers from two VLANs turned up a shared rate limit. A small configuration change removed the timeouts.'
categories:
  - Homelab
  - Networking
tags:
  - adguard
  - dns
  - networking
  - homelab
---

I run three [AdGuard Home][1] servers in my homelab: two on physical systems and one in a virtual machine. Having more than one means DNS keeps working when I take a host down for maintenance. I wanted to find out whether the setup could also make DNS faster across my VLANs, or whether I needed something like a resolver on every VLAN.

I took some measurements using commands like `dig` and found that cached answers were already fast, so there was not an obvious performance gap. What they did turn up was a rate limit shared by every client on the same subnet, which was silently dropping queries during short bursts. Raising the limit and applying it per client removed the timeouts in a repeat test.

I replaced the real hostnames and addresses below with generic examples. The measurements are from the actual tests, which I ran on October 1, 2026.

## My existing setup

I set up AdGuard Home for filtering and local DNS records in [a previous post][2]. [adguardhome-sync][3] keeps the three instances configured the same way.

| Example server | Example address | Role                 |
| -------------- | --------------- | -------------------- |
| `dns-a`        | `192.168.10.53` | Replica              |
| `dns-b`        | `192.168.10.54` | Replica; runs sync   |
| `dns-c`        | `192.168.10.55` | Configuration source |

My UniFi gateway(The router/gateway for my network) hands out two of the resolver addresses through DHCP. My Proxmox hosts are configured separately and use the third resolver. Sync runs every two hours and copies the source's configuration to both replicas. Upstream DNS queries are load balanced across Quad9, Cloudflare, and Google over TLS.

It is worth being clear about what this setup does not do. Sync keeps settings and local records consistent, but each server still has its own cache. Advertising two DNS addresses through DHCP also leaves it up to each client to pick a server and decide when to retry. That gives me redundancy, but not a managed failover pair.

## Measuring from multiple VLANs

I tested from two clients: a Linux system on the same subnet as the resolvers, and a wired Mac on a second VLAN. In this post those networks are `192.168.10.0/24` and `192.168.20.0/24`.

Each server was queried with `dig`. That measures the resolver itself, rather than the operating system's choice of DNS server or its local cache. I tested over both UDP and TCP.

For a quick check, query a public name twice, then a local record, then the public name again over TCP:

```bash
dig @192.168.10.53 example.com A +time=2 +tries=1 +stats
dig @192.168.10.53 example.com A +time=2 +tries=1 +stats
dig @192.168.10.53 service.home.arpa A +time=2 +tries=1 +stats
dig @192.168.10.53 example.com A +tcp +time=2 +tries=1 +stats
```

To perform a similar test of your own, swap `service.home.arpa` for an internal name that exists in your own configuration, and repeat the checks against each resolver from each network.

The paced run sent 438 queries across the two clients and three servers, with a 150 ms pause between queries. Every query succeeded. These are the median response times for cached UDP queries:

| Resolver | Same VLAN | Routed VLAN |
| -------- | --------: | ----------: |
| `dns-a`  |      3 ms |        4 ms |
| `dns-b`  |      1 ms |        1 ms |
| `dns-c`  |      2 ms |        2 ms |

Internal names had a median of 0–2 ms, and the TCP queries succeeded as well. A 0 ms result means the response came back faster than `dig`'s millisecond resolution.

Routing between VLANs added no meaningful latency in this sample. Putting a resolver on every VLAN would have been more work without fixing a problem.

## Burst Test

A separate test sent 30 UDP queries back to back to each server from each client, with no pause. Every one of the six client and server pairs had exactly one timeout: 6 failures out of 180 queries.

I used a two-second timeout with a single attempt, so each dropped response showed up as a two-second wait. Real applications may retry differently, but waits like that are exactly what makes a fast DNS resolver feel slow.

I checked the configuration and the running API on all three servers. They had the same settings:

```yaml
dns:
  ratelimit: 20
  ratelimit_subnet_len_ipv4: 24
  cache_enabled: true
  cache_size: 4194304
```

`ratelimit_subnet_len_ipv4: 24` groups IPv4 clients by `/24` subnet for rate limiting. That means the limit of 20 queries per second was not per client. Every client on the same network shared it. One host on my network had a rate-limit exemption, but neither test client was exempt. Both of these values are AdGuard Home's defaults, so a fresh install has the same limit.

The [AdGuard Home configuration reference][4] says that queries above the rate limit are silently dropped.

## Options I considered

There were several ways to change the setup, and each one solves a different problem:

- **Rate limit and cache size:** small changes to the servers I already had. The rate limit matched the burst failures, so this was the obvious first step.
- **Parallel upstream requests:** send each query to several upstream providers at once, which can cut some cache-miss delays. It also increases upstream traffic. I kept the existing load balancing.
- **Optimistic caching:** answer from an expired cache entry while refreshing it in the background. That can reduce waits, but it can also return stale addresses. I left it disabled.
- **A [Keepalived][5] virtual IP:** move one stable DNS address between the healthy physical servers. This could improve failover, but it would not make ordinary lookups any faster.
- **[dnsdist][6]:** put a health-checked pool in front of all three resolvers. That adds another layer that needs its own redundancy, and it takes care to make sure the resolvers still see which client sent each query.

Based on findings I wanted to try tuning the servers I had before adding more infrastructure.

### Config changes

I made the changes on the through the AdGuard Home API. I saved the previous settings first so I could roll back, then ran adguardhome-sync once to push the changes to all servers instead of waiting for the next scheduled run.

| Setting       | Before         | After             |
| ------------- | -------------- | ----------------- |
| Rate limit    | 20 queries/sec | 100 queries/sec   |
| IPv4 grouping | `/24`          | `/32`, per client |
| DNS cache     | 4 MiB          | 16 MiB            |

The relevant part of the configuration now looks like this:

```yaml
dns:
  ratelimit: 100
  ratelimit_subnet_len_ipv4: 32
  cache_enabled: true
  cache_size: 16777216
```

This is a fragment, not a full configuration file. I used the API so the running service would write the changes itself. If you edit `AdGuardHome.yaml` directly, stop AdGuard Home first. The [configuration reference][4] warns that the running program will overwrite any changes made to the file while it is running.

100 queries per second is a starting point for my network, not a recommended value for everyone. With `/32` grouping, each IPv4 client gets its own budget instead of sharing one with its whole subnet. If a proxy forwards queries so they all appear to come from one address, the clients behind it still share that address's budget.

I left IPv6 grouping at `/56`, since this change was only about IPv4. Upstreams, TTL overrides, and optimistic caching stayed as they were, and I did not restart any of the DNS containers.

## Verifying the results

The API on all three servers reported the new rate limit, `/32` grouping, and 16 MiB cache, and the sync run completed successfully.

Then I repeated the same 30-query burst against each resolver from both VLANs:

| Test          | Successful queries | Timeouts |
| ------------- | -----------------: | -------: |
| Before tuning |            174/180 |        6 |
| After tuning  |            180/180 |        0 |

That supports the rate limit as the cause of the burst timeouts. It does not show that the larger cache made anything faster. I did not measure cache pressure or test that change on its own.

I also did not flush any caches between runs. Public names could already be cached the first time a run queried them, and the two clients could warm the cache for each other. So the timings are not a controlled comparison of uncached lookups. Failover during a server outage was also outside the scope of this test.

## Closing thoughts

I kept the three-server layout. Cached answers were already fast, so the useful improvement was getting rid of the two-second waits when a client sends a burst of queries. The fix was two lines of configuration, but I would not have found it with the paced test alone, which said everything was fine. The burst test revealed the main limitation.

I have a feeling I will continue to iterate on how I manage my DNS servers.

## Sources

- [AdGuard Home][1]
- [adguardhome-sync][3]
- [AdGuard Home configuration reference][4]
- [Keepalived quick start][5]
- [Configuring downstream servers in dnsdist][6]

[1]: https://github.com/AdguardTeam/AdGuardHome
[2]: /posts/adguard-home/
[3]: https://github.com/bakito/adguardhome-sync
[4]: https://adguard-dns.io/kb/adguard-home/configuration/
[5]: https://www.keepalived.org/documentation/user-guide/quick-start/
[6]: https://www.dnsdist.org/guides/downstreams.html
