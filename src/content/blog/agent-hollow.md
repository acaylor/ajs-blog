---
title: 'Agent Hollow, a pixel-art realm for my AI agents'
author: aj
date: 2026-07-11
description: 'How I forked Age of Agents into Agent Hollow. a rebrand, a day/night cycle, buildings lit from the inside, fireflies, and a tokenless npm release pipeline.'
image: /images/agent-hollow/fantasy-realm-night.png
categories:
  - AI
  - Software Development
tags:
  - ai
  - anthropic
  - claude
  - claude-code
  - fable
  - llm
  - testing
  - agent-hollow
---

There's a small genre of software I found I can't resist: tools that turn invisible work into something you can _watch_. [Age of Agents][1] by Mateusz Pawelczuk is a local web app that reads your AI coding session transcripts (Claude Code, Codex, OpenCode, Koda) and renders them as a peaceful Age-of-Empires-style pixel realm. Every session is a settler walking out of the keep. Code edits happen at the forge, web research at the mage tower, and your token usage fills the storehouse.

The project had gone quiet upstream, and I had local changes accumulating with nowhere to go. So I forked it. It's now [**Agent Hollow**][2]. There is a [live GitHub Pages site][3], an `npm i -g agent-hollow` install, and a short `hollow` command. To be completely clear about provenance: the realm, the architecture, and every sprite are Mateusz's work, and the LICENSE, README, and site all say so.

This is not quite a sequel to [the last Fable 5 post][4], but it picks up the same thread: what happens when I give the model a visual project and ask it to verify what it builds. This time I sent Fable 5 into an existing pixel-art world and asked it to help make the fork its own.

![an Agent Hollow session panel showing the agent's task, token usage, context window, and recent activity](/images/agent-hollow/session-panel.png)

## The rebrand nobody sees (and the one everybody does)

Renaming a project sounds like find-and-replace. 125 files' worth: the npm package, two CLI bins, workspace packages (`@agent-citadel/*` → `@agent-hollow/*`), an env-var prefix (`AOA_*` → `HOLLOW_*`), a config directory, even the session-token HTTP header. The interesting failures were the things a grep for the old name _doesn't_ catch:

- A test that hashed the fixture project name to pick which building a settler calls home. Renaming the fixture changed the hash, which changed the building, which failed the assertion.
- `localStorage` keys carrying a brand two renames old.
- A ☕ Ko-fi "Support" button on the landing page still pointing at the original author's donation page. I don't want to collect money for this, and quietly collecting it _for someone else_ on a page under my name is worse so it's gone.

## A day/night cycle, then a better one

I wasn't just going to copy the project and call it a day. I prefer dark mode for apps, so I wanted a night mode for Agent Hollow.

This is the first new feature: the realm follows your local clock. A keyframed palette (moonlit night → dawn glow → day → amber dusk) drives a multiply-blend overlay across the world, with a `?hour=22` URL override for previewing any time of day.

Version one lit buildings at night with a warm radial glow sprite floating over each one. It worked, and it was ugly because every building wore the same yellow blob like a costume.

Version two is the outcome I liked: **buildings lit from the inside**. At load time we read each building sprite's pixels and extract just the windows into an "emission" texture, rendered additively above the night overlay, pixel-aligned with the building. Windows glow; walls stay dark; a faint pool of light spills out each door.

"Just the windows" is doing a lot of work in that sentence. A naive bright-and-warm pixel test lit up half the map:

- The mine's pale stone highlights glittered like a disco ball → require actual color **saturation**.
- The keep's salmon entrance ramp glowed flat pink → require a warm **hue** (real lamplight is yellow-orange: green well above blue; painted brick has green ≈ blue).
- The arena's entire sand floor lit up like a stadium → run **connected-component analysis** on the lit mask and drop large regions; windows are small clusters, floors aren't.
- The stable's hay still out-shone everyone's windows → scale each building's emission intensity down as its lit area grows, so a hay yard reads as a warm smolder instead of a beacon.

Each of those issues was identified by having Fable 5 take screenshots while it worked, then using what it found to refine the appearance.

## Fireflies and shooting stars

With night looking good, I added some life: after dusk, fireflies drift and blink across the gardens (warm ember motes on the sci-fi Mars colony), and every 16–42 seconds a shooting star streaks across the realm. The drift is a little seeded Lissajous wobble; the scheduling and motion are pure functions with unit tests.

![the Agent Hollow sci-fi realm at night, with the Mars colony glowing from within](/images/agent-hollow/scifi-realm.png)

Two bugs made this feature a good story about verification.

First, the stars fired exactly on schedule: off-screen, in a margin of the world that the camera crops away. I only knew they were spawning at all because I instrumented the spawn and watched the browser console.

Second, once repositioned, both stars _and_ fireflies were nearly invisible, because they rendered underneath the night overlay and the multiply tint crushed them. They now live in a dedicated layer above it.

Here is one area where Fable 5 impressed me:

How do you verify a shooting star that appears for one second every half minute? Screenshot bursts — 80 frames at 650 ms intervals, then a little script that scans each frame for a bright streak. Frame 36 had it.

The model figured out how to capture the screenshot without any guidance from me.

## Shipping without secrets

The release pipeline ended up nicer than most of my "real" projects:

- **npm Trusted Publishing.** Pushing a `v*` tag runs a workflow that publishes with OIDC. GitHub proves to npm that _this repo's_ `publish.yml` is running, npm issues a short-lived credential for that one publish, and a provenance attestation gets generated automatically. There is no `NPM_TOKEN` secret because there is no token.
- **GitHub Pages, the hard way first.** The legacy Jekyll-ish Pages builder hung indefinitely on this repo — twenty minutes of "building," twice. Switching to workflow-based deploys (`upload-pages-artifact` + `deploy-pages`) fixed it, mostly: the Pages backend still intermittently rejects deployments with "Deployment failed, try again later," and re-running the failed workflow _always_ fails because the rerun uploads a duplicate artifact. The fix that stuck: retry once _inside the same run_ (one artifact, no duplicate) after a cool-down.
- Every action SHA-pinned, full test suite (589 tests) as a publish gate via `prepublishOnly`.

Here is the complete npm workflow. The two lines that make Trusted Publishing work are the `id-token: write` permission and `npm publish`; there is deliberately no token passed to the job.

```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      - run: npm install -g npm@latest
      - run: npm ci
      - run: npm publish
```

When a version tag is pushed, GitHub checks out that exact revision, installs a version of npm new enough for Trusted Publishing, and performs a clean install. `npm publish` first invokes the package's `prepublishOnly` script, which builds the client and server and runs the full test suite. If that passes, npm exchanges GitHub's short-lived OIDC identity for publish access and records provenance tying the package to this repository and workflow. The npm package settings must separately name `acaylor/agent-hollow` and `publish.yml` as the trusted publisher; possession of the repository alone is not enough.

## Closing thoughts

Forking respectfully is mostly about credit plumbing: the LICENSE keeps the original copyright and adds yours; the README says whose design you're living in; the fork's GitHub lineage stays intact. That part took an afternoon.

The part that took the real time, and where pairing with an agent genuinely changed the loop, was _looking at the thing_. Almost every visual feature in this list shipped wrong on the first try, in ways type checkers and unit tests can't see: blobs instead of windows, badges covering the characters they identified, stars performing to an empty theater. Screenshots, crops, and dumb pixel-counting scripts caught all of it. The realm looks calm; getting it there wasn't.

If you run AI coding agents and have a spare corner of a monitor, give [Agent Hollow][2] a look. If you like the bones of it, the original [Age of Agents][1] is where they came from.

---

_I used Fable 5 to help write this post about its own work._

[1]: https://github.com/agentsmill/age-of-agents
[2]: https://github.com/acaylor/agent-hollow
[3]: https://acaylor.github.io/agent-hollow/
[4]: /posts/fable-5-access-restored/
