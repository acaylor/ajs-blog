# Blog powered by Hugo

This repository builds a static Hugo site using the `ajsTheme` theme and ships a Dockerfile that compiles the site and serves it with NGINX.

## Prerequisites

- Hugo Extended (matching the Dockerfile version or newer): https://gohugo.io/getting-started/installing/
- Git: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git

## Theme

The site uses the `ajsTheme` theme as a git submodule:

```bash
git submodule update --init --recursive
```

To update the theme:

```bash
git submodule update --remote --merge
```

## Theme repository

The theme is maintained in a separate repo that I also maintain:

- https://github.com/acaylor/ajsTheme

If you need to change theme templates, assets, or styling, update the theme repo and then bump the submodule here.

## Configuration

Site configuration lives under `config/_default/`:

- `config/_default/hugo.toml`: main Hugo settings (base URL, theme, pagination, markup, etc.).
- `config/_default/menus.en.toml`: navigation menu items.

If you need to change site-level settings (title, base URL, theme name), update `config/_default/hugo.toml`. Menu changes go in `config/_default/menus.en.toml`.

## Content

Add content in `content/`. For posts, create a new markdown file:

```bash
hugo new posts/my-post.md
```

## Local development

Run the Hugo dev server (drafts enabled):

```bash
hugo server -D
```

The site will be available at `http://localhost:1313`.

## Docker build and run

Build the image:

```bash
docker build -t ajs-blog .
```

Run it locally:

```bash
docker run --rm -p 8080:80 ajs-blog
```

Then visit `http://localhost:8080`.

## CI/CD Pipeline

This project uses GitLab CI/CD to automatically build and deploy Docker images. The pipeline is configured in `.gitlab-ci.yml` and consists of the following:

### Pipeline Structure

The CI pipeline has one stage:
- **build**: Creates Docker images using BuildKit

### Jobs

#### buildTesting
- **Trigger**: Runs on commits to the `testing` branch
- **Purpose**: Builds and pushes a Docker image tagged with the commit SHA
- **Image tag**: `$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA`

#### buildProduction  
- **Trigger**: Runs on commits to the `main` branch
- **Purpose**: Builds and pushes a Docker image tagged as latest
- **Image tag**: `$CI_REGISTRY_IMAGE:latest`

### Build Process

Both jobs use the same build process:

1. **Image**: Uses `moby/buildkit:rootless` for secure, daemonless Docker builds
2. **Submodules**: Recursively clones git submodules (required for the Hugo theme)
3. **Authentication**: Configures Docker registry credentials using GitLab CI variables
4. **Build**: Uses BuildKit's `buildctl-daemonless.sh` to build the Dockerfile
5. **Push**: Automatically pushes the built image to the GitLab Container Registry

### Environment Variables

The pipeline uses these GitLab CI built-in variables:
- `CI_REGISTRY`: GitLab Container Registry URL
- `CI_REGISTRY_USER`: Registry username (automatically provided)
- `CI_REGISTRY_PASSWORD`: Registry password (automatically provided)
- `CI_REGISTRY_IMAGE`: Full image name including registry path
- `CI_COMMIT_SHA`: Git commit hash for tagging testing builds
- `CI_PROJECT_DIR`: Project directory path

### Docker Build

The Dockerfile creates a multi-stage build:
1. **Hugo stage**: Downloads Hugo Extended, builds the static site
2. **NGINX stage**: Serves the built site using NGINX Alpine

### Deployment

After the pipeline completes:
- **Testing builds**: Available as `$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA`
- **Production builds**: Available as `$CI_REGISTRY_IMAGE:latest`

You can pull and run these images from the GitLab Container Registry.

## Helpful links

- Hugo: https://gohugo.io/
- Markdown guide: https://www.markdownguide.org/
- GitLab CI/CD: https://docs.gitlab.com/ee/ci/
- BuildKit: https://github.com/moby/buildkit
