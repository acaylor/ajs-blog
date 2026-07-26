---
title: 'The Winding Gallery, an endless 3D photo gallery'
author: aj
date: 2026-07-26
description: 'I built a fantasy 3D photo gallery with Claude Code: point it at any folder of photos and they hang in an endless moonlit night, with a guided tour mode that turns a TV into an exhibition of your own photography.'
categories:
  - Software Development
tags:
  - open source
  - three.js
  - webgl
  - photography
  - claude-code
  - fable
image: /images/the-winding-gallery/the-path.jpg
---

[In a previous post][1] I wrote about adopting someone else's realm aka GitHub project. This is somewhat of a follow-up: building a new realm with Claude Code and the Fable 5 model.

I take a lot of landscape photos, and they live the way everyone's photos live: in folders, seen once, sorted never. The pitch I typed into the terminal was roughly: _a fun and interactive 3D environment that is a dynamic photo gallery. Load any directory full of photos and they become an infinitely scaling gallery. Fantasy themed._ What came out the other side is [**The Winding Gallery**][2] — [live site][3], `npm i -g the-winding-gallery`, point it at a folder, walk.

![The winding cobblestone causeway at night, gold-framed plates glowing along the path above moonlit mist.](/images/the-winding-gallery/the-path.jpg)

## A place, not a page

Every photo app I've used is a grid, and grids are forgettable. I scroll past my own photographs the way I scroll past everything else. I wanted something interactive and with AI tools you can bring you imagination to life, sometimes in 3D like today.

The Claude AI model Fable 5 came up with a few constraints:

- **Endless by construction.** The path generates ahead of you and dissolves behind you, and when the collection runs out it begins again. A folder of eight photos and a folder of eight thousand both make an infinite place (I have not tested thousands of photos all at once but that is the general idea).
- **One command against any folder.** No import step, no library database, no uploading anything. The photos stay where they are on the filesystem while you point the Winding Gallery program at the appropriate directory.

![The causeway climbing among floating islands under the aurora and milky-way band.](/images/the-winding-gallery/vista.jpg)

## Two ways to browse

- Walking is the default (WASD, pointer lock, press `E` at any plate and the camera flies up close while a parchment panel names the photograph).

- Press `T` and a **Guided Tour** begins: a glowing wisp drifts ahead to the next plate, the camera follows, beholds the photograph for a few unhurried seconds, then glides on until stopped. Any key hands control back.

The tour shipped as a feature because it can be used to show a gallery on a TV easily.

- `winding-gallery ~/Pictures/iceland-2025` plus `?auto&tour` in the URL is a **kiosk**: fullscreen it on the living-room TV and you have a slideshow with weather. This is a very different way for guests in my home to view Photos instead of just swiping forever on a touch screen.
- Subdirectories become **wings** of the gallery, each announced by a stone waygate.

Guided mode turned out to be the product. Walking is the garnish.

| Walking the path                                                                       | Beholding a plate                                                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| ![A lantern burns over the cobblestone path.](/images/the-winding-gallery/lantern.jpg) | ![The camera flown close to a plate, with its parchment name panel.](/images/the-winding-gallery/behold.jpg) |

![The Keeper's Tour: a wisp leads the camera from plate to plate.](/images/the-winding-gallery/keepers-tour.jpg)

![A stone waygate carved with a wing name, marking where a subfolder's photographs begin.](/images/the-winding-gallery/waygate.jpg)

## Boring tools on purpose

This is a **buildless vanilla JavaScript** project to keep things simple.

- **three.js is the only dependency.** The browser imports ES modules directly via an import map. No bundler or Typescript (yet).
- **The server is `node:http`**, zero dependencies, ~150 lines: scan a photo directory, stream images, serve the app.
- **Tests run on `node --test`.** The built-in runner leaves out an entire category of devDependencies to keep the project lean.
- **pnpm 11 and Node 24**, which taught me one sharp edge: pnpm 11 uses `node:sqlite`, so it needs Node ≥ 22.13. The Fable 5 Agent used a Node 20 CI job which died in the _cache step_, before any test ran. Node 20 was past EOL anyway; the minimum version moved to 22.
- **CC0 assets, fetched by script.** [ambientCG][4] PBR textures for the stone and bark, the Khronos sample lantern crushed from 9.6 MB to 271 KB with glTF-Transform, Poly Haven boulders for the floating islands. The whole npm package stays around 2 MB. I had the Agent find these -- I'm sure if I was less lazy I could find better assets but that can come later.

The one real algorithm in the code is the path. It's a heading integrated over overlapping sine curvatures, with amplitudes bounded so the minimum turn radius always exceeds the path's width. The causeway can wander forever and provably never cross itself, and that property is a unit test. You can't create 3D software without a lot of math. What is interesting to me in this project is how AI Agents can create these algorithms based on a simple description of what you want, I'm not smart enough to come up with all this math on my own.

## Refining the project

_Here I had the agent critique itself:_

The Agent Hollow post ended on the observation that every visual feature ships wrong in ways unit tests can't see, and the fix is _looking at the thing_. That held here with embarrassing consistency. The floor spent its first hour invisible (triangles wound clockwise, backface culling ate the road). The first 180 meters had no photographs (the world built itself before the photo list arrived from the server). Each plate's soft glow sliced through the photo plane at certain angles as a razor-sharp seam nobody would ever debug from code.

This time even screenshots fought back: headless Chrome suspends `requestAnimationFrame` shortly after load, so naive `--screenshot` runs showed a world frozen at frame three. The harness that stuck drives Chrome over the DevTools Protocol, pumps frames by requesting captures (each one forces a render), and reads app state through a `window.__winding()` hook. That rig ended up verifying the glide, the plate-beholding flight, and the whole tour mode end to end in a real browser.

Later releases kept paying into the same ledger. The Wayfarer's Map was _permanently visible_: my `#way-map { display: grid }` rule silently defeated the `hidden` attribute, because author CSS beats the UA's `[hidden] { display: none }`. Every state variable passed; every screenshot said otherwise. The E2E now asserts _computed_ visibility, and a global `[hidden] { display: none !important; }` retires the bug class.

![The Wayfarer's Map overlay listing every wing of the gallery.](/images/the-winding-gallery/wayfarers-map.jpg)

### The prerelease version that earned its keep

The release pipeline is the same tokenless setup as Agent Hollow's (npm Trusted Publishing via OIDC, tag-triggered, provenance attested) with one addition I now want everywhere: **dist-tag staging**. A `v0.2.0-rc.1` tag publishes to npm's `next` tag; the stable tag goes to `latest`.

The release candidate caught a real bug. Installed fresh from the registry, the gallery was a black screen: every `/vendor/three/*` request 404'd. npm _hoists_ dependencies. In a consumer install, `three` is a sibling of the package, not nested inside it, and my hardcoded `node_modules/three` path only worked in the dev repo. All the tests passed. The repo was fine. The _artifact_ was broken, and only installing the artifact could show it. The fix was `createRequire().resolve('three')`, plus a regression test that packs the actual tarball, installs it into a fresh prefix, boots the installed CLI, and walks every endpoint. I verified the test fails against the old code before trusting it.

The markdown changelog became integrated: the publish workflow extracts the tagged version's section from a [Keep a Changelog][5] file for the GitHub release notes and **fails the publish if a stable tag has no section**. The changelog is a gate for release now.

### Playtesting

I did not like the tree assets after trying out the first few versions. The gallery now _renders its own_ windswept pines procedurally: a spline-swept trunk wearing the bark texture we already had, needle cards baked into merged geometry. Zero new assets, the package got 1.5 MB smaller, and the merged version draws fewer calls than the sparse one (~1,255 → ~588 at the hero viewpoint) while the foliage tripled.

I tracked another problem in a GitHub issue and assigned a new Claude Code agent: _the bloom is overdone, there are floating blue specks around the lanterns, and I can see the islands through my photographs._

The bloom was more AI-generated arithmetic: photographs peak around 1.05 in the HDR frame, and the threshold sat at 0.8, so every bright sky bloomed white halos over the plaques. Raising it to 1.1 (below the flames riding at 1.7×) fixed it with one constant.

The see-through photographs were a problem with Ambient Occlusion. It looked like transparency. It was actually lighting. Another feature proved it: `?quality=low` (no AO) rendered the plate spotless.

The blue specks were due to an issue in the shader giving off a halo around light sources.

![Plates on the path: warm sky light on one frame, aurora on another.](/images/the-winding-gallery/plate-amber.jpg)

![A plate beneath the aurora, after the bloom threshold fix.](/images/the-winding-gallery/plate-aurora.jpg)

## The screenshots left the repo

Every visual release had been recapturing eleven README screenshots and committing them, and a `git count-objects` audit showed the receipts: **17.3 MB of a 21 MB pack was screenshot history**. The repo was becoming a photo album about a photo gallery.

I took screenshots out of git and erased them from the git history. The web site for this app hosted on GitHub Pages now boots the gallery on a GitHub actions runner, drives a headless browser through all eleven viewpoints, and ships the site plus fresh captures as the deploy artifact. The runner's software GPU renders the full pipeline - AO, bloom, film grain - indistinguishably, just slowly, and slow is fine since it is free on a public repo.

Now the screenshots will stay up to date as the visuals of the project evolve. The captures in this post are copies of the [eleven viewpoints][3] the Pages deploy regenerates on every push to `main`; if the gallery looks different on the live site, the project has likely evolved since this post.

## Closing thoughts

Using three.js allows you to avoid writing a lot of boilerplate code and pulling in other dependencies. The AI models seem to be trained on how to build 3D environments using that library so let your imagination run wild.

If you have a folder of photos and a spare evening, [load up the Winding Gallery][2] and go for a walk. Or don't walk, just press `T` and put it on the TV to activate the tour mode.

---

_I used Fable 5 to help write this post about its own work. A new Anthropic model, Opus 5, came out right before I finished this post._

[1]: /posts/agent-hollow
[2]: https://github.com/acaylor/the-winding-gallery
[3]: https://acaylor.github.io/the-winding-gallery/
[4]: https://ambientcg.com
[5]: https://keepachangelog.com
