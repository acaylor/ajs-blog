# Development

## Prerequisites

- Node.js 24 (see `.nvmrc`)
- npm

## Setup

```bash
npm install
```

## Local Dev Server

```bash
npm run dev
```

The site will be available at `http://localhost:4321` and by IP on port 4321 from other devices on the network.

## Build

```bash
npm run build    # production build to dist/
npm run preview  # preview the build locally
```

## Linting and Formatting

```bash
npm run lint          # eslint
npm run format:check  # prettier check
npm run format        # prettier fix
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
  components/          # Astro components (PostCard, Pagination, etc.)
  layouts/             # BaseLayout, PostLayout
  pages/               # routes (posts, tags, categories, about, 404, RSS)
  styles/
    global.css         # CSS custom properties, light/dark theme, reset
    patterns.css       # shared UI patterns (post-grid, chips, cards, page headers)
  utils/               # reading time helper
public/
  images/              # post images
  robots.txt
docs/                  # project documentation
```
