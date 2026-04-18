---
title: Migrating this blog from Hugo to Astro
author: aj
date: 2026-04-14
description: 'How and why I migrated this blog from Hugo to Astro, and what improved as a result.'
categories:
  - blog_meta
  - Software Development
tags:
  - blog
  - astro
  - javascript
  - Hugo
  - git
  - markdown
  - Gitlab CI
  - containers
---

This blog has been built with [Hugo][1] since [2021][2]. Over the years I created [my own theme][3], updated the [CI pipeline][4], and eventually [open-sourced the repo][5]. Hugo served me well but I had been wanting to move to something where I had more control over the components and layout without maintaining a separate theme repository as a git submodule. I decided to migrate to [Astro][6].

## Before

The Hugo site with the Bootstrap-based ajsTheme:

Light theme:

![hugo_final_light_theme](/images/hugo_final_light_theme.png)

Dark theme (on a post):

![hugo_final_dark_theme](/images/hugo_final_dark_theme.png)

## After

The new Astro site:

![astro_first_light_theme](/images/astro_first_light_theme.png)

Dark theme:

![astro_first_dark_theme](/images/astro_first_dark_theme.png)

## Why Astro

A few things pushed me toward Astro:

1. **No more git submodule theme.** My Hugo theme was a separate repo that I had to keep in sync. With Astro, layouts and components live directly in the project under `src/`.
2. **Component-based architecture.** Astro uses `.astro` components that combine markup, scoped CSS, and logic in a single file. This is easier to reason about than Hugo's template inheritance and partial system.
3. **No framework dependency.** My Hugo theme pulled in Bootstrap CSS and JS (~318 KB per page load). Astro components use scoped CSS with custom properties. The site now ships zero client-side JavaScript and ~11 KB of CSS.
4. **Better developer experience.** Astro runs on Node.js with hot module replacement via Vite. The feedback loop is faster than Hugo's live reload, and I can use the npm toolchain.
5. **Content Collections with type safety.** Astro validates frontmatter against a Zod schema at build time. I caught several frontmatter issues during the migration that Hugo silently ignored.

## What the migration involved

### Content

All 153 markdown posts moved from `content/posts/` to `src/content/blog/`. The frontmatter was almost entirely compatible. `title`, `date`, `tags`, `categories`, `image`, `draft`, and `author` all carried over without changes. I only had to fix three posts:

- One post had an empty YAML list item in `categories` that Zod caught during build
- Two posts used a capitalized `Title` key instead of lowercase `title`

Hugo would silently accept all of these. Astro's schema validation caught the issues.

### Code blocks

Hugo uses Chroma for syntax highlighting. Astro uses [Shiki][7] which supports dual themes. I now have `github-light` and `github-dark` themes that switch automatically with the site's dark mode. About 30 posts had fenced code blocks with language identifiers that Shiki did not recognize (like `conf` or `Docker`). I updated those to the correct identifiers (`nginx`, `dockerfile`, etc.).

### Images

Static images moved from `static/images/` to `public/images/`. Since all my posts reference images with absolute paths like `/images/example.png`, no content changes were needed. The repo uses git LFS for images, and because LFS is content-addressed, moving the files did not duplicate storage.

### Project structure

The new structure looks like this:

```text
src/
  content/blog/        # 153 markdown posts
  components/          # PostCard, Pagination, ThemeToggle, etc.
  layouts/             # BaseLayout, PostLayout
  pages/               # all routes
  styles/
    global.css         # CSS custom properties, light/dark theme, reset
    patterns.css       # shared UI patterns (post-grid, chips, cards)
  utils/               # reading time helper
public/
  images/              # post images (git LFS)
  robots.txt
```

CSS is split into two layers: `global.css` for tokens, reset, and base typography, and `patterns.css` for reusable UI patterns like the post grid, tag pills, and surface cards. Page-specific styles stay scoped in each `.astro` file. This avoids the pattern duplication that creeps in when every page re-declares the same grid or pill styles.

### New features

A few things I added during the migration:

- **Pagination** on the posts listing, tag pages, and category pages using Astro's built-in `paginate()` function
- **Featured images** on post cards. Posts with an `image` frontmatter field show a thumbnail on the card
- **Sitemap** generated automatically by the `@astrojs/sitemap` package.
- **Custom 404 page**
- **Reading time** estimates on every post
- **Contact section** on the about page, replacing the Disqus comment system that was part of the Hugo theme

### CI pipeline

The GitLab CI pipeline gained a test stage with ESLint and Prettier checks that run before the Docker build. The Docker build itself switched from a Debian image that downloads the Hugo binary to a simple `node:24-alpine` multi-stage build:

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Once the site is generated, the content is hosted on an nginx web server. The nginx config needed a couple of tweaks for Astro's output format: `absolute_redirect off` to keep redirects relative (so they work regardless of port), and a `try_files` order that checks `$uri/index.html` before `$uri/` to avoid unnecessary 301 redirects on every page load.

## Performance

The build is faster and the output is lighter:

| Metric               | Hugo          | Astro  |
| -------------------- | ------------- | ------ |
| Build time           | 2.45s         | ~1.04s |
| CSS + JS per page    | 318 KB        | 11 KB  |
| Client-side JS       | 85 KB         | 0 KB   |
| Framework dependency | Bootstrap 5.3 | None   |

Since both versions produce static HTML served behind AWS CloudFront, the serving latency is the same. The browser downloads about 307 KB less per page load.

## URL compatibility

One of my concerns was breaking existing links for search engines. Hugo's permalink config was `posts = "/posts/:contentbasename"` which produces the same URLs as Astro's file-based routing. Tag and category URLs are also unchanged. The only URLs that no longer exist are Hugo's per-section RSS feeds (like `/tags/docker/index.xml`). The global RSS feed at `/rss.xml` still works.

I added a `robots.txt` and an auto-generated sitemap to help search engines discover the new structure. I also cleaned up trailing slashes from all internal markdown links — Hugo generated URLs with trailing slashes and many of my posts had carried that convention in their cross-references.

## Performing the migration with AI tools

After hearing more about Astro I used Claude Code to plan and implement a migration to Astro using an example blog project I set up [on GitLab][10] all the way back when I first created my blog using Hugo. I have used this project over the years when I have made changes to the theme of my blog as a proving ground.

I used Claude Code with model Opus 4.6 to create a plan and then implement that plan. After several iterations the new site was ready and I created a pull request (known as merge request on GitLab) to review the migration changes. While I prefer to use OpenCode for this type of agentic coding, The Anthropic models are better at Frontend design and I want to use my Claude Pro subscription instead of paying for API tokens which does not work with OpenCode.

### Code review with Codex

Once the PR was open I used OpenAI Codex with model GPT 5.4 to review the changes. This review caught a few issues with the new framework:

- Posts marked as drafts in front matter were still being fully rendered in the site.
- The site's main URL was hard coded in the Astro config.

## Closing thoughts

I have been wanting to do this for a while. In the [2024 theme post][3] I mentioned wanting to eventually move away from the Bootstrap framework and this migration accomplishes that and more. The site is faster, the codebase is simpler, and I no longer need to maintain a separate theme repository. All the content and all the URLs carried over without changes.

The source code is available on [GitLab][8] and mirrored on [GitHub][9].

_Disclaimer: I used an LLM to assist with this migration and post. Opinions expressed are my own._

[1]: https://gohugo.io/
[2]: /posts/building-this-blog
[3]: /posts/blog-theme-2024
[4]: /posts/blog-ci-2026
[5]: /posts/blog-late-2025
[6]: https://astro.build/
[7]: https://shiki.style/
[8]: https://gitlab.com/acaylor/ajs-blog
[9]: https://github.com/acaylor/ajs-blog
[10]: https://gitlab.com/acaylor/example_blog
