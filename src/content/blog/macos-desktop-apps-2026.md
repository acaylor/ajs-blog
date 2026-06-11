---
title: macOS desktop apps I like in 2026
author: aj
date: 2026-04-30
draft: true
description: A short list of macOS desktop utilities I keep installed in 2026.

categories:
  - macOS
  - Software
tags:
  - macOS
  - software
  - desktop apps
  - productivity
  - menu bar
---

I have written a few posts about setting up macOS and the command line tools I use, but there are still a few regular desktop apps that are worth calling out on their own. These are not big productivity suites or apps that try to take over how you work. They are small utilities that make macOS feel more comfortable day to day.

The tools I keep coming back to are [Thaw][1], [Rectangle][2], and [Stats][3].

This is a short post. I mostly want to document what I actually install on a mac in 2026 and why these apps continue to make sense for me.

## Thaw

Thaw is a menu bar management app for macOS. It can hide and show menu bar items, organize them into sections, and reveal hidden items when you hover over or interact with the menu bar.

If you have used macOS for any amount of time, you know the menu bar can get crowded quickly. A VPN client, sync tool, calendar app, monitoring app, weather app, password manager, and a few work tools will fill the top right of the screen before you realize it. On newer MacBooks with a notch, this is even more noticeable.

Thaw helps keep that area under control without removing the apps I still want running. I like this style of utility because it does not ask me to change my workflow. It just makes the default macOS desktop less noisy.

Thaw is a fork of Ice and appears to be focused on keeping that idea working with newer macOS releases. The project describes itself as targeting macOS 26, which makes it especially relevant for a 2026 mac setup.

Install with Homebrew:

```shell
brew install thaw
```

Or download the app from the [GitHub releases page][4].

## Rectangle

Rectangle is probably one of the first apps I install on any mac. It adds keyboard shortcuts and snap areas for moving and resizing windows.

macOS has improved window management over the years, but I still prefer Rectangle because the keyboard shortcuts are fast and predictable. I use it constantly when moving between a browser, terminal, editor, notes, and documentation. I do not want to slowly drag windows around all day.

The main shortcuts I use are:

- Move the current window to the left half of the screen.
- Move the current window to the right half of the screen.
- Maximize a window.
- Move a window into thirds when I am on a wider display.

This is especially useful when working on code. I often want a terminal on one side and a browser or editor on the other. Rectangle makes that muscle memory instead of a small manual chore repeated a hundred times.

Install with Homebrew:

```shell
brew install --cask rectangle
```

You can also download it from [rectangleapp.com][5] or the [GitHub releases page][6].

## Stats

Stats is a macOS system monitor that lives in the menu bar. It can show CPU, GPU, memory, disk, network, battery, sensors, Bluetooth devices, and clocks for multiple time zones.

I like having a quick view of system health without opening Activity Monitor. If a fan spins up, a laptop gets warm, or the network feels strange, Stats gives me a quick signal. It is not a replacement for real observability tooling, but it is perfect for local desktop awareness.

I usually keep the display simple. Too many graphs in the menu bar can become its own kind of clutter, which is also why pairing Stats with a menu bar manager like Thaw makes sense. I want the information available, not screaming at me all day.

Install with Homebrew:

```shell
brew install stats
```

Or download the app from the [Stats releases page][7].

## Why these apps stick

What these three apps have in common is that they solve small desktop annoyances:

- Thaw keeps the menu bar readable.
- Rectangle makes windows easy to arrange.
- Stats gives a quick glance at system activity.

None of them require much setup, and none of them are trying to become the center of the computer. That is probably why I like them. They make macOS feel better while staying out of the way.

For a new macOS setup in 2026, these are easy recommendations. Install them, configure the defaults once, and then mostly forget about them until you notice how annoying a clean macOS install feels without them.

[1]: https://github.com/stonerl/Thaw
[2]: https://github.com/rxhanson/Rectangle
[3]: https://github.com/exelban/stats
[4]: https://github.com/stonerl/Thaw/releases
[5]: https://rectangleapp.com
[6]: https://github.com/rxhanson/Rectangle/releases
[7]: https://github.com/exelban/stats/releases
