---
title: 'Eight AI models built an LCARS system monitor'
author: aj
date: 2026-08-14
description: 'Eight AI models built a Star Trek LCARS terminal system monitor, I scored the visuals under randomized IDs before opening the identity map, and then used a 100-point engineering rubric to analyze the results.'
categories:
  - Software Development
tags:
  - terminal
  - rust
  - golang
  - llm
  - ai
  - claude-code
  - opencode
image: /images/lcars-terminal-blind-evaluation/collage.png
---

There have been a lot of AI models released in the Summer 2026 season. I had a fun idea for a terminal app based on a classic Sci-fi Show. I had eight models each build a Star Trek LCARS-inspired terminal system monitor. I developed a prompt describing what I wanted and gave it to each AI model. I used Claude Code for all Anthropic models and OpenCode for everything else.

Every submission got a randomized ID, `V01` through `V08`. Every visual score was written down and committed before the identity map was opened. I developed a rubric to evaluate each application. First each submission was evaluated for visual appeal and then each was evaluated for software engineering quality.

![Eight LCARS terminal system monitors rendered at 120x36, labeled with model name and final score.](/images/lcars-terminal-blind-evaluation/collage.png)

The visual half and the engineering half agreed at the top and disagreed sharply in the middle. That disagreement is the interesting part.

## The assignment

The prompt asked for a production-quality terminal application with a distinctive LCARS interface; asymmetric framing, sweeping rails, elbow and pill shapes approximated with terminal glyphs, bold color fields, deliberate negative space. Explicitly _not_ `htop` with an orange theme.

The functional requirements:

- A primary command view integrating local time with seconds, date, hostname, uptime, overall CPU, load averages, memory, root disk usage, and network RX/TX rates.
- A secondary diagnostic view with OS and architecture, per-core CPU, swap, process count, and the top five processes by CPU. The process list must **not** appear on the default screen.
- A complete baseline in `xterm-256color`, 24-bit color as progressive enhancement only.
- macOS and Linux support.
- Standalone executables, reproducible builds, no runtime dependency, no elevated privileges.
- Terminal state, cursor visibility, and input mode restored after normal exit or interruption.
- A deliberately simplified display at `80x24`, graceful behavior at extreme sizes, a monochrome mode, and an ASCII-safe fallback.
- Tests for sampling, rate calculation, layout, and terminal-independent rendering.

Each model chose its own language. Six chose Rust. Two (Opus 4.8 and Fable 5) chose Go, both arguing explicitly that cross-compilation and single-binary distribution mattered more here than Rust's marginal runtime edge. Both were right enough that neither lost points for it.

## Making it actually blind

Every submission was copied into a clean workspace with build caches, prebuilt binaries, and the model's own supplied captures excluded. That last exclusion is the important one: a model that ships a flattering screenshot of its own work should not get to enter that screenshot as evidence.

Each workspace got a randomized ID. The identity map lived in a file I did not open until the visual scores were written. Visual assessment used only the fresh captures: primary and diagnostic views at 120×36, primary at 80×24, a 40×10 stress case, a reduced-color pass, and an ASCII fallback pass.

Then each project was built and run natively on Ubuntu x86_64 and macOS 26.6 arm64, put through its documented format/test/lint toolchain, and exercised for help, pause, view switching, rate controls, and in-session resizing. Lifecycle probes covered normal exit, <kbd>CTRL</kbd> + <kbd>C</kbd>, `SIGTERM`, and redirected output. Displayed metrics were compared against native reference sources on both machines at the same moment.

The screenshots in this post are fresh again. I rebuilt all eight from source and re-captured them at 120×36 while writing this. The hostname is the only thing edited; everything else is my actual machine on a Thursday.

## The blind visual scores

35 of the 100 points were visual, split into composition, LCARS fidelity, and polish. Here is what I recorded before I knew who was who.

| ID  | Composition /15 | LCARS /15 | Polish /5 | Visual /35 |
| --- | --------------- | --------- | --------- | ---------- |
| V01 | 14.5            | 14.0      | 4.5       | **33.0**   |
| V02 | 14.0            | 12.0      | 4.0       | **30.0**   |
| V03 | 13.5            | 12.0      | 4.0       | **29.5**   |
| V04 | 12.5            | 9.5       | 3.5       | **25.5**   |
| V05 | 14.0            | 13.0      | 4.5       | **31.5**   |
| V06 | 12.5            | 13.0      | 4.0       | **29.5**   |
| V07 | 14.5            | 15.0      | 5.0       | **34.5**   |
| V08 | 13.5            | 12.5      | 4.0       | **30.0**   |


The ordering I wrote down: `V07` clearly first, `V01` second, `V05` a strong third, then a tight cluster, and `V04` alone at the bottom.

## The reveal

| Rank | Model       | ID  | Language | Score     |
| ---- | ----------- | --- | -------- | --------- |
| 1    | Opus 5      | V07 | Rust     | **98.5**  |
| 2    | Opus 4.8    | V01 | Go       | **97.5**  |
| 3    | Fable 5     | V03 | Go       | **93.5**  |
| 4    | GPT-5.6 Sol | V02 | Rust     | **90.25** |
| 5    | GPT-5.5     | V06 | Rust     | **86.0**  |
| 6    | Kimi K3     | V05 | Rust     | **84.0**  |
| 7    | Grok 4.5    | V08 | Rust     | **82.5**  |
| 8    | Sonnet 5    | V04 | Rust     | **81.0**  |

The blind visual leader and the overall winner are the same submission. So are the blind visual loser and the overall loser. In between, the rubric moved things around considerably - most dramatically for Kimi K3, which I had ranked third on looks and which finished sixth.

All eight built cleanly on both platforms. All eight passed their own test and lint suites, with one exception noted below. Nothing here is a disaster; the spread is between good and very good, and it is decided by the parts a screenshot cannot show.

## 1. Opus 5 — 98.5

![Opus 5's LCARS monitor: segmented elbow rails, a dominant clock, and metrics integrated into the frame.](/images/lcars-terminal-blind-evaluation/opus-5.png)

This was the best structural translation of LCARS in the field, and I recorded that before knowing what it was. Segmented elbows, exposed rounded terminals, squared continuations, inset cutouts, and metrics tucked into the frame around a genuinely open working field. It is the only submission where the composition would survive having all its text blanked out.

The engineering matched. Every lifecycle probe restored the terminal on both systems. 1.90 ms to first output, 0.00% idle CPU, 2,588 KiB RSS, a 543 KB binary. Its macOS backend had been documented as compile-only; run natively on the Mac mini, it produced correct primary and diagnostic data anyway.

The single deduction was a metrics point: the sampled macOS diagnostic frame gave thin evidence for per-process CPU. Small, and fair, and it did not threaten first place.

## 2. Opus 4.8 — 97.5

![Opus 4.8's LCARS monitor: a stacked colored rail column on the left with a large seven-segment clock.](/images/lcars-terminal-blind-evaluation/opus-4.8.png)

A point and a half behind, and the most balanced submission of the eight. Excellent dominant clock, strong asymmetric rail stack, confident palette, real negative space. Blind, I marked its central field as less structurally interlocked than `V07`'s.

Everything else is close to flawless. Go with a custom renderer, cleanly isolated native collectors, deterministic sampling and render tests, complete documentation. Normal quit, <kbd>CTRL</kbd> + <kbd>C</kbd>, and `SIGTERM` all restored cursor, alternate screen, and termios. It also recorded the lowest steady-state terminal traffic of the leading entries at 703 bytes per second.

## 3. Fable 5 — 93.5

![Fable 5's LCARS monitor: a left column of labeled pill blocks beside a clock and horizontal metric bars.](/images/lcars-terminal-blind-evaluation/fable-5.png)

The strongest engineering-to-visual ratio in the field. Vendored, offline-oriented Go, separate Darwin and Linux collectors, excellent fallbacks, its own capture utility, thorough tests, and documentation good enough that I used it as the reference for what the deliverables were supposed to look like. Redirected output fails safely with an actionable message rather than a panic.

The visual score is what holds it at third. Blind, I wrote that several of its controls remain flat-ended strips: the left column reads as a stack of labeled rectangles rather than the compound elbows and rounded terminals that give LCARS its shape language. Clear focal clock, deliberate segmentation, flatter geometry. 3.13 ms startup, 0.20% idle CPU, 9,928 KiB RSS.

## 4. GPT-5.6 Sol — 90.25

![GPT-5.6 Sol's LCARS monitor: a large cut-out left slab with an outlined clock and colored metric labels.](/images/lcars-terminal-blind-evaluation/gpt-5.6-sol.png)

Compact, fast, and polished. Strong hierarchy and a sweeping left elbow, but blind I noted that the elbow reads as one large continuous slab, and the segmentation rhythm that makes LCARS feel like a control surface is mostly absent. It is a clean, restrained interpretation rather than an ambitious one.

1.93 ms startup, 0.30% idle CPU, 745 KB binary. All lifecycle probes restored correctly, and redirected output produces genuinely useful capture guidance instead of an error. Nine tests and less explicit OS isolation than the top three, which is where the remaining points went.

## 5. GPT-5.5 — 86.0

![GPT-5.5's LCARS monitor: a deep compound frame with a command display header bar and stacked telemetry rails.](/images/lcars-terminal-blind-evaluation/gpt-5.5.png)

Deep compound framing and good segmentation but blind I marked the hierarchy as indecisive and the overall result as somewhat box-like. It has the vocabulary without quite having the composition.

The deductions are mostly performance. Startup was 126.19 ms: inside the 250 ms target, but two orders of magnitude slower than the leaders. Idle CPU was 4.10%, second worst in the field. Eight tests. Everything correctness-related passed: metrics work through `sysinfo`, and all tested exits restored terminal state.

## 6. Kimi K3 — 84.0

![Kimi K3's LCARS monitor: a bold left rail staircase, large clock, and a circular CPU dial on the right.](/images/lcars-terminal-blind-evaluation/kimi-k3.png)

This is the one the blind test got interestingly wrong, and the reason for doing the two halves separately.

Blind, I scored it 31.5, ahead of Opus 4.8 on shape language in places. Bold silhouette, that circular CPU dial as a focal counterpoint to the clock, a staircase rail down the left, and the best sub-cell glyph work of the eight. If the evaluation had stopped at the screenshots, it would have placed third.

Then <kbd>CTRL</kbd> + <kbd>C</kbd> did not exit. On both Linux and macOS. On Linux the probe required `SIGKILL`, and afterwards the terminal was left in raw mode with the cursor hidden and the alternate screen still active. The rubric caps robustness at 2/10 for exactly this, and 8 points is the difference between third and sixth.

There is a smaller honesty problem alongside it. `cargo fmt --check` failed on the delivered source despite a README claiming clean formatting, and the README's 37 tests were 36 when run.

## 7. Grok 4.5 — 82.5

![Grok 4.5's LCARS monitor: a segmented command-deck layout with labeled horizontal telemetry rows.](/images/lcars-terminal-blind-evaluation/grok-4.5.png)

A coherent segmented command deck with excellent breathing room, leaning toward horizontal telemetry rows and using less compound elbow shaping than the leaders. Blind, it tied GPT-5.6 Sol at 30.0.

Normal quit and <kbd>CTRL</kbd> + <kbd>C</kbd> restored correctly, but `SIGTERM` left raw mode, hidden cursor, and the alternate screen active on Linux and emitted no restoration at all on macOS. It also posted the worst performance numbers in the field: 118.25 ms startup and 6.50% idle CPU, with 8,092 KiB RSS. There is no CLI, no `--help`, and no capture mode. Color and Unicode modes are reachable only interactively, which is also why its fallback capture required sending keystrokes rather than passing flags.

## 8. Sonnet 5 — 81.0

![Sonnet 5's LCARS monitor: a wide left slab, a large clock, and detached metric blocks on the right edge.](/images/lcars-terminal-blind-evaluation/sonnet-5.png)

Last blind and last overall, and the two verdicts point at the same thing. The clock is memorable and the negative space is real, but blind I wrote that most of the composition is a single broad left slab plus detached right-side decorations, with metrics that feel placed rather than integrated. It scored 9.5/15 on LCARS fidelity.

The engineering is competent: clean Rust build, 31 tests, both views working, live metrics on both platforms, interactive exits restoring correctly. The specific failure is that redirecting stdout triggers a Ratatui initialization panic rather than an actionable error, which is the least graceful of the three redirected-output behaviors in the field. 2.07 ms startup but 2.80% idle CPU.

## Performance

Measured on the Linux host so every submission saw identical hardware and load. Startup is process spawn to first terminal output; idle CPU and output volume were sampled after a two-second warmup.

| Model       | Startup median | Idle CPU | RSS       | Binary  | Steady output/s |
| ----------- | -------------- | -------- | --------- | ------- | --------------- |
| Kimi K3     | 1.70 ms        | 0.60%    | 3,044 KiB | 491 KB  | 18,724 B        |
| Opus 5      | 1.90 ms        | 0.00%    | 2,588 KiB | 544 KB  | 3,289 B         |
| GPT-5.6 Sol | 1.93 ms        | 0.30%    | 2,692 KiB | 745 KB  | 8,024 B         |
| Sonnet 5    | 2.07 ms        | 2.80%    | 6,332 KiB | 875 KB  | 401 B           |
| Opus 4.8    | 2.46 ms        | 0.00%    | 4,408 KiB | 2.08 MB | 703 B           |
| Fable 5     | 3.13 ms        | 0.20%    | 9,928 KiB | 3.17 MB | 1,123 B         |
| Grok 4.5    | 118.25 ms      | 6.50%    | 8,092 KiB | 927 KB  | 634 B           |
| GPT-5.5     | 126.19 ms      | 4.10%    | 5,740 KiB | 897 KB  | 7,250 B         |

All eight met the 250 ms startup target. The two Go submissions carry visibly larger binaries and, in Fable 5's case, noticeably more resident memory; neither cost them anything meaningful, because the prompt asked for a standalone executable and a responsive UI, not the smallest possible artifact.

The output column is the one worth reading closely. Kimi K3 writes nearly 30 times as much data to the terminal per second as Opus 5 for a comparable scene. Over SSH on a slow link, that is the difference between a smooth display and a smeared one.

I only have API Cost data arrived for only two submissions. Grok 4.5 reported $1.07 across 88,664 tokens, Kimi K3 $4.76 across 135,036.

## What blinding actually bought

**It identified a submission that looked good but had big bugs.** Kimi K3 dropped from third to sixth after moving on from the visual evaluation. 

**It killed self-reported evidence.** Excluding every model's own supplied captures and rebuilding from clean snapshots turned out to matter more than the anonymization. Two submissions made README claims that did not survive being run. A model's screenshot of its own output is marketing.

The remaining honest limitations: performance is a point-in-time measurement on one Linux host, not a benchmark sweep. Collectors were checked for plausibility against native tools on both platforms but not fault-injected for every permission and counter-rollover path. And the visual half, blind or not, is still my personal taste. A blind test only removes the identity bias.

## Conclusion

Eight models and a 17.5-point spread between best and worst. The top four are all genuinely good programs I would run. The bottom four are also good programs, each with one specific thing wrong that a screenshot would never have told me: a hung <kbd>CTRL</kbd> + <kbd>C</kbd>, a missed `SIGTERM`, a panic on a redirected pipe, an idle loop burning 6.5% of a core to draw a mostly static screen.

The reality is we are reaching a point where any model will be capable of creating anything you desire. Here I used a "one-shot" prompt approach but I believe the best way to develop with agents is to iterate on your work instead of trying to have an agent produce an entire app from only a single prompt.
