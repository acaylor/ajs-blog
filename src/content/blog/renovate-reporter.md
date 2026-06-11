---
title: Building Renovate Reporter
author: aj
date: 2026-06-10
description: 'A small Go web app for turning Renovate debug logs into a local dependency report.'

categories:
  - Software
  - Software Development
tags:
  - renovate
  - software
  - golang
  - docker
  - github-actions
---

I have written about [running Renovate][1] and [using Renovate with Docker containers][2] before. Renovate is good at finding dependency updates, opening pull requests, and explaining what it did. The harder part is reviewing the raw debug logs after a manual run.

I have been running Renovate manually against a few personal repositories across GitHub, Gitea, and GitLab. Each run writes a newline-delimited JSON log file. The data I want is in those logs, but reading thousands of JSON lines is not a good review workflow.

I wanted a faster way to answer a few questions:

- Which repositories have outdated dependencies?
- What package files did Renovate inspect?
- What current and latest versions did Renovate detect?

That led to [renovate-reporter][3], a small Go web app that turns a directory of Renovate debug logs into a local dependency report.

## The problem

My local workflow writes logs with names like this:

```text
gitea-2026-05-25_1215.log.json
gitlab-2026-05-25_1442.log.json
github-2026-04-08.log.json
```

Each file can contain thousands of JSON log entries. Somewhere in those entries are the repositories Renovate scanned, the package files it found, the dependencies it extracted, and the current and latest versions it calculated.

That is enough information to build a useful report. I just needed a small tool to parse it.

## The tool

`renovate-reporter` is intentionally small:

- It reads every `.json` file in a log directory at startup.
- It parses dependency extraction data from Renovate log entries.
- It keeps the parsed results in memory.
- It serves a local web UI on port `8080`.
- It polls for new log files every 30 seconds.
- It can export the selected report as CSV.

The command is simple:

```sh
renovate-reporter [--port N] <logs-dir>
```

For example:

```sh
renovate-reporter ./logs
```

Then open:

```text
http://localhost:8080
```

## What it shows

The UI is built around one table. Select a log file, then browse the dependencies Renovate found in that run.

The table shows:

- Repository
- Manager
- Package file
- Dependency name
- Package name
- Current value
- Current version
- Latest version
- Datasource
- Versioning
- Whether the dependency appears outdated

Outdated rows are highlighted. The table is searchable and sortable, which is enough to quickly scan a run and find the repositories that need attention.

The app also has a few small HTTP endpoints behind the UI:

```text
/api/logs
/api/deps?log=<filename>
/api/status
/export?log=<filename>
```

Those endpoints are not meant to be a public API. They are just enough to keep the frontend simple and make CSV export work.

## Why Go

This could have been a Python script, a notebook, or a static HTML generator. I tried a few of those approaches first.

Go ended up fitting the final shape of the tool:

- Read a directory
- Parse newline-delimited JSON
- Keep a small in-memory cache
- Serve HTTP
- Embed one HTML file
- Ship a single binary

Most of that is covered by the Go standard library. The resulting binary has no runtime dependency, which makes it easy to run locally or in a small container.

The parser is also forgiving. It skips lines that are not JSON, handles Renovate's newline-delimited log format, and can fall back to a single pretty-printed JSON file for smaller test fixtures.

## Running it

The easiest way to try it is to download a release from GitHub:

```text
https://github.com/acaylor/renovate-reporter/releases
```

Each release includes binaries for Linux, macOS, and Windows on `amd64` and `arm64`. The release also includes `checksums.txt` for verifying downloads.

On macOS with Apple Silicon, download the `darwin_arm64` archive, unpack it, and run:

```sh
./renovate-reporter ./logs
```

Go install works too:

```sh
go install github.com/acaylor/renovate-reporter@latest
```

![renovate_reporter](/images/renovate_reporter.png)

## Running with Docker

Release tags also publish container images to GitHub Container Registry. For example:

```sh
docker run --rm \
  -p 8080:8080 \
  -v "$PWD/logs:/logs:ro" \
  ghcr.io/acaylor/renovate-reporter:v0.1.0
```

That mounts the local `logs/` directory read-only inside the container and exposes the UI on `localhost:8080`.

The Docker Compose version is small:

```yaml
services:
  renovate-reporter:
    image: ghcr.io/acaylor/renovate-reporter:v0.1.0
    ports:
      - '8080:8080'
    volumes:
      - ./logs:/logs:ro
```

Start it with:

```sh
docker compose up -d
```

I like the container option because the runtime image is just the compiled static binary in a distroless base image. There is no Go toolchain in the final image and nothing to install locally.

## Release workflow

Since this project is hosted in GitHub, I set up GitHub Actions workflows so that new versions of the app are packaged and ready to deploy as a container as well as executable binaries for any system.

The release process is tied to the changelog. The project keeps a `CHANGELOG.md` using the Keep a Changelog format. When I push a tag like `v0.1.0`, the release workflow checks that the changelog has a matching `## [0.1.0]` section.

If the section is missing or empty, the release fails. If it is present, GitHub Actions:

- Runs the tests
- Builds binaries for Linux, macOS, and Windows
- Generates SHA-256 checksums
- Creates a GitHub release using the matching changelog section as release notes
- Publishes the tagged Docker image to GitHub Container Registry

That keeps the tag, changelog, GitHub release, binary artifacts, and container image lined up around the same version.

## Implementation notes

The reporter extracts dependency rows from Renovate log objects that include repository configuration data. For each dependency it records the repository, package file, dependency name, datasource, versioning, current version, and latest version.

Choosing the latest version takes a little care. Renovate dependencies can include an `updates` list. The reporter picks the update with the newest `releaseTimestamp` when one is available, then falls back to the last update entry. If there are no updates, it falls back to the current version or current value.

It also deduplicates rows with a key made from:

```text
repository, package file, dependency name, current version, current value
```

That keeps repeated log messages from turning into duplicate table rows.

## What this is not

This is not a replacement for Renovate dashboards, dependency management platforms, or persistent reporting.

It is a local inspection tool. It is useful when I have a directory full of Renovate logs and want to quickly understand what Renovate saw. There is no database, no authentication, no deployment story, and no background ingestion service. The log files are the source of truth.

Most of the time I am just merging Renovate Pull Requests but when a project gets very out of date this tool is helpful to understand the scope of what needs to be updated.

## Next steps

The current version is already useful, but there are a few directions I might take it next:

- Compare two log files and show what changed.
- Add filters for platform, repository, manager, and datasource.
- Store parsed results in a database for historical analysis.
- Show repository-level summaries above the dependency table.
- Add install examples for package managers like Homebrew.

For now, the simple version solves the problem I had. It takes data Renovate already produced and makes it easy to browse from a local web page.

The source is on [GitHub][3].

_Disclaimer: I used an LLM to assist with this tool and post. Opinions expressed are my own._

[1]: /posts/renovate
[2]: /posts/renovate-docker
[3]: https://github.com/acaylor/renovate-reporter
