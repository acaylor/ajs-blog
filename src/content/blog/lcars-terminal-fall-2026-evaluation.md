---
title: 'Nine Fall 2026 AI models built an LCARS system monitor'
author: aj
date: 2026-11-02
description: 'I ran nine Fall 2026 frontier coding models against a revised Star Trek LCARS system monitor prompt, pairing my visual scores with a blind, agent-graded engineering rubric.'
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
image: /images/lcars-terminal-fall-2026-evaluation/collage.png
---

In August, I had [eight Summer 2026 AI models build a Star Trek LCARS terminal system monitor](/posts/lcars-terminal-blind-evaluation/), scored their screenshots under randomized IDs before opening the identity map, and then ran each project through an engineering rubric on Linux and macOS. A few weeks later, I repeated that format with a [Matrix digital rain system monitor](/posts/matrix-terminal-evaluation-harness/).

September and October 2026 brought another full wave of frontier coding releases across Anthropic, OpenAI, Google, SpaceXAI, Moonshot, Meta, and DeepSeek. Over the past seven weeks, I ran the major releases against a cleaned-up version of the LCARS prompt (`prompt-v3`) as they came out, narrowing the final lineup to nine Fall 2026 flagship coding models.

![Nine LCARS terminal system monitors rendered at 120x36, labeled with rank, model name, and final score.](/images/lcars-terminal-fall-2026-evaluation/collage.png)

The full interactive report, with per-model dossiers, the macOS audit, performance tables, and the evaluation method, is at **[acaylor.github.io/lcars-terminal-eval-fall-2026](https://acaylor.github.io/lcars-terminal-eval-fall-2026/)**. The scorecards, probe scripts, raw output, and graded source are in the [GitHub repository](https://github.com/acaylor/lcars-terminal-eval-fall-2026).

## What changed in `prompt-v3`

The core assignment is the same aesthetic-first engineering brief from the summer evaluation: build a real macOS and Linux terminal system monitor that looks unmistakably like an LCARS starship console rather than `htop` or `btop` in an orange color scheme.

Each submission still has to deliver:

- **Two distinct views:** a primary command display (local time with seconds, date, hostname, uptime, overall CPU, load averages, memory, root filesystem usage, and network RX/TX rates) and a separate diagnostic view (<kbd>p</kbd>) holding OS/architecture, per-core CPU, swap, process count, and the top five CPU processes. The process list still cannot appear on the default screen.
- **LCARS geometry over dashboard boxes:** an asymmetric silhouette, sweeping elbows and pill-shaped terminals, deliberate negative space (at least 20% of the screen), sub-cell Unicode rendering, and a layout that stays recognizable even with all text blanked out.
- **Real OS telemetry and terminal discipline:** native `/proc` and macOS `sysctl`/Mach/`libproc` collection without shelling out on every refresh, elapsed-time rate math, smooth changed-cell rendering without full-screen clears, terminal state restoration on normal exit and signals, an `80x24` simplified command layout, monochrome/reduced-color support, and an ASCII fallback.
- **Testable structure and self-check:** isolated collectors, headless-testable rendering, deterministic sampling tests, reproducible build instructions, a Captain's Log markdown summary, and a seven-question visual acceptance check at `120x36`.

Between the summer post and this round, I made four targeted edits to create `prompt-v3`:

1. **Removed the standalone-executable and "no language runtime" mandate.** The summer prompt explicitly required a standalone native binary with no language runtime or package manager after installation, which strongly favored Rust or Go. I dropped those constraints in `prompt-v3` and required only offline execution after installation. The remaining performance targets would guide the language choice: startup under 250 ms, low idle CPU and memory overhead, smooth rendering, and reliable macOS/Linux support.
2. **Simplified the color-tier wording.** I removed the separate `xterm-256color` baseline bullet while keeping 24-bit color detection as progressive enhancement (loss of true color cannot break layout or functionality) alongside a monochrome or reduced-color mode.
3. **Trimmed refresh-rate hotkeys.** I dropped <kbd>+</kbd> and <kbd>-</kbd> refresh-rate adjustment from the required controls so the interaction surface stays focused on <kbd>q</kbd>/<kbd>Esc</kbd> (quit), <kbd>?</kbd> (help), <kbd>Space</kbd> (pause), <kbd>p</kbd> (diagnostics), and <kbd>Tab</kbd> (cycle focus or views).
4. **Clarified secondary-view scope.** I changed "The secondary diagnostic view must show" to "must at least show," matching the wording of the primary command view so the rubric does not penalize a model on a technicality for surfacing a coherent extra diagnostic detail alongside the required five items.

## The Fall 2026 lineup

To keep the comparison focused on each lab's top Fall 2026 coding releases, I trimmed out older baselines, mid-tier/flash siblings, and superseded point releases, leaving nine models released across September and October 2026. I ran all nine generation sessions on Linux, using Claude Code for the Anthropic models and OpenCode (via OpenRouter) or vendor CLI tooling for the rest. Every model therefore had to write its mac collector without a Mac to test against.

| Model                    | Provider    | Release window | Language | Main dependencies                                              |
| ------------------------ | ----------- | -------------- | -------- | -------------------------------------------------------------- |
| Claude Fable 5.1         | Anthropic   | Sept 2026      | Rust     | `crossterm` (events), `libc`                                   |
| Claude Opus 5.5          | Anthropic   | Sept 2026      | Rust     | `libc`, `unicode-width`                                        |
| GPT-6 Astra              | OpenAI      | Sept 2026      | Go       | stdlib (+ macOS `cgo` system libs)                             |
| GPT-6.1 Sol              | OpenAI      | Sept 2026      | Go       | stdlib                                                         |
| Gemini 4 Argon           | Google      | Oct 2026       | Rust     | `libc`                                                         |
| Grok 4.7                 | SpaceXAI    | Sept 2026      | Rust     | `libc`                                                         |
| Kimi K3.1 Pro            | Moonshot AI | Oct 2026       | Rust     | `crossterm`, `libc`, `signal-hook`, `sysinfo`, `unicode-width` |
| Muse Wonder              | Meta        | Oct 2026       | Go       | `golang.org/x/sys`, `x/term`                                   |
| DeepSeek V4.1 Flash 1017 | DeepSeek    | Oct 2026       | Rust     | `crossterm`, `libc`, `sysinfo`, `unicode-width`                |

Two patterns stood out before any formal grading:

- **Still all Rust and Go.** Even after removing the standalone-binary requirement in `prompt-v3`, six of the nine models chose Rust and three chose Go (GPT-6 Astra, GPT-6.1 Sol, and Muse Wonder). None picked Python, TypeScript, or C++.
- **Zero TUI widget frameworks.** Not a single model pulled in `ratatui` or `bubbletea`. All nine wrote custom cell-buffer diff renderers, several noting explicitly in their READMEs that standard rectangular widget trees work against curved LCARS elbows and rails. Two of the Rust entries (Gemini 4 Argon and Grok 4.7) used `libc` as their sole dependency, and both OpenAI Go entries avoided third-party Go modules altogether.

## A different evaluation approach this time

In the August LCARS post and the September Matrix post, I generated every submission in one batch and kept the visuals completely blind until I had locked my visual scores.

I skipped a blind visual phase this round for a simple reason: I ran these nine models over several weeks as each lab released them, launching every binary as soon as it finished to see how it looked. Anonymizing screenshots I had already seen running in my own terminal would have defeated the point.

Instead, I split the 100-point rubric between my own visual score and a blind, multi-agent engineering audit that I orchestrated:

1. **My visual score (30 points):** I scored each running application from `1` to `10` purely on how convincing it looked as an LCARS command display. I then multiplied each score by three so aesthetics carried 30% of the total score.
2. **Agent engineering rubric (70 points, plus `0` to `−10` honesty deductions):** I had an orchestrator agent stage clean, anonymized source copies of all nine projects (`S01`–`S09`), stripping model names, `cost.txt`, `.git`, build caches, and supplied screenshots so neither model brand nor my visual scores leaked into code grading. My harness ran the same deterministic probes against every copy: clean builds and test suites on Linux and natively on my M4 Mac, controlled PTY lifecycle and fallback checks, and startup, CPU, RSS, and output-volume measurements. The orchestrator then dispatched nine isolated grading agents, one per project. Each agent received only the brief, the rubric, its assigned codebase, and that project's probe output. Each grader reviewed the source architecture and macOS/Linux collectors and deducted up to 10 points for unsupported or contradicted claims in the documentation. After locking all nine scorecards, the orchestrator compared them side by side, still blind, to normalize scoring before I unmasked the model names and combined the results with my visual scores.

| Category                                          |   Points | Graded by      |
| ------------------------------------------------- | -------: | -------------- |
| Visual appeal (`1–10` × 3)                        |       30 | Me             |
| Code architecture & scope discipline              |       14 | Grading agents |
| System metrics & cross-platform collectors        |       14 | Grading agents |
| Terminal lifecycle, interaction & robustness      |       14 | Grading agents |
| Build, toolchain & automated tests                |       10 | Grading agents |
| Responsive layout, color & fallback modes         |        8 | Grading agents |
| Performance & render efficiency                   |        6 | Grading agents |
| Documentation & deliverables                      |        4 | Grading agents |
| **Subtotal**                                      |  **100** |                |
| Honesty deductions (contradicted/untested claims) | 0 to −10 | Grading agents |

## My visual scores

Before running the engineering evaluation, I scored each of the nine interfaces on a `1–10` scale based on how good it looked running in my terminal:

| Model                    | Visual (`1–10`) | Visual (`/30`) |
| ------------------------ | --------------: | -------------: |
| Claude Opus 5.5          |             9.5 |       **28.5** |
| Gemini 4 Argon           |             9.5 |       **28.5** |
| Claude Fable 5.1         |             9.0 |       **27.0** |
| GPT-6 Astra              |             8.5 |       **25.5** |
| GPT-6.1 Sol              |             8.0 |       **24.0** |
| DeepSeek V4.1 Flash 1017 |             7.5 |       **22.5** |
| Grok 4.7                 |             7.5 |       **22.5** |
| Kimi K3.1 Pro            |             7.0 |       **21.0** |
| Muse Wonder              |             6.5 |       **19.5** |

Claude Opus 5.5 and Gemini 4 Argon tied at the top visually (`9.5/10`), just ahead of Claude Fable 5.1 (`9.0/10`) and the two OpenAI Go entries (`8.5/10` and `8.0/10`). Nine points on the 30-point scale separated the top visual pair from Muse Wonder (`6.5/10`) at the bottom, leaving plenty of room for the 70-point engineering rubric to reorder the field.

## Final leaderboard

| Rank | Model                    | Visual (`/30`) | Engineering (`/70`) | Honesty | Final (`/100`) |
| ---: | ------------------------ | -------------: | ------------------: | ------: | -------------: |
|    1 | Claude Opus 5.5          |           28.5 |                70.0 |       0 |       **98.5** |
|    2 | Claude Fable 5.1         |           27.0 |                67.0 |    −0.5 |       **93.5** |
|   3= | GPT-6.1 Sol              |           24.0 |                67.5 |       0 |       **91.5** |
|   3= | GPT-6 Astra              |           25.5 |                66.0 |       0 |       **91.5** |
|    5 | Gemini 4 Argon           |           28.5 |                63.0 |    −1.0 |       **90.5** |
|    6 | DeepSeek V4.1 Flash 1017 |           22.5 |                63.5 |       0 |       **86.0** |
|    7 | Grok 4.7                 |           22.5 |                63.0 |       0 |       **85.5** |
|    8 | Kimi K3.1 Pro            |           21.0 |               62.25 |       0 |      **83.25** |
|    9 | Muse Wonder              |           19.5 |                55.0 |    −1.0 |       **73.5** |

During that blind side-by-side reconciliation pass, the orchestrator fixed two arithmetic errors and normalized the macOS collector deductions onto a single scale. I ran both the orchestrator and all nine grading agents on Claude Opus 5.5, which also won overall. Deterministic scripts produced every build, test, lint, terminal, and performance metric, though that model overlap is worth keeping in mind for the qualitative judgment calls.

## macOS separated the field

The field was much closer than in August. All nine compiled from a clean copy with zero warnings on Linux, passed their own tests, and restored the terminal across all five exit paths (<kbd>q</kbd>, <kbd>Esc</kbd>, raw-mode <kbd>Ctrl</kbd> + <kbd>C</kbd>, `SIGINT`, and `SIGTERM`). None shelled out to `ps` or `top`, and all nine printed a helpful message instead of garbage when I redirected stdout.

Testing on macOS revealed the engineering differences. Because generation ran on Linux, none of the models could test their macOS code: eight of nine READMEs noted that the macOS build was untested, while the ninth (Muse Wonder) claimed full verification anyway. I built each binary natively on an M4 Mac and compared its output with contemporaneous readings from `sysctl`, `vm_stat`, `top`, and `df`. **Only Opus 5.5's macOS collector was fully correct.**

- **Four collectors read process CPU about 40× too low.** Fable, Sol, Astra, and Grok treated `proc_pidinfo` task times as nanoseconds. On Apple Silicon they are Mach ticks (`125/3` ns per tick, versus `1` ns on Intel Macs) and require scaling by `mach_timebase_info`. Only Opus and Gemini scaled them.
- **Two truncated the process list.** Gemini and Grok read the `proc_listallpids` return value as a byte count instead of a PID count, showing 297 and 74 of roughly 915 processes.
- **Smaller single-metric bugs:** DeepSeek reported the Mac's disk 256× too large, Kimi reported roughly double the available memory, and most of Muse's macOS metrics showed `N/A`.

Neither of the two big bugs shows up in a cross-compile, `cargo clippy`, or `go vet`. They only surface when running the binary on Apple Silicon.

## Notable entries

- **Gemini 4 Argon** tied Opus for the best-looking screen but lost seven engineering points and received a one-point honesty deduction. It was the only entry to fail `cargo fmt --check`, had the macOS process-list bug, and advertised a 0.37 ms in-process benchmark as startup time when the measured first frame took 30 ms.
- **GPT-6.1 Sol** earned the highest engineering score outside Opus (67.5) from the smallest codebase: 1,917 lines of Go with no third-party modules.
- **DeepSeek V4.1 Flash 1017 and Kimi K3.1 Pro** both used the `sysinfo` crate. On Linux it lists threads as processes, so both reported about 1,630 processes against roughly 505 real ones.
- **Muse Wonder** lost the most ground: a broken macOS backend, a missing required metric on Linux, and a README claiming it "Verified the full brief."

The graders applied three honesty deductions overall: Gemini (−1.0) and Fable (−0.5) both presented an in-process microbenchmark as whole-program startup time, while Muse (−1.0) claimed full verification despite broken macOS and incomplete Linux metrics.

## Performance and cost

On Linux, every entry started well inside the 250 ms target. Most drew a first frame in 3–6 ms, while Kimi took 98 ms, mostly spent in `sysinfo`'s initial scan. None issued a full-screen clear during steady-state refresh. Two steady-state outliers stood out: Grok rewrote every changed row in full (about 11 KB/s of terminal output), and Muse was the only entry above 1% idle CPU. Rust binaries ranged from 0.47 to 0.82 MB, while Go binaries landed around 2 MB.

Recorded generation costs ranged from $1.55 (Kimi) and $1.78 (DeepSeek) to $14.89 (Fable). Three runs did not record cost, and the harnesses measure it differently, so these numbers are not directly comparable. The [full report](https://acaylor.github.io/lcars-terminal-eval-fall-2026/#performance) has the complete performance table and cost appendix.

## Conclusion

Every model in this round produced a clean, well-behaved terminal app on the Linux platform where it built and tested the code. The gap now lies in code the agent had to write blind: none of the nine applications was tested on macOS during generation, eight shipped at least one real macOS bug, and only Opus 5.5 got its macOS implementation right unassisted. Visual appeal and engineering quality still diverged across the middle of the pack. Opus 5.5 was the only model to lead on both, while Muse Wonder trailed on both.

For the per-model dossiers, screen captures, and full methodology, see the **[interactive report](https://acaylor.github.io/lcars-terminal-eval-fall-2026/)**.
