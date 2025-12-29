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

## Helpful links

- Hugo: https://gohugo.io/
- Markdown guide: https://www.markdownguide.org/
