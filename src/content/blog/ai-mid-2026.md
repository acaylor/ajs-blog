---
title: My AI timeline mid 2026
author: aj
date: 2026-07-19
description: 'A concise timeline of how my AI workflow moved from ChatGPT and local models to coding agents, model choice, and parallel agent orchestration.'
categories:
  - AI
  - Software Development
tags:
  - ai
  - llm
  - claude-code
  - opencode
  - openclaw
  - developer tools
---

I started using AI seriously in 2024. In only two years my workflow moved from copying snippets out of ChatGPT to coordinating several coding agents across projects that would have felt too large for me to attempt alone.

For this post, here is a short version of that progression.

## The timeline

- **2024 - chat and local experiments.** I started with ChatGPT and GPT-3.5. In July I began running local models with [Ollama and Open WebUI][1], and by November I had added [ComfyUI and Stable Diffusion][2] for image generation. Late in the year I started using GitHub Copilot as a coding assistant. This was after the tool was introduced at work.
- **2025 - assistants became agents.** At work I used Gemini Pro, Copilot, and Claude through AWS Bedrock and Google Vertex AI. Claude Sonnet 4 inside Copilot was a clear improvement, but the larger shift came when I moved to Claude Code in the fall. Opus 4.5 was the first model that felt like a major capability jump rather than an incremental upgrade.
- **Late 2025 - testing local agents.** I experimented with [OpenCode and local Ollama models][3]. In early 2026 OpenCode became my main personal coding agent because I could keep one workflow while switching among model providers.
- **Early 2026 - comparing the terminal agents.** I tried Claude Code, Codex, OpenCode, and Gemini CLI. I also started using MCP servers, skills, and reusable commands. [OpenCode remained my preference][4], although I continued using Claude Code at work and sampled new GPT and Claude models as they arrived.
- **Summer 2026 - orchestration.** The important change was no longer one better agent. I began splitting work across multiple agents running in parallel. Opus 4.8, Fable 5, and GPT-5.6 arrived as the tools themselves became better at delegating work to subagents.

My projects grew with the tools. I used Fable 5 to start a small 3D Godot game, [lost access to the model in the middle of the first session][5], and [finished the game after it returned][6]. I then worked on [Agent Hollow][7], where the agent used screenshots and simple image analysis to inspect and correct visual features. I am also working on another 3D project with three.js.

AI is no longer only helping me finish familiar work faster. It is giving me enough leverage to try 3D games, visual tools, and larger systems that bring more of my imagination into something other people can experience.

## My OpenClaw experiment

OpenClaw was one of the side quests in this timeline. I installed it in March 2026 and connected it to my ChatGPT subscription. It worked reasonably well at first and gave me a glimpse of an always-available personal agent rather than one tied to a terminal session.

The problem was maintenance. Updates broke the setup often enough that upgrading became something I had to think about. Configuring newly released models also carried more friction than I wanted. The models were moving quickly, but the agent around them did not feel like a stable foundation.

I sunset OpenClaw during the week of July 13. This was not because the idea was bad. It clarified that an agent I depend on needs predictable upgrades, durable state, declarative configuration, and a clean boundary between the agent and whichever model it uses.

## Replacing OpenClaw on k3s

My replacement plan is an always-on [Hermes Agent][8] deployment in my k3s cluster. It will reuse the [private AI stack I already run on Kubernetes][9]: Ollama on an NVIDIA GPU, persistent storage, Argo CD for deployment, and secrets synchronized from Bitwarden. Telegram will provide the convenient messaging interface I liked about having a personal agent available away from my desk. You can also configure Hermes to communicate with you on Discord or Slack.

The initial model for Hermes will be a local Gemma model served through Ollama's OpenAI-compatible API. Keeping the model behind that API boundary should make it easier to change models without rebuilding the rest of the system.

I am deliberately keeping the first version narrow:

- one gateway with persistent state;
- declarative configuration in Git;
- pinned container versions and controlled upgrades;
- no Kubernetes credentials or host filesystem access inside the agent;
- a local model by default, with room to change providers later.

OpenClaw taught me that an always-on agent is infrastructure, not just an app. If I am going to depend on one, I want to operate it like the rest of my homelab: observable, reproducible, and boring to upgrade.

## Where I am now

My current workflow is not centered on one product. OpenCode gives me model choice for personal coding, Claude Code remains important at work, and stronger agents handle planning, implementation, testing, research, and visual verification in parallel.

My progression with AI so far is simple:

> **chat assistant → IDE assistant → terminal coding agent → model-agnostic workflow → parallel agent orchestration**

I have no idea what the next six months will add, but I am increasingly interested in what I can build with these systems rather than which model wins a benchmark.

### What's next

- As I mentioned earlier, I am rolling out Hermes agent as a replacement for OpenClaw.
- I keep hearing about Pi which is an evem more minimalist agent that OpenCode that allows using multiple models. I want to try it out and perhaps build a focused agent with only the tools it needs.
- I just heard about a terminal tool Herdr that is like tmux but for your agents. It sounds like a compelling alternative to running agents in tmux or Zellij.

---

_Disclaimer: I used an LLM to help create this post. Opinions expressed are likely from me and not the LLM._

[1]: /posts/ollama-blog
[2]: /posts/open-webui-image-generation
[3]: /posts/opencode-ollama
[4]: /posts/terminal-ai-coding-tools
[5]: /posts/fable-5-access-suspended
[6]: /posts/fable-5-access-restored
[7]: /posts/agent-hollow
[8]: https://hermes-agent.nousresearch.com/
[9]: /posts/private-ai-k8s-stack
