# Development

## Prerequisites

- Node.js 24 (see `.nvmrc`)
- pnpm 12.4.2 (pinned in `package.json`)

## Setup

```bash
pnpm install
```

## Local Dev Server

```bash
pnpm run dev
```

The site will be available at `http://localhost:4321` and by IP on port 4321 from other devices on the network.

## Build

```bash
pnpm run build    # production build to dist/
pnpm run preview  # preview the build locally
```

## Linting, Type-checking, Formatting

```bash
pnpm run lint          # eslint
pnpm run check         # astro check (TypeScript + Astro diagnostics)
pnpm run format:check  # prettier check
pnpm run format        # prettier fix
```

## HTML / Accessibility / Link Checks

These run against the built `dist/` output and mirror what CI runs:

```bash
pnpm run build         # produce dist/
pnpm run a11y          # html-validate against dist/**/*.html
```

Internal link integrity uses [lychee](https://github.com/lycheeverse/lychee). In CI it's fetched as a static binary; locally, install it however you prefer (`brew install lychee`) and run:

```bash
lychee --offline --root-dir "$PWD/dist" --config lychee.toml 'dist/**/*.html'
```

## Content

Blog posts are markdown files in `src/content/blog/`. Create a new post by adding a `.md` file with frontmatter:

```yaml
---
title: 'My New Post'
date: 2026-04-14
description: 'A short description'
tags:
  - example
categories:
  - General
draft: false
---
```

Optional frontmatter fields: `author`, `image` (featured image path), `updated` (revision date).

## Project Structure

```
src/
  content/blog/        # markdown posts
  components/
    Banner.astro            # boot-style "cat /path" + [ OK ] status line
    Module.astro            # named dashed-rule section divider
    Prompt.astro            # trailing aj@blog:~$ block with blinking cursor
    PostCard.astro          # .unit block on the home page
    PostEntry.astro         # compact journalctl-style row for list pages
    Pagination.astro        # numeric bordered-pill pager
    ShareButtons.astro      # bordered pills (x / linkedin / hn / copy)
    TableOfContents.astro   # tree-style heading listing
    ThemeToggle.astro       # dark/light toggle with pre-paint script
    CopyCode.astro          # wraps <pre> + attaches copy chip
  layouts/             # BaseLayout (term-head/term-foot chrome), PostLayout
  pages/               # routes (posts, tags, categories, about, 404, RSS)
  styles/
    global.css         # dmesg color tokens, font imports, reset, base elements, print
    patterns.css       # boot-log primitives (.banner, .module, .unit, .entry, .post, etc.)
  utils/               # reading time helper
public/
  images/              # post images
  robots.txt
docs/                  # project documentation
```

The site uses [DM Mono](https://fontsource.org/fonts/dm-mono) (via `@fontsource/dm-mono`) for the UI chrome, [Literata](https://fontsource.org/fonts/literata) (via `@fontsource-variable/literata`) for post body text, and a dmesg / boot-log visual direction — see `src/styles/global.css` for the token palette and `src/styles/patterns.css` for the primitive set.
