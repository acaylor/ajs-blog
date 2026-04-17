# Performance Comparison: Hugo vs Astro

Measurements taken April 2026 during the migration from Hugo to Astro 6.x.

## Build Performance

| Metric          | Hugo                            | Astro          |
| --------------- | ------------------------------- | -------------- |
| Build time      | 2,454 ms                        | ~1,040 ms      |
| Pages generated | 780 (675 pages + 105 paginator) | 373            |
| Build tool      | Hugo binary                     | Node 24 + Vite |

Astro builds in under half the time despite producing fewer output files. Hugo's higher page count comes from auto-generated per-section and per-taxonomy RSS feeds, alias redirect pages (186), and additional JSON output — not from more content.

Both sites serve the same 146 published posts.

## Page Sizes (HTML)

Measured from the Hugo production site (`blog.ayjc.net`) and the Astro `dist/` build output.

| Page                                             | Hugo     | Astro    | Delta |
| ------------------------------------------------ | -------- | -------- | ----- |
| Home (`/`)                                       | 15,738 B | 14,726 B | -6%   |
| Posts listing (`/posts/`)                        | 16,198 B | 18,061 B | +12%  |
| Single post (`/posts/terminal-ai-coding-tools/`) | 29,020 B | 31,635 B | +9%   |
| Tags index (`/tags/`)                            | 29,187 B | 37,443 B | +28%  |
| Categories index (`/categories/`)                | 32,847 B | 12,319 B | -63%  |

HTML sizes are comparable. Astro's tags page is larger because it renders all tags with counts inline. Astro's categories page is smaller because Hugo rendered all posts per category on a single page while Astro paginates them.

## CSS and JavaScript

| Asset                            | Hugo                              | Astro                         |
| -------------------------------- | --------------------------------- | ----------------------------- |
| Bootstrap CSS                    | 232,948 B                         | —                             |
| Bootstrap JS                     | 60,577 B                          | —                             |
| Popper.js                        | 20,122 B                          | —                             |
| Custom CSS                       | 111 B (style.css)                 | 10,979 B (2 scoped CSS files) |
| Custom JS                        | 4,305 B (color-modes + copy-code) | 0 B                           |
| **Total CSS + JS per page load** | **318,063 B**                     | **10,979 B**                  |

Astro eliminates the Bootstrap framework dependency entirely. All styling is done with scoped CSS and CSS custom properties. There is no client-side JavaScript — theme toggling and copy-code functionality use small inline scripts rather than external JS files.

This is a **97% reduction** in CSS + JS transferred per page load.

## Site Latency (Hugo — Production)

Measured against the live Hugo site at `blog.ayjc.net`, served via CloudFront + S3 (AWS Amplify).

| Page                      | TTFB (range) | Total (range) |
| ------------------------- | ------------ | ------------- |
| Home (`/`)                | 42–157 ms    | 43–157 ms     |
| Posts listing (`/posts/`) | 44–228 ms    | 44–229 ms     |
| Single post               | 46–219 ms    | 49–221 ms     |

TTFB variance depends on CloudFront cache state. Cached responses (hits) return in ~45 ms; cold requests take ~150–230 ms.

Since both Hugo and Astro produce static HTML served from the same infrastructure (nginx behind CloudFront), serving latency will be equivalent after deployment. The performance difference is in what the browser has to download and parse — Astro pages require ~307 KB less in external assets per page load.

## Summary

| Metric                     | Hugo          | Astro  | Improvement |
| -------------------------- | ------------- | ------ | ----------- |
| Build time                 | 2.45 s        | 1.04 s | 2.4x faster |
| CSS + JS per page          | 318 KB        | 11 KB  | 97% smaller |
| External requests (CSS/JS) | 6             | 2      | 4 fewer     |
| Client-side JS             | 85 KB         | 0 KB   | Eliminated  |
| Framework dependency       | Bootstrap 5.3 | None   | Removed     |
