---
title: Adding more CI testing to this blog
author: aj
date: 2026-05-27
description: 'Adding type checks, HTML validation, and internal link checking to the Astro blog pipeline.'
categories:
  - blog_meta
  - Software Development
tags:
  - blog
  - astro
  - Gitlab CI
  - testing
  - typescript
---

After [migrating this blog from Hugo to Astro][1], the GitLab CI pipeline had two test jobs: linting and building. The lint job ran ESLint and Prettier. The build job ran `npm run build`, which runs `astro build`.

That was enough to get the migration shipped safely, but it was still a fairly small safety net. Astro renders every page at build time, so the build catches a lot, but it does not catch everything I care about before making larger changes to the site.

I wanted better checks before starting a visual refactor of the blog. A style refactor touches layout components, CSS, post templates, navigation, and image handling. The existing pipeline could still pass with broken internal links, invalid HTML, or TypeScript issues in `.astro` component scripts.

## What the pipeline had

The pipeline started with the basics:

```yaml
lint:
  script:
    - npm ci
    - npm run lint
    - npm run format:check

build:
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
```

`npm run lint` runs ESLint with `eslint-plugin-astro` and `@typescript-eslint`. `npm run format:check` runs Prettier. `npm run build` renders the site.

That setup catches formatting issues, lint errors, broken frontmatter, and anything that fails while Astro renders the site. The gaps I wanted to close were:

- TypeScript errors inside `.astro` files
- Broken internal links after renaming posts or moving images
- HTML structure issues in the rendered output

## Astro check

The first addition was [`@astrojs/check`][2]. This runs the TypeScript compiler against `.astro` files, which ESLint does not do by itself.

I added one package and one script:

```json
{
  "scripts": {
    "check": "astro check"
  }
}
```

Then I added it to the lint job:

```yaml
lint:
  script:
    - npm ci
    - npm run lint
    - npm run check
    - npm run format:check
```

The first run reported `0 errors, 0 warnings, 0 hints`, which is what I expected. The value is not that it found a bug immediately. The value is that the next component rewrite has a compiler check before it reaches the build job.

## HTML validation

The second addition was [`html-validate`][3]. It checks the rendered HTML in `dist/` after `astro build`.

This is not a full accessibility audit. It does not run in a browser, so it will not catch things like bad color contrast or a missing focus ring. It does catch structural problems that are easy to miss in a static site:

- Missing `alt` attributes
- Duplicate IDs
- Invalid element nesting
- Buttons without an explicit type
- Landmarks that need accessible labels

The first run found a lot of old issues. The biggest groups were:

| Rule                      | Count | Issue                                                                           |
| ------------------------- | ----- | ------------------------------------------------------------------------------- |
| `no-implicit-button-type` | 204   | `<button>` elements without `type="button"`                                     |
| `unique-landmark`         | 176   | Repeated `<nav>` and `<aside>` landmarks without labels                         |
| `valid-id`                | 51    | Markdown-generated heading IDs that started with a digit                        |
| `element-name`            | 51    | Old posts using `<key>` as a custom element instead of the real `<kbd>` element |

I temporarily disabled those noisy rules so the job could start as a regression check:

```json
{
  "extends": ["html-validate:recommended"],
  "rules": {
    "no-implicit-button-type": "off",
    "unique-landmark": "off",
    "valid-id": "off",
    "element-name": "off"
  }
}
```

Then I cleaned them up. The button and landmark issues were fixed while restyling the shared layout components. The heading IDs were a stricter-than-needed rule: HTML allows IDs that start with digits, so I changed `valid-id` to its relaxed mode instead of changing old post anchors. The `<key>` tags were replaced with `<kbd>`, which is the correct semantic element for keyboard input.

After that pass, the useful rules were back on. A new missing `alt` attribute or malformed element now fails CI.

## Internal link checking

The third addition was [`lychee`][4]. I run it in offline mode so it checks internal links and file references without crawling the public internet:

```sh
lychee --offline --root-dir "$CI_PROJECT_DIR/dist" --config lychee.toml 'dist/**/*.html'
```

The first run found 27 broken internal links across 7 unique targets:

- Three missing images: `elastic_logo.png`, `pg_logo.png`, and `strong-app-schema.png`
- One malformed relative link that produced `/posts/hass-polling-to-db/posts/prometheus-homelab`
- Two old post slugs: `/posts/packer` and `/posts/zsh-2026`
- One tag URL that did not exist: `/tags/alloy`

These were real bugs. The existing CI would have shipped all of them forever.

The fixes were small but useful. I removed stale image frontmatter, renamed one image with a doubled extension, added the PostgreSQL SVG asset that the posts were already trying to use, corrected the malformed markdown link, updated the old slugs, and added the missing `alloy` tag where it made sense.

Once those were fixed, the lychee baseline could be empty. Now I want it to fail when I break something new.

## Keeping the pipeline small

My first version added separate jobs for linting, building, HTML validation, and link checking. It worked, but it also spent most of its time reinstalling dependencies and pulling images.

GitLab.com gives free accounts limited CI minutes per month. This blog does not need a pipeline that burns minutes on job setup, so I folded the rendered-output checks into the build job:

```yaml
build_and_verify:
  stage: test
  image: node:24-alpine
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run build
    - npm run a11y
    - wget -qO- https://github.com/lycheeverse/lychee/releases/latest/download/lychee-x86_64-unknown-linux-musl.tar.gz | tar xz --strip-components=1 lychee-x86_64-unknown-linux-musl/lychee
    - ./lychee --offline --root-dir "$CI_PROJECT_DIR/dist" --config lychee.toml 'dist/**/*.html'
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
```

The lychee binary is small, and downloading it directly is faster than starting a separate Docker image just for link checking. The added checks now cost about thirty seconds instead of a few extra minutes.

The tradeoff is that failures are less neatly separated by job name. If `build_and_verify` fails, I have to read the log to see whether it was Astro, `html-validate`, or lychee. For a single-author blog, that is fine.

## What this catches

The pipeline now catches three classes of problems that were easy to miss before:

1. TypeScript mistakes in `.astro` component scripts
2. Invalid or inaccessible HTML in the rendered site
3. Broken internal links and missing local assets

It still does not catch visual regressions. A page can pass every static check and still look wrong because of a CSS change. Browser-based snapshot testing with Playwright or BackstopJS would help there, but that is more maintenance than I want for this site right now.

It also does not replace a real accessibility pass. `html-validate` is useful, but color contrast, keyboard behavior, and focus states need to be checked in a browser.

## A git LFS detour

The only part of this work that got messy was adding `pg_logo.svg`.

This repo already uses Git LFS for images, but `.gitattributes` did not include SVG files. I added the rule and the SVG in what I thought was one commit. That was wrong. Git's clean filter uses the attributes that are active when the file is staged, so the SVG went into the index as a normal file instead of an LFS pointer.

I fixed it with `git lfs migrate import`, but I scoped the command badly the first time and rewrote more history than I intended. The recovery was a rebase back onto `origin/main`, followed by checking the resulting commits with `git show`.

The lesson was simple: add the LFS rule before staging the asset, preferably as a separate commit. After any history rewrite, inspect the resulting commits before pushing.

## Closing thoughts

This was a small CI change, but it found real problems. The internal link checker was the biggest win because several links and image references had been broken for months without me noticing. The Astro migration made the site easier to change. These CI additions make it safer to change.

The source is on [GitLab][5] and mirrored on [GitHub][6].

_Disclaimer: I used an LLM to assist with this work and post. Opinions expressed are my own._

[1]: /posts/astro-migration-2026
[2]: https://www.npmjs.com/package/@astrojs/check
[3]: https://html-validate.org/
[4]: https://lychee.cli.rs/
[5]: https://gitlab.com/acaylor/ajs-blog
[6]: https://github.com/acaylor/ajs-blog
