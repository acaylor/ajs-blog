---
title: 2025 Blog meta updates
author: aj
date: 2025-10-05

categories:
  - blog_meta 
tags:
  - Hugo
  - git
  - markdown
  - blog

---

## Blog Theme

It has been a long time since [I posted][1] about how this website (blog) is built. This blog is a static site generated with a tool called [Hugo][2] (written in golang). In the last post about the blog itself, I moved the theme of the site to one that I created myself and [published to GitHub][2]. I made some updates to the theme in 2025 mainly fixing CSS issues. Turns out I wrote a bunch of styles for code blocks but never actually loaded those into the site. This was something that I had an AI coding agent help with. I used Cursor and Gemini CLI to modify the theme of my site. An unexpected method I used to fix the CSS issue was pasting a screenshot of Chrome dev tools into the Gemini CLI.


## Building the site

There was a problem with building my site, I was relying on a public Docker image that someone else built for generating Hugo sites. I tried to have Gemini fix this by creating my own Dockerfile but it failed to fix the issue. Fortunately I know a thing or two about Dockerfiles so I just fixed it myself and now my blog is built with a container image I [publish to Gitlab][4].

## Blog repo now public

I doubt I announced it but I also this year open-sourced my blog. Originally in 2021 I created this blog in Gitlab as a private repo. I since made it public and also mirror to GitHub.

[https://github.com/acaylor/ajs-blog](https://github.com/acaylor/ajs-blog)

 [1]: /posts/blog-theme-2024/
 [2]: https://github.com/gohugoio/hugo
 [3]: https://github.com/acaylor/ajsTheme
 [4]: https://gitlab.com/acaylor/hugobuild