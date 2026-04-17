---
title: Building more websites with AWS Amplify
author: aj
date: 2025-10-12
draft: true
categories: []
tags:
  - git
  - html
  - AWS Amplify
---

This website is deployed to AWS using a no-code tool called AWS Amplify. Check out [my original post][1] for the basic marketing level overview.

I have been working on a personal website as a side project. The intent of the site is to practice some basic web development and ultimately have a link to my Resume that I can send to people. When you have a personal website you can also generate a QR code that will link someone to your portfolio.

This blog is a static site generated with a tool called Hugo. My personal site (for now) is very basic with only HTML and CSS files. This should be no problem for AWS Amplify to deploy.

I have a GitLab repo for this new site and I mirror this to GitHub.

One decision I am still questioning is whether to include a resume.pdf file in the site. Since it is only a few kb I think it is fine but perhaps one day I can look at writing some code to generate a PDF on the fly.

## Setting up a new AWS Amplify site

In the AWS console, search for Amplify and navigate to that console. From there we want to "Create new App" or similar button/link.

![amplify_2025_new_app](/images/amplify_2025_new_app.png)

In my case I am selecting GitLab in case I want to leverage their CI/CD system. If you have a different Git provider and a similar HTML site, select that.

Now is the interesting part, I am going to store the files for my site in AWS s3 since there are so few.

When we set this up it will have public URL but that will be a CDN server so we will want to create a DNS record (can be in AWS route53 or another provider) that is an alias to this new AWS Amplify site.

[1]: /posts/hugo-amplify
