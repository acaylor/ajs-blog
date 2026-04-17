# Deployment

## Docker

Build and run locally:

```bash
docker build -t ajs-blog .
docker run --rm -p 8080:80 ajs-blog
```

The Dockerfile uses a multi-stage build: `node:24-alpine` builds the site, `nginx:alpine` serves it.

The nginx config (`nginx.conf`) uses `absolute_redirect off` and a `try_files` order of `$uri $uri/index.html $uri/` to serve Astro's directory-based output without trailing-slash redirects.

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

- **lint** — runs ESLint and Prettier checks
- **build** — runs `npm run build`, saves `dist/` as an artifact

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
