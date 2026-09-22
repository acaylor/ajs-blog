---
title: Moving my npm projects to pnpm 12
author: aj
date: 2026-09-21
description: 'Migrating the npm projects under my sourcecode directory to pnpm 12, including lockfiles, build scripts, CI, and container builds.'
categories:
  - Software Development
tags:
  - javascript
  - typescript
  - npm
  - pnpm
---

Most of my JavaScript projects have used `npm` because it comes with Node.js. I already had a few projects using [pnpm][1], and I wanted to use the same package manager across the rest of them. That included this blog, some applications I maintain, and older learning projects still sitting on disk. My experience with `pnpm` has been quite positive and it is noticeably faster in larger projects. Version 12 of pnpm is actually a rewrite of the project in Rust. Now it is even faster.

## My pnpm migration

My projects are nested under `~/sourcecode`, with separate directories for public projects, private projects, and third-party repositories. I started by finding the package manifests and checking which package manager each project used.

### Finding the JavaScript stuff

This was the starting point for the search:

```bash
rg --files --hidden \
  -g package.json \
  -g '!node_modules' \
  -g '!.git' \
  -g '!dist' \
  -g '!vendor' \
  ~/sourcecode
```

The results needed some review. There were third-party clones, generated files from experiments, and a project using Bun. I left those alone. Three of my projects already used pnpm, including two with pnpm 11 pinned in `package.json`.

I ended up with 26 project directories to migrate or update. Some were standalone repositories, while others were small examples inside a larger repo. Several old exercises were not in Git at all. I kept backups of the files being changed.

These are separate projects, so each one keeps its own lockfile.

### Pinning pnpm

I already had pnpm 12.4.2 installed through my local tool setup. I added the same version to each project's `package.json`:

```json
{
  "packageManager": "pnpm@12.4.2"
}
```

That gives the project an explicit package manager version for local development and CI. The existing pnpm projects received the same pin.

One difference in [pnpm 12][2] is that pnpm itself is a native executable. That means there is a specific binary compiled for each Operating System and cpu architecture. Installing it through npm requires Node.js 22.13 or newer. The projects still need their own JavaScript runtime; pnpm does not eliminate the need for nodejs.

### Importing the lockfiles

For projects with a `package-lock.json`, I used [pnpm import][3] before removing the npm lockfile:

```bash
pnpm import
pnpm install --frozen-lockfile
```

The import produces `pnpm-lock.yaml` from the existing lockfile. I kept the dependency ranges in `package.json` as they were. When doing migrations I prefer to avoid mixing in a lot of other changes that could break things.

Some of the older projects had no lockfile, and several used `*` for dependencies. Those needed an initial `pnpm install` to resolve versions and create a lockfile. There was no recorded set of versions to import. Getting an install to complete in one of those projects also does not tell me whether code written years ago still works with the packages it now resolves.

Once a replacement had passed a clean install, I removed the old npm lockfile. Keeping both would let npm and pnpm have separate lists of dependencies drift apart.

### Dependency overrides

This blog had an npm override for a dependency of `yaml-language-server`. That needed to move out of `package.json` and into `pnpm-workspace.yaml`:

```yaml
overrides:
  'yaml-language-server>yaml': '2.9.0'
```

The selector applies the override to `yaml` under that specific parent. I also had an override in another project that referenced a direct dependency's version.

`pnpm-workspace.yaml` holds [pnpm settings][4], including overrides and dependency build permissions.

### Dependency build scripts

The first install pass skipped scripts so I could inspect the dependencies. The normal install check then caught this in the blog:

```text
ERR_PNPM_IGNORED_BUILDS
Ignored build scripts: esbuild@0.28.2
```

pnpm requires a decision about which dependencies can run installation scripts. For the blog, I allowed esbuild in `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  esbuild: true
```

Other projects needed their own entries for native dependencies such as `better-sqlite3` and `argon2`. I reviewed the install scripts and recorded the decisions per project. [pnpm approve-builds][5] can also manage these entries.

One project already had an `ignoredBuiltDependencies` list from an older pnpm configuration. That setting is ignored in pnpm 12. I converted its entries to `false` values under `allowBuilds` to preserve the existing decision to skip them.

### Updating build configuration

In order to complete the migration I had to update anything that was previously building projects with `npm`. I updated package scripts that invoked npm, Playwright server commands, GitHub and Gitea workflows, GitLab CI, Dockerfiles, Readmes, and more. This is where AI came in handy.

The commands I use most often are nearly the same:

| Task                            | npm                   | pnpm                             |
| ------------------------------- | --------------------- | -------------------------------- |
| Install dependencies            | `npm install`         | `pnpm install`                   |
| Install from the lockfile in CI | `npm ci`              | `pnpm install --frozen-lockfile` |
| Run a project script            | `npm run build`       | `pnpm run build`                 |
| Run an installed tool           | `npx playwright test` | `pnpm exec playwright test`      |

I kept npm commands where they serve a separate purpose. One project publishes to the npm registry and tests that people can install its published package with npm. Those commands still belong in that project even though development dependencies are installed with pnpm.

## Verification

All 26 directories passed a fresh install with `--frozen-lockfile`.

The main applications passed their builds and unit tests. This blog passed its TypeScript, HTML validation, redirect, and internal-link checks.

Some projects were less consistent. An old Docusaurus site and a Next.js example relied on dependencies they had not declared directly. There were also errors in their existing content and source files. I left those as deprecated projects instead of turning this migration into an effort to maintain them again.

## Closing thoughts

Importing the lockfiles was easy. Most of the work was finding the other places that assumed npm: a container stage, a workflow, a script calling another script, or a development command in the docs. The build-script settings also needed attention, including in a project that was already using pnpm.

I now have the same pnpm version recorded across these projects, with a lockfile for each one. I already use Renovate to manage dependencies and it already supports the config for package manager in `package.json`. I can keep `pnpm` up to date using Renovate which generates pull requests to update to the latest version for each project.

## Sources

- [pnpm][1]
- [Installing pnpm 12][2]
- [Importing an existing lockfile][3]
- [pnpm configuration][4]
- [Approving dependency build scripts][5]

[1]: https://pnpm.io/
[2]: https://pnpm.io/installation
[3]: https://pnpm.io/cli/import
[4]: https://pnpm.io/settings/dependency-resolution
[5]: https://pnpm.io/cli/approve-builds
