---
title: Building websites with Hugo and AWS Amplify
author: aj
date: 2021-11-28
draft: true
categories:
  - Utilities
tags:
  - Hugo
  - git
  - markdown
  - blog
  - AWS Amplify

---

AWS Amplify is a set of tools and services that can be used together or on their own, to help front-end web and mobile developers build scalable full stack applications, powered by AWS. With Amplify, you can configure app backends and connect your app in minutes, deploy static web apps in a few clicks, and easily manage app content outside the AWS console.

Use the Amplify console to host static websites and single page web apps with a Git-based workflow, simply by connecting your app's repository.

## How it works

![aws_amplify](/images/aws_amplify.png)

## Building my blog

I build my blog with Hugo and use markdown files to render new pages and posts. AWS Amplify includes Hugo as one of the tools available for serverless builds. Unfortunately, my blog requires the hugo extended version and my image files are stored in git-lfs.

This proved to be a challenge setting up a build environment in AWS. I ended up extending an existing Docker image for building hugo sites and installing the software required for AWS Amplify to build my site.

The container image used for build needed the following:

- ssh client
- git
- git-lfs
- hugo-extended
- ssh host key from `gitlab.com`