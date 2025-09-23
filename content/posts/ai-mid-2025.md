---
title: My experience with AI in 2025
author: aj
date: 2025-09-23
categories:
  - AI
tags:
  - ai
  - llm

---

This post was written by a human but here is an AI generated glossary for the terms I throw around.
- **LLM (Large Language Model)**
    
    A type of artificial intelligence model trained on vast amounts of text data to understand and generate human-like language. LLMs power tools like ChatGPT, enabling tasks such as answering questions, summarizing, and writing code.
    
- **MCP (Model Context Protocol)**
    
    An emerging protocol that standardizes how AI models communicate with external tools, applications, and data sources. MCP allows an AI system to extend its abilities by connecting to different services in a structured and secure way.
    
- **GPT (Generative Pre-trained Transformer)**
    
    A family of large language models developed by OpenAI, designed to generate text by predicting the next word in a sequence. GPT models are pre-trained on diverse datasets and then fine-tuned for specific tasks like conversation, coding, or content creation.
    
## My personal anecdotes

In the past year, the tools I use in my day to day work both at home and for my job have radically shifted. A year ago I started running Large Language Models on my own homelab hardware. Check out [that previous post][1]. All of those local models have continued to be more of a gimmick compared to how fast companies like OpenAI and Anthropic are releasing new versions that improve in utility. Local LLMs are able to answer basic questions (with dubious accuracy) and create simple scripts but I did not use it much.

At work my colleagues started using tools like chatGPT more to complete tasks at work. We had several discussions at work and concluded that until we can control where the models are running, we should limit our use to non-confidential questions to chat LLMS.

Starting in Spring 2025, my company opened the floodgates and we had access to Google's Gemini Pro models that integrate with Google Workspace and we started using GitHub Copilot. A few months later we set up AWS Bedrock and Google Cloud Vertex AI to access bleeding edge models like Claude Opus 4 via API. At this point things started changing rapidly. Copilot was somewhat useful in providing better auto-complete in an IDE. I got it working in VSCode and Neovim. Once Copilot introduced agent mode I started to use it more. The agent mode introduces tools to the model so it can search the web, create new files, run commands in a shell, and with the introduction of MCP servers, people can provide an interface for the LLMs to use many popular services that humans use.

After Copilot, we started using Claude Code via AWS bedrock. This agentic coding CLI has been the AI tool I have used the most at work. It produces better plans and changes than Copilot and I am able to run tasks in parallel with ease. Claude Code has changed how I approach daily work. Now I usually start my day by having claude look through my Jira and slack via MCP servers, create some high level objectives based on my tasks to complete and then if something is simple enough, I will have Claude create a plan and then start executing in a new git branch. (IMO it still has to be a simple task if I am going to invest time prompting an LLM instead of just doing it myself).

These tools still feel like early alpha/tech preview stage and yet they have been adopted by the industry and folks at my company what felt like overnight. I **feel** like we are close to a plateau. I have tried many similar AI coding tools and they all feel the same but the rate at which they are improving is still impressive. I wonder how long this rate of improvement will continue?

So far I have tried these GUI tools:

- Cursor (similar IDE to VSCode but AI coding extensions are pre-configured and customized by Cursor project/company)
- ChatGPT desktop
- Claude desktop
- GitHub Copilot

At work I use VSCode + Claude Code extension as an IDE. I always have terminal open in the IDE for access to CLI tools.

I have tried these CLI tools:
- Claude Code
- Gemini CLI
- OpenAI Codex CLI

My daily driver is Claude Code on the Command Line. I have created some custom tools so I can run commands like `/pr-review` which summarizes a colleagues' PR or `/think-hardest` to work on planning a new task/project. I review changes in Neovim or VSCode. I have never been able to create a 100 percent AI generated PR but most of the time prompting and tweaks in Neovim get the task across the line.

When it comes to my work, I like to keep to the motto "Keep it Stupid Simple". I try to find the most simple way to solve a problem. This usually goes out the window when you are at work though as you have to work with a codebase that is a decade or older unless you are at a startup. Some of my most successful projects as a Senior Engineer have been something like removing 10k lines of code and replacing it with 1k by using a more efficient architecture.

I will not lie, the past few years have not been rosy in the tech industry. I have survived multiple rounds of layoffs and we are expected do deliver projects with fewer engineers that a few years ago. Now enter AI generated code. I see us leaning more into these AI tools and trying to offload work to Claude Code for tasks that may typically sit in the Jira backlog for a while. 

Unless you carefully guide an LLM and you already have a detailed architecture in mind, you are never going to get a simple solution from vibe coding something that you have not implemented before. I am seeing more 90+ percent AI generated PRs at work that _look_ correct but somehow always feel unnecessarily verbose. These tools can also be dangerous if you do not know what you are doing. We tried to have Claude vibe code some new AWS infrastructure with terraform but Claude just used local state file and an engineer + Claude ended up creating a whole DNS mess from locally applied Terraform code.

_Outside of work_, there are now just as many iOS and Android apps for these popular LLMs. I have these iOS apps on my iPhone:
- ChatGPT (OpenAI)
- Claude (Anthropic)
- Gemini (Google)
- Grok (xAI)

Now even my terminal app on macOS, iterm2, has AI chat integrated. I am not going to use that because the agent CLIs seem more useful. I could be missing out but I doubt it.

For personal projects, I have a ChatGPT subscription and I have been linking the latest iteration of Codex. I can assign tasks to Codex in GitHub or from my iPhone and it will open a PR with the requested changes. I look forward to seeing this improve. For now I will only use it on projects where I clearly understand the codebase and intended architecture.

## So my question is what comes next? Artificial General Intelligence? Have we hit a plateau for these Large Language Models?

I would guess that now that the general public is so familiar with tools like ChatGPT we will move on to tools and solutions that are more specialized for specific knowledge domains. A generalist can never reach mastery of one skill and all LLMs are generalists by design. The way that humans communicate and the way we "prompt" AI is vastly different from how the hardware in a computer/phone communicates. 

We probably want to move to specialized AI models where one model is a master of human language with a completely separate model that understands the instructions that a CPU expects. I already see AI agents running code to feed information back to themselves. We need to optimize the interface between AI models at a high level similar to how Anthropic have created MCP to help AI agents use existing software.

 [1]: /posts/ollama-blog/