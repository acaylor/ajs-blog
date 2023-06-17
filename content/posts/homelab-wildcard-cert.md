---
title: Create a wildcard certificate
author: aj
date: 2023-06-17

categories:
  - Homelab
  - Networking
tags:
  - certificate
  - homelab

---

Today I will be sharing a method to obtain a wildcard TLS certificate for a domain that you control. A wildcard certificate is valid for any host in a domain that you control: `*.example.net`.

To issue wildcard certificates, you must have a DNS provider such as the AWS route53 service which is what I will be using. You can use any DNS provider manually but most providers provide an API that makes the process easier.

## Prerequisites

If you are totally lost right now, I recommend reading about [DNS][1] and [HTTPS][2] for some foundational knowledge around how websites and web applications connect and exchange information securely.

Before requesting a new wildcard certificate, you need to have a DNS domain that you own and can create new `TXT` type records. There are commercial companies that offer this service. Major public cloud providers such as Amazon Web Services (AWS) provide DNS management services which is what I will be leveraging today.

## acme.sh

In order to issue the certificate, you can leverage an open source project `acme.sh` which is a program entirely written in a Shell script so you can avoid installing more software onto your system.

### Download the script

You can directly download the `acme.sh` script but I recommend just cloning the [Git][3] repository to inspect the code before you run it.

```sh
git clone https://github.com/acmesh-official/acme.sh.git
```

You can run the script with an install flag from this new directory to copy it to your home directory which is also where the script will download your certificates.

```sh
cd ./acme.sh
./acme.sh --install -m my@example.com
```

Replace `m@example.com` with the email address you use for your DNS provider.

### Set up DNS API

Check the project's [wiki][4] to see if your DNS provider supports the API commands or if you need to run through the manual DNS configuration steps.

#### Route 53

If you are using AWS route53 service to provide DNS, provide valid AWS credentials as environment variables and run the `acme.sh` script.

```sh
export  AWS_ACCESS_KEY_ID="<key id>"
export  AWS_SECRET_ACCESS_KEY="<secret>"
```

Run the script:

```bash
./acme.sh --issue --dns dns_aws -d '*.example.com'
```

Replace `example.com` with the domain that you own. If you are not using AWS, replace `dns_aws` with your provider.

You should see output from the script and if everything worked, you should see the final lines of output list where the new certificate was saved on your system. 

This will typically be your home directory: `~/.acme.sh/`

## Next steps

Now you have a SSL/TLS certificate that you can use with web servers like Apache and nginx. For some basic examples with nginx proxies, check out a [previous post][5].

 [1]: https://www.cloudflare.com/learning/dns/what-is-dns/
 [2]: https://www.cloudflare.com/learning/ssl/what-is-https/
 [3]: https://www.git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F
 [4]: https://github.com/acmesh-official/acme.sh/wiki/dnsapi
 [5]: /posts/nginx/