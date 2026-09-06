---
title: 'Ten AI models from Summer 2026 built a Matrix terminal system monitor'
author: aj
date: 2026-09-06
description: 'Ten AI models, thirteen Matrix terminal monitors, and the problems I found while building a blind evaluation harness.'
image: /images/matrix-terminal-evaluation-harness/comparison.svg
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
  - ollama
---

In [my previous terminal app evaluation](/posts/lcars-terminal-blind-evaluation/), I had eight AI models build a Star Trek LCARS system monitor. I wanted to try the same idea with a Matrix theme: falling streams of characters driven by live system metrics.

This time I used ten models and two tracks. All ten ran through OpenCode, and three also ran through their vendor's coding agent. Three of the models ran locally on my RTX 5090 through Ollama.

_Above: Grok, GPT Sol, DeepSeek, and Qwen Max, the four highest-scoring submissions. Images in this post use the preserved Linux ASCII-mode captures so the terminal characters display without a Nerd Font. These are still images of animated applications. The scores were locked before native Mac testing, where Grok failed to build._

I scored thirteen submissions blind. Along the way I found several problems with my evaluation harness, including a compaction message that encouraged the local models to stop before they had finished. In this post I will share the results and what I had to fix to run the evaluation.

## My setup

I ran the harness on a Linux x86_64 workstation. For the main track, I used OpenCode as the coding agent and OpenRouter to access the seven hosted models. OpenCode ran their shell commands, edited files, and built the projects on my machine; OpenRouter handled the model requests.

The other three models in that track ran on a separate Linux machine with an RTX 5090 and 32 GB of VRAM. The harness connected over SSH, with OpenCode using Ollama on that machine for inference. I ran those models one at a time with a 64K context window. Both machines had access to my local SearXNG instance through the harness's search tool.

Linux was the build and evaluation environment for the scored runs. After locking the scores, I used a Mac Mini M4 to check native macOS builds and terminal behavior. The vendor-agent comparison used Claude Code, Codex, and Antigravity through their own services, separately from the OpenRouter runs.

## The assignment

The prompt asked for a standalone terminal application with:

- Falling character streams driven by real system metrics.
- 24-bit color with an xterm-256 fallback detected at runtime.
- Nerd Font glyphs by default and an ASCII fallback through `--ascii`.
- macOS and Linux support in a single native executable.
- Tests for logic that does not need an interactive terminal.
- A README covering build instructions, keyboard controls, language choice, and what the model could not verify.

Each model chose its own language. Most used Rust; DeepSeek and Qwen 27B submitted Go projects. Qwen 27B's project was missing its entry point.

## Ten models, thirteen submissions

**Track A** used [OpenCode](https://opencode.ai) for all ten models, with the same agent loop, permissions, and prompt delivery. The tool capabilities were controlled, though the editing interfaces differed by provider. The OpenAI model used `apply_patch`; the other models I inspected used `write` and `edit`.

**Track B** repeated the prompt for three models in their vendor's CLI: Claude Code for Opus 5, Codex for GPT-5.6 Sol, and Antigravity for Gemini 3.7 Flash.

I expected the vendor agents to do better. They have their own system prompts, tools, and agent loops. That only happened for Claude in these runs.

![Paired scores on a zero-to-100 scale: Claude Opus 5 scored 94.5 in OpenCode and 96 in Claude Code; Gemini Flash scored 94 in OpenCode and 89.5 in Antigravity; GPT Sol scored 97.5 in OpenCode and 46 in Codex.](/images/matrix-terminal-evaluation-harness/agent-comparison.svg)

_Each pair used the same model and assignment. There was one run per condition, so these differences include run-to-run variation._

Claude Code improved the score by 1.5 points. Antigravity finished 4.5 points behind its OpenCode counterpart. The Codex submission finished 51.5 points behind because its program crashed on the first large frame. **I would need repeated runs to know how much of each difference came from the agent.**

## The blind results

I froze the thirteen submissions and assigned random IDs, `V01` through `V13`. I rebuilt and captured the anonymous projects, then completed the visual and engineering scores before opening the identity map. Deductions for unsupported verification claims were included in those scores. Model names, tracks, costs, and intervention counts stayed hidden until the raw scores were locked.

| Rank | Submission               | Track |  Raw |      Adjustment |     Final |
| ---: | ------------------------ | :---: | ---: | --------------: | --------: |
|    1 | `grok-4.6`               |   A   | 98.5 |               — |  **98.5** |
|    2 | `gpt-5.6-sol`            |   A   | 97.5 |               — |  **97.5** |
|    2 | `deepseek-v4-pro-0813`   |   A   | 97.5 |               — |  **97.5** |
|    4 | `qwen3.8-max`            |   A   |   97 |               — |    **97** |
|    5 | `claude-opus-5-cc`       |   B   |   96 |               — |    **96** |
|    6 | `claude-opus-5`          |   A   | 94.5 |               — |  **94.5** |
|    7 | `gemini-3.7-flash`       |   A   |   94 |               — |    **94** |
|    8 | `gemini-3.7-flash-agy`   |   B   | 89.5 |               — |  **89.5** |
|    9 | `muse-glimmer-30b`       |   A   |   72 |               — |    **72** |
|   10 | `seed-2.0-code`          |   A   | 69.5 |               — |  **69.5** |
|   11 | `gpt-5.6-sol-codex`      |   B   |   46 |               — |    **46** |
|   12 | `qwen3.8-27b`            |   A   | 24.5 | one nudge, −10% | **22.05** |
|   13 | `nemotron-3.5-lightning` |   A   | 16.5 | one nudge, −10% | **14.85** |

Qwen 27B and Nemotron each received one intervention to resume an unfinished session. The rubric deducts 10% for that assistance. The final column includes those deductions.

Grok finished first at 98.5. GPT-5.6 Sol and DeepSeek tied for second at 97.5, followed by Qwen Max at 97. The top eight submissions all scored at least 89.5, but the lower scores covered several different problems. Muse and Seed ran with missing features and cleanup defects. Codex built but crashed, Qwen 27B had no entry point, and Nemotron printed help or panicked instead of launching the app.

### Grok 4.6

![Grok 4.6's Matrix monitor, with green character streams and system metrics decoded across the rain.](/images/matrix-terminal-evaluation-harness/grok.svg)

Grok tied metrics to individual rain columns, decoded them into a borderless ribbon, and added a storm effect that responded to load. The engineering score was also strong. The main visual deductions were for density, briefly readable text, and clipping in the full metric ribbon.

There is a significant qualification to its first-place score: **this submission failed to compile on the Mac I used for verification**. That check happened after the scores were locked. I cover the native results below.

### GPT-5.6 Sol

![GPT-5.6 Sol's OpenCode submission, showing live system values within a field of green digital rain.](/images/matrix-terminal-evaluation-harness/gpt-sol.svg)

The OpenCode submission earned full marks for robustness, performance, and visual design. It also built, passed its tests, and ran successfully on the Mac. Generation took 7m 53s with a reported cost of $1.94, making it one of the more practical results in this evaluation.

### DeepSeek V4 Pro

![DeepSeek V4 Pro's Matrix monitor, with metric labels distributed through comparatively sparse green character streams.](/images/matrix-terminal-evaluation-harness/deepseek.svg)

DeepSeek's Go application had strong native metric collection, terminal cleanup, tests, and documentation. It used diff rendering to avoid redrawing the entire screen. The captured rain was comparatively sparse and repetitive, which accounted for some of its visual deductions. Like GPT, it passed the native Mac checks.

### Qwen3.8 Max

![Qwen3.8 Max's Matrix monitor, with dense rain, decoding metric text, and a sonar effect.](/images/matrix-terminal-evaluation-harness/qwen-max.svg)

This was my favorite visual treatment in the blind review. Metrics scrambled into readable text and dissolved back into the rain, with sonar rings moving through the scene. A broken Escape binding and incomplete explanations around unsafe code cost it points.

It also made 226 rejected tool calls during generation. That wasted time, but the resulting program still placed fourth.

## Running models on my own hardware

Muse Glimmer 30B, Qwen3.8 27B, and Nemotron 3.5 Lightning ran through Ollama on my RTX 5090. I pinned each to a 64K context using a Modelfile variant. The hosted models had context windows ranging from 262K to 1.05M tokens.

I was unsure whether 64K would fit comfortably on the 5090. The three models used 22.7 GB, 19.1 GB, and 25.5 GB of its 32 GB, all on the GPU without CPU offload.

I ran one local model at a time, using `flock` to serialize the runs and evicting any previously loaded model first. This kept the models from competing for GPU memory during generation.

## Isolating the evaluation harness

I wanted to be able to repeat a run without my normal development setup changing the experiment. That required more configuration than I expected.

**Config isolation.** In the OpenCode version I tested, both `OPENCODE_CONFIG` and `OPENCODE_CONFIG_DIR` still allowed settings from `~/.config/opencode` to merge into the run. My personal MCP servers and a plugin appeared in what I thought was a clean environment. Relocating `XDG_CONFIG_HOME` and creating a temporary config tree per run isolated those settings. Credentials remained available through `XDG_DATA_HOME`.

The `skill` tool also remained available through `--pure` and the `OPENCODE_DISABLE_*` flags I tested. I had to disable it explicitly.

**Version locking.** The agent CLIs update frequently. I recorded the tool versions in a lock file and made generation refuse to start if a version changed.

**Preflight checks.** Before each run, the harness checked that search returned JSON, OpenRouter credit was above a minimum, load average was under 4.0, disk space was available, and the GPU was idle. I added the credit check after running out during two generations.

## Problems running the agents

Several failed runs came from my setup rather than the generated applications.

### SSH and open stdin

The local runs started, produced nothing, and waited until timeout. I spent hours checking Zig, the language server, MCP, and Ollama before narrowing it down to stdin.

In this setup, `opencode run` blocked when it inherited a pipe that never closed. SSH without `-n` supplied that pipe. Passing `ssh -n` disconnected stdin and fixed the hang. Comparing an open pipe with `/dev/null` was what finally identified it.

### Antigravity flags and working directories

Antigravity's `--print` flag took the prompt as its value, and flag parsing stopped at the first positional argument. I supplied the prompt in the wrong position, so `--print` consumed `--model` instead. The agent answered that literal string and exited successfully after four seconds without creating anything.

The CLI also reported the expected working directory but wrote files into its own scratch directory. A control test confirmed that passing `--add-dir` was necessary for the workspace I intended to use.

### Preserving Codex transcripts

My `codex exec` invocation only wrote the closing message to stdout. The detailed record was in a session rollout file under `CODEX_HOME`, which I had placed in a temporary directory. I needed to preserve that file before cleaning up the run.

Parsing the transcript needed another adjustment: tool calls were wrapped in a JavaScript `exec` call, with the underlying tool names nested inside it.

### Stale remote workspaces

My guard against repeated attempts checked the local workspace but missed the remote one. Previous attempts were still on the GPU machine, with 21,168 files in one workspace. I caught this before rerunning. Otherwise, a model would have started with its previous code already available.

## Compaction was telling the local models to stop

All three local models stopped before completing the assignment. They had written some code, but had neither crashed nor reached the timeout.

When I inspected the transcripts, I found that OpenCode inserted this message after compacting the context:

```text
Continue if you have next steps, or stop and ask for clarification if you are unsure how to proceed.
```

My preamble told the models that the run was unattended. The compaction message then gave them permission to ask a question and wait for someone who was not there.

| Submissions            | Context    | Compactions |
| ---------------------- | ---------- | ----------: |
| All ten hosted runs    | 262K–1.05M |           0 |
| Muse Glimmer 30B       | 64K        |           7 |
| Nemotron 3.5 Lightning | 64K        |          10 |
| Qwen3.8 27B            | 64K        |          11 |

Only the local models compacted. One ended with: "Want me to continue writing the remaining files and driving it to a working build?" That made the early stopping difficult to attribute to the models alone.

I wrote a small OpenCode plugin to replace the message with an instruction to continue the unattended task. In a diagnostic rerun with the same model, context limit, and prompt, the result changed:

|           | Original message | Replacement message |
| --------- | ---------------- | ------------------- |
| Wall time | 60 minutes       | 144 minutes         |
| Files     | 7                | 15                  |
| Build     | Never attempted  | Working binary      |

This was a diagnostic rerun, separate from the scored comparison. It showed that changing the message could affect completion, but it did not measure a reliable improvement across models. The scored local results still carry the context and compaction limitation. Their intervention penalties account for the help they received; they do not compensate for this disadvantage.

For the next evaluation, I probably will not mix local models with hosted models. I do not have proper hardware to properly run these models with their full capabilities.

## Native Mac verification

The rubric originally gave cross-platform credit based on the source code. Generation and scoring happened on Linux. After locking the scores, I copied the anonymous projects to a Mac Mini M4 for native builds, tests, terminal launches, small-window checks, and exit handling.

| Submissions                                    | Mac result                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| GPT Sol / OpenCode, DeepSeek, both Claude runs | Built, passed tests, launched, and emitted cleanup sequences on all tested exit paths |
| Qwen Max                                       | Built and ran; one Darwin ABI-size test failed                                        |
| Grok                                           | Build failed: pinned `libc` bindings did not expose `host_page_size`                  |
| Both Gemini runs                               | Build failed on Darwin `statfs` integer widths                                        |
| Muse, Seed                                     | Built and ran, but omitted cleanup sequences on some signals                          |
| GPT Sol / Codex                                | Built and passed tests, then crashed at launch                                        |
| Nemotron                                       | Built and passed tests, then printed help instead of launching                        |
| Qwen 27B                                       | No entry point to build                                                               |

The runtime checks covered normal quit, `SIGINT`, `SIGTERM`, `SIGHUP`, and a 20×5 terminal. Cleanup here means I observed the cursor and alternate-screen restoration sequences. The Mac wrapper could not inspect the child terminal's final input-mode settings directly.

I kept the original ranking because the scores had been locked before the identities were revealed. These later results still matter, especially for the winner. Next time, native platform checks need to happen before scoring is complete.

## Generation time and cost

I kept generation time, token counts, and cost separate from the application scores. They are useful for deciding which result was practical, but the agents report billing and token usage differently.

| Submission                 | Final score | Generation time | Cost           |
| -------------------------- | ----------: | --------------- | -------------- |
| Gemini Flash / Antigravity |        89.5 | 5m 50s          | Not reported   |
| GPT Sol / OpenCode         |        97.5 | 7m 53s          | $1.94 reported |
| Grok                       |        98.5 | 15m 29s         | $2.08 reported |
| DeepSeek                   |        97.5 | 44m 54s         | $0.58 reported |

_These are selected runs: the fastest, a fast result above 90, the highest score, and the cheapest metered result above 90. Grok's score retains the Mac build caveat._

The recorded OpenRouter spend was **$41.26**. Claude Code reported a separate $21.13 list-price equivalent for a plan-billed run. That is an estimate, so I did not add it to the metered total. Codex and Antigravity did not report comparable prices. Ollama had no provider charge; hardware and electricity were not included.

Longer runs did not necessarily produce better programs. GPT reached 97.5 in 32 normalized steps. Qwen 27B took 193m 39s, 536 steps, and 1.26 million output tokens without producing an entry point. Those step and token counts come from different transcript formats, so I would be cautious about comparing them beyond these observed runs.

## Closing thoughts

I enjoyed seeing how differently the models interpreted the same Matrix prompt. Qwen Max was my visual favorite, while GPT and DeepSeek combined high scores with successful native Mac verification.

The evaluation also gave me a list of things to change before doing this again: test on both platforms before locking scores, verify config isolation, preserve the full transcripts, and check what the agent sends after compaction.

These results describe thirteen applications from one run per condition. They are useful examples of what each setup produced, but I would not use them alone to choose a model for every coding task. As with the LCARS experiment, I would normally keep working with the agent to fix the application rather than stop after the first submission.

I think if I did do this again, I want to use a more simple prompt. If I do more evaluations I will probably just ask for a terminal application that looks similar but does not try to make it a system monitoring app for multiple operating systems.
