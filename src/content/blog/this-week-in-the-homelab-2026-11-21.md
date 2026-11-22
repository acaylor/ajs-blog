---
title: 'This week in the homelab- November 21, 2026'
author: aj
date: 2026-11-21
image: /images/this-week-in-the-homelab-2026-11-21/hero.jpg
description: 'Qwen3.8 on the cluster GPU, 256K context on the RTX 5090, a shared mise config across four hosts, Isle of Babel 2 milestone one, and a new Godot project.'
categories:
  - Homelab
tags:
  - this-week-in-the-homelab
  - homelab
  - ollama
  - qwen
  - herdr
  - mise
  - godot
  - renovate
---

[Last week](/posts/this-week-in-the-homelab-2026-11-14/) was about monitoring. This week was mostly about local models and GPUs: a new model for the cluster's 4090, a much bigger context window on my workstation, and two Godot projects that kept both GPUs busy in between.

## Qwen3.8 on the cluster

The Ollama instance on the RTX 4090 in my k3s cluster ran `gemma4-64k` for [Hermes Agent](/posts/hermes-agent-on-kubernetes/) at about 10 tokens per second. I replaced it with Qwen3.8-27B and pointed Hermes at the new model. Both are Argo CD apps, so the change was three commits to my private Kubernetes manifests repo:

- Switch Ollama and Hermes to `qwen3.8:27b` with a 128K context.
- Run Ollama without AppArmor confinement so it can stop its own model runners. An old runner process had been holding 23 GB of VRAM for three days, and Ollama couldn't kill it.
- Shrink the context to 116K, the largest that fits fully on the GPU.

It now runs entirely on the 4090 at about 85 tokens per second. I have a separate post in progress covering the switch, the context sizing, and the AppArmor bug.

## 256K context on the RTX 5090

A year ago, in [OpenCode and Ollama](/posts/opencode-ollama/), I raised Ollama's context window to 16K so OpenCode's tool calls would work. This week I ran the same Qwen3.8-27B model on my RTX 5090 workstation (`papa`) with its full 256K context, entirely on the GPU, at about 128 tokens per second. I'll publish the full setup and benchmarks in a follow-up post.

## Herdr

Last week I said I'd spend more time with the Herdr desktop and mobile apps. I wrote up the result in [Herdr desktop across three machines](/posts/herdr-desktop-app/): one view of my MacBook, Linux workstation, and Mac mini, with real terminals alongside agents, plus mobile access through Herdr Core.

The verdict: I liked both apps, and the desktop app is a step in the right direction, but they haven't given me enough reason to switch away from the Herdr TUI.

## One mise config everywhere

My [linux_setup](https://github.com/acaylor/linux_setup) repo holds the mise manifest for my workstations, but every machine had drifted a little from it. I deployed the manifest as `~/.config/mise/config.toml` on all four machines (two Macs and two Linux hosts), and the file hashes now match everywhere. Anything that belongs to just one machine goes in an untracked `config.local.toml`. Two macOS packages moved as part of the cleanup:

- The Herdr desktop app's cask moved into the shared macOS list, along with `homebrew-app`.
- Steam moved out of the shared list and into the one Mac that actually runs it.

`mise ls --missing` is empty on every host. My private dotfiles repo on Gitea now tracks the shared config too, and I turned on Renovate there.

## Isle of Babel 2

Isle of Babel 2 is a private GitHub follow-up to [Isle of Babel](/posts/fable-5-access-restored/), the quiet Myst-inspired exploration game I built in Godot. Unlike the first game, which generated everything in GDScript, this one builds its 3D assets with Blender scripts. I develop it with coding agents through pull requests and GitHub Actions CI, and this week I merged its first milestone as a stack of four PRs:

- **Blender generators:** seeded scripts that build the tower blockout and the volcanic island headlessly. The summit sits 1,100 m above the sea.
- **Capture and benchmark harness:** player-view and fixed-camera rendering that reports median and p95 frame times, draw calls, and primitive counts.
- **First-person player:** walking, sprinting, and mouse look—no jumping, so hip-height parapets act as barriers. Walk tests drive the player around the lowest terrace and into its parapet. To verify they catch real breakage, I rebuilt the island without the parapet and again with a floor gap; both failed.
- **Exterior scene:** two weather presets, an ocean shader, and a layer of clouds below the summit. The spawn view renders in under a millisecond per frame on the 4090.

Two architecture decision records went in alongside them. The project stays on Godot 4.7.2 until 4.8 is stable, and CI imports `.blend` files directly in Godot instead of tracking exported `.glb` copies in the repo. A cold import takes about 3 seconds on my workstation and 14 seconds on the [ephemeral Actions runners](/posts/actions-runner-controller-homelab/) I set up last week, with the whole CI job finishing in about 2 minutes.

Two benchmark bugs turned up along the way: every benchmark reported exactly 16.6 ms until I turned vsync off, and about one capture in nine still writes every frame but never exits.

![Fixed-camera capture of Isle of Babel 2 showing the white tiered tower blockout perched on the dark volcanic summit above green lower slopes, scattered clouds, and an ocean stretching to a distant island on the horizon.](/images/this-week-in-the-homelab-2026-11-21/isle-of-babel-2-exterior.png)

## Meridian House

I also started another private Godot project: Meridian House, a first-person walkthrough of a private home in Earth orbit. It has eight compartments off a promenade, from an observation lounge with a brass armillary sphere to a shuttle hangar with a two-seat tender. Blender scripts generate the whole station, and Godot loads the exported model.

Most of the week's pull requests refined one room at a time. The last one was about performance. Full screen on my MacBook Pro dropped to 23–40 fps because it draws about 7.5 megapixels, roughly seven times the default window. Rendering 3D at a fixed 4.1-megapixel budget and upscaling with FSR 2 raised every room by about 60%, to 37–64 fps.

That budget was tuned for the MacBook, so on the RTX 5090 it gave up resolution for no reason. An open pull request adds a graphics settings menu and an adaptive Auto mode that adjusts the render scale once a second to hold a target frame rate.

![In-game view of Meridian House's observation lounge with two rust-colored sofas around a low wood coffee table, potted plants, tiled floor, and panoramic windows looking out over the curved blue-and-white horizon of Earth against a starry sky.](/images/this-week-in-the-homelab-2026-11-21/meridian-house-lounge.jpg)

## Updates

Renovate opened the usual stream of pull requests. The ones I merged:

- In the cluster: Hermes Agent 0.23.2, n8n 2.49.2, `prometheus-pve-exporter` 3.12.0, the CloudNativePG PostgreSQL 18.7 image, and four SearXNG releases.
- On `vega`: Gitea 28.4.0.
- On my Docker hosts: cAdvisor 0.61.0.

Still open: AdGuard Home's 1.0 release on `blackhole`. It's a major version for my DNS server, so I want to read the release notes before merging it.

This blog moved to Node 26 LTS. Node 25 stopped bundling corepack, so CI and the Docker build now install pnpm with `npm install -g pnpm@12`, and pnpm switches itself to the exact version in `package.json`.

## Next

Next week I plan to finish and publish the two Qwen3.8 and Ollama write-ups, review the AdGuard Home 1.0 release notes before merging that upgrade, and land Meridian House's adaptive render-scale PR while continuing work on Isle of Babel 2.
