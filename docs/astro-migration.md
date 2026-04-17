# Hugo to Astro Migration

This document summarizes the migration of AJ's Blog from Hugo to Astro 6.x, completed in April 2026.

## Motivation

- Replace the Hugo static site generator and its git submodule theme (`themes/ajsTheme`) with Astro, which uses standard npm dependencies and a component-based architecture.
- Align with the Node.js/npm toolchain used across other projects.
- Gain more control over layouts and components without maintaining a separate theme repo.

## What Changed

### Content

- 153 markdown posts moved from `content/posts/` to `src/content/blog/`.
- Frontmatter required no schema changes — `title`, `date`, `tags`, `categories`, `image`, `draft`, and `author` all carried over directly. An `updated` field was added to the schema for posts that track revision dates.
- 3 posts needed minor frontmatter fixes: one had an empty YAML list item in `categories`, two used a capitalized `Title` key.
- 1 post had a relative image path that was changed to an absolute `/images/` path.
- ~30 posts had fenced code blocks with unsupported language identifiers (e.g., `conf`, `Docker`, `promql`). These were updated to supported Shiki languages (`nginx`, `dockerfile`, `promql` → `yaml`, etc.).

### Static Assets

- Images moved from `static/images/` (237 files) to `public/images/`. Paths in posts (`/images/...`) remained unchanged.
- Favicon copied to `public/favicon.ico`.
- All images are tracked with git LFS. Because LFS is content-addressed, the file moves did not duplicate storage.

### Project Structure

```
src/
  content.config.ts          # Zod schema for blog collection (glob loader)
  content/blog/              # 153 markdown posts
  components/
    CopyCode.astro
    Pagination.astro          # New — shared pagination controls
    PostCard.astro            # Supports optional featured image
    ShareButtons.astro
    TableOfContents.astro
    ThemeToggle.astro
  layouts/
    BaseLayout.astro          # Site chrome, nav, footer
    PostLayout.astro          # Single post template with optional "updated" date
  pages/
    index.astro               # Hero + 6 recent posts
    about.astro               # Bio, projects, contact
    404.astro                 # Custom error page
    rss.xml.ts                # RSS feed
    posts/[...page].astro     # Paginated post listing (12 per page)
    posts/[id].astro          # Individual post pages
    tags/index.astro          # All tags with counts
    tags/[tag]/[...page].astro          # Paginated tag listing
    categories/index.astro              # All categories with counts
    categories/[category]/[...page].astro  # Paginated category listing
  styles/
    global.css                # CSS custom properties, light/dark theme, reset
    patterns.css              # shared UI patterns (post-grid, chips, cards, page headers)
  utils/reading-time.ts       # Word count → reading time estimate
```

### Pagination

Hugo paginated with `pagerSize: 6` by default. Astro uses the built-in `paginate()` function in `getStaticPaths` with `pageSize: 12`. Pagination is available on:

- `/posts`, `/posts/2`, `/posts/3`, ...
- `/tags/{tag}`, `/tags/{tag}/2`, ...
- `/categories/{category}`, `/categories/{category}/2`, ...

The `[...page].astro` rest parameter pattern gives clean URLs (`/posts/2` instead of `/posts/page/2`).

### SEO and Crawlability

- `public/robots.txt` allows all user agents and points to the sitemap.
- `@astrojs/sitemap` generates `sitemap-index.xml` and `sitemap-0.xml` at build time.
- Post URLs are unchanged: Hugo used `posts = "/posts/:contentbasename"` which matches Astro's `/posts/${post.id}` routing.
- Tag and category URLs are unchanged.
- Per-section and per-taxonomy RSS feeds from Hugo are no longer generated. A single global RSS feed is available at `/rss.xml`.
- Trailing slashes were removed from all internal markdown links to avoid unnecessary 301 redirects under nginx.
- The nginx config uses `absolute_redirect off` and `try_files $uri $uri/index.html $uri/` to serve Astro's directory-based output directly without redirect hops.

### Infrastructure

| Component           | Before (Hugo)                      | After (Astro)                                              |
| ------------------- | ---------------------------------- | ---------------------------------------------------------- |
| Runtime             | Hugo binary                        | Node 24 (build), nginx (serve)                             |
| Theme               | Git submodule (`themes/ajsTheme`)  | Components in `src/`                                       |
| Dockerfile          | Hugo build stage → nginx           | `node:24-alpine` build → `nginx:alpine`                    |
| CI lint             | None                               | ESLint + Prettier (`npm run lint`, `npm run format:check`) |
| CI build            | Hugo build                         | `npm run build` producing `dist/` artifact                 |
| CI docker           | BuildKit multi-arch (amd64, arm64) | BuildKit amd64 only                                        |
| Syntax highlighting | Hugo/Chroma (`github-dark`)        | Shiki dual themes (`github-light` / `github-dark`)         |
| Dependency updates  | Renovate (Hugo + submodule)        | Renovate (npm)                                             |

### Removed Hugo Artifacts

- `config/` (hugo.toml, menus.en.toml)
- `themes/` (git submodule deinitialized and removed)
- `archetypes/`, `data/`, `resources/`
- `.gitmodules`, `.hugo_build.lock`
- `content/` directory (replaced by `src/content/blog/`)
- `renovate.sh`, `.old-ci-conf.yml`

## Development

```bash
npm install          # install dependencies
npm run dev          # start dev server (localhost:4321, also accessible by IP)
npm run build        # production build to dist/
npm run preview      # preview production build locally
npm run lint         # eslint
npm run format:check # prettier check
npm run format       # prettier fix
```

## Docker

```bash
docker build -t ajs-blog .
docker run -p 8080:80 ajs-blog
```

The multi-stage Dockerfile builds with `node:24-alpine` and serves from `nginx:alpine`.
