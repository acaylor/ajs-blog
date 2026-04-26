---
title: Deploying an Astro site to AWS Amplify
author: aj
date: 2026-04-26
description: 'This post walks through the technology stack used to deploy this blog as a website on the internet using AWS Amplify.'
categories:
  - blog_meta
tags:
  - blog
  - astro
  - AWS Amplify
  - containers
  - docker
  - git
---

This blog is a static site built with [Astro][1] and deployed to [AWS Amplify][2]. I originally set up Amplify back in [2022][3] when the blog was built with Hugo. The same Amplify app is still connected to my GitLab repo, I just updated the build configuration for Astro. Any commit to the `main` branch triggers Amplify to rebuild and deploy the site. AWS handles issuing and renewing the TLS certificate for the DNS domain that is also managed in AWS Route53.

In this post I will walk through how to get an Astro site deployed to Amplify, including a custom build image for git LFS support.

## Custom build image

Amplify provides a default build image but it does not include [git LFS][4]. My blog stores images in git LFS and the default image will only check out LFS pointer files instead of the actual images. When I was using Hugo I solved this with a [custom build image][5] that had Hugo Extended and git-lfs pre-installed. With Astro I no longer need Hugo but I still need git LFS.

The key detail is that git-lfs must be installed in the image **before** Amplify clones the repo. Amplify uses temporary SSH credentials during the clone step and cleans them up afterward. If git-lfs is not present at clone time, the LFS objects are not fetched and there is no way to authenticate later in the build.

I created a new project called [nodebuild][6] with a Dockerfile based on Ubuntu 24.04:

```dockerfile
FROM ubuntu:24.04

# Install dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl git openssh-client ca-certificates \
        gnupg unzip wget \
        && rm -rf /var/lib/apt/lists/*

# Install Git LFS
RUN curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash && \
    apt-get update && apt-get install -y git-lfs && \
    git lfs install && \
    rm -rf /var/lib/apt/lists/*

# Install nvm and Node
ENV NVM_DIR=/root/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && \
    . "$NVM_DIR/nvm.sh" && \
    nvm install 24 && \
    nvm alias default 24

# Make nvm/node/npm available in all shell contexts (required by Amplify)
ENV BASH_ENV="$NVM_DIR/nvm.sh"

# Setup known SSH hosts for GitLab
RUN mkdir -p /root/.ssh && ssh-keyscan gitlab.com >> /root/.ssh/known_hosts
```

A few things worth noting:

- **`BASH_ENV`** is set to `nvm.sh` so that nvm, node, and npm are available in non-interactive shells. Without this, Amplify's build runner cannot find npm.
- **Node is installed via nvm** rather than the system package manager. Amplify expects nvm to be present and uses it to manage Node versions.
- **`gitlab.com` is added to known hosts** so that the SSH clone does not hang waiting for host key confirmation.

The image is published to the [GitLab container registry][7] using GitLab CI. Whenever changes are pushed to the `main` branch of the nodebuild repo, CI builds and publishes the image automatically.

## Build configuration

The blog repo includes an `amplify.yml` file that tells Amplify how to build the site:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

This is straightforward compared to the Hugo build. `npm ci` installs dependencies from the lock file and `npm run build` runs the Astro build which outputs static files to `dist/`. The `node_modules` cache speeds up subsequent builds since the dependencies do not need to be downloaded every time.

## Amplify configuration

In the Amplify console, the app is connected to the GitLab repo with `main` as the production branch. The only non-default setting is the custom build image. Under **Build settings > Build image settings**, set the build image to the container registry URL:

```text
registry.gitlab.com/acaylor/nodebuild:latest
```

Everything else is handled by Amplify automatically.

## How it all fits together

The deployment flow looks like this:

1. Push a commit to `main` on GitLab
2. Amplify detects the change and pulls the `latest` custom build image from the GitLab registry
3. Amplify clones the repo using temporary SSH credentials. Because git-lfs is installed in the image, LFS objects (image files) are fetched during the clone
4. Amplify runs the build commands from `amplify.yml`: install dependencies and build the site
5. Amplify deploys the contents of `dist/` to its CDN
6. The site is live at the custom domain with a valid TLS certificate

If I need to update the Node version or add another build dependency, I update the nodebuild image. If I need to change how the site is built, I update `amplify.yml`. The two concerns are separate which makes each one easier to maintain.

### If you do not use git LFS

If your Astro project does not use git LFS, you do not need a custom build image. The default Amplify image with a Node version override in the console will work fine. Just add the `amplify.yml` to your repo and connect it in the Amplify console.

### Thoughts on Amplify

I really like Amplify. For a low traffic site like mine, it is inexpensive to operate compared to a whole private server and as a static site we are able to take advantage of CDN caching without having to configure any of it. If you have a domain you own, Amplify can keep SSL/TLS certificates up to date for your site to have HTTPS.

I have used Amplify for almost 5 years with no issues and I hope the next 5 go just as smooth.

[1]: https://astro.build/
[2]: https://aws.amazon.com/amplify/
[3]: /posts/hugo-amplify
[4]: https://git-lfs.github.com/
[5]: /posts/hugo-amplify#building-my-blog
[6]: https://gitlab.com/acaylor/nodebuild
[7]: https://gitlab.com/acaylor/nodebuild/container_registry
