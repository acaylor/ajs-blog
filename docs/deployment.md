# Deployment

**Production is AWS Amplify** (S3 + CloudFront), built from `amplify.yml`. The Docker/nginx
path below is for local and test hosting only — nothing in `nginx.conf` reaches production.
Any routing behaviour that has to hold for real users belongs in the Amplify rules, and
the two need to be changed together.

## AWS Amplify (production)

`amplify.yml` covers the build (`npm ci`, `npm run build`, publish `dist/`). It cannot express
redirects — Amplify keeps those as app-level "Rewrites and redirects", outside the repo. To stop
them drifting, the intended rule set is committed to `amplify-redirects.json` and applied with:

```bash
aws amplify update-app --app-id <APP_ID> --custom-rules file://amplify-redirects.json
```

Editing rules in the console instead is fine, but export them back into that file afterwards or
the next person will have no idea what production is actually doing.

### What the rules do

1. **69 exact 301s** for taxonomy URLs published between the April 2026 Astro migration and the
   July 2026 slug fix (`/categories/Kubernetes/` → `/categories/kubernetes/`). Closed set — terms
   added after the fix are slugified from the start, so this list never needs to grow.
2. **Hugo feed redirects** — Hugo emitted a feed per section and per taxonomy term; Astro ships
   one. All of them fold into `/rss.xml`.
3. **`/posts/page/<*>` → `/posts/`** — Hugo paginated at `/page/N` with `pagerSize: 6` against
   Astro's `/N` with `pageSize: 12`, so the numbers don't correspond and the section root is the
   honest target. The `/tags/<term>/page/N` and `/categories/<term>/page/N` equivalents are
   deliberately left to 404: Amplify can't backreference a regex capture into the target, and
   redirecting ~82 dead listing pages to a generic index reads as a soft 404 to Google. `nginx.conf`
   can express the capture and does, so test hosting is slightly more thorough than production here.
4. **A catch-all that serves `/404.html`.** This is Amplify's stock rule with the target changed
   from `/index.html`. Before this, every dead URL returned the _homepage_ body under a 404 status
   and the built 404 page was never served at all.

### After applying, verify

Amplify matches exact sources literally, but this has bitten us once already: the same rule set
expressed as an nginx `map` would have looped, because nginx lowercases map lookup keys and
`/categories/ai/` would have matched the `/categories/AI/` key and redirected to itself. Confirm
the already-correct URLs are untouched:

```bash
curl -sSI https://blog.ayjc.net/categories/ai/          # 200, no Location
curl -sSI https://blog.ayjc.net/categories/Kubernetes/  # 301 -> /categories/kubernetes/
curl -sSI https://blog.ayjc.net/nope/                   # 404 serving the 404 page, not the homepage
```

## Docker (local / test hosting only)

Build and run locally:

```bash
docker build -t ajs-blog .
docker run --rm -p 8080:80 ajs-blog
```

The Dockerfile uses a multi-stage build: `node:24-alpine` builds the site, `nginx:alpine` serves it.

The nginx config (`nginx.conf`) uses `absolute_redirect off` and a `try_files` order of `$uri $uri/index.html $uri/` to serve Astro's directory-based output. It also mirrors the Amplify redirect rules so test hosting routes like production; see `amplify-redirects.json` and keep the two in sync.

Note that nginx serves `/posts/foo` and `/posts/foo/` both as 200, whereas Amplify 301s the former to the latter. Internal links should carry the trailing slash so production doesn't take a redirect hop — a missing slash will not show up as a problem under Docker.

Build an amd64 image with Buildx:

```bash
docker buildx build \
  --platform linux/amd64 \
  -t <registry>/<image>:<tag> \
  --push .
```

## CI/CD Pipeline

GitLab CI is configured in `.gitlab-ci.yml` with two stages:

### Test Stage

- **lint** — `npm ci`, then `npm run lint` (ESLint), `npm run check` (astro check), `npm run format:check` (Prettier)
- **build_and_verify** — `npm run build`, then `npm run a11y` (html-validate on rendered HTML), then a `lychee` offline link check against `dist/`. Saves `dist/` as a 1-week artifact. The lychee binary is fetched at runtime from GitHub releases to avoid the cost of a second `npm ci`.

### Build Stage

- **buildTesting** — pushes a `linux/amd64` Docker image tagged with the commit SHA on the `testing` branch
- **buildProduction** — pushes a `linux/amd64` Docker image tagged `latest` on the `main` branch

Both Docker jobs use `moby/buildkit:rootless` to build for `linux/amd64` and push to the GitLab Container Registry.

### Environment Variables

The pipeline uses these GitLab CI built-in variables:

- `CI_REGISTRY` — GitLab Container Registry URL
- `CI_REGISTRY_USER` / `CI_REGISTRY_PASSWORD` — registry credentials (automatic)
- `CI_REGISTRY_IMAGE` — full image name including registry path
- `CI_COMMIT_SHA` — commit hash used to tag testing builds
- `TARGET_PLATFORMS` — target architectures (`linux/amd64`)
