---
title: Opencode and Ollama
author: aj
date: 2025-12-05

categories:
  - AI
  - Software Development
tags:
  - ai
  - llm
  - ollama
  - opencode
---

Running AI-powered coding assistants locally doesn't have to break the bank or compromise your privacy. With OpenCode and Ollama, you can create a local development environment that compares to commercial tools like Claude Code and Gemini CLI. All will run on your network instead of some cloud platform.

In this post, we'll walk through everything you need to know to get OpenCode working seamlessly with Ollama's local models.

## What You'll Need

Before we dive in, make sure you have:

- **GPU** You need a sufficiently powerful GPU and 24+ GB of memory available to the GPU to run the models I show. It is possible to run smaller models on systems like the M-series macOS systems that use "Unified Memory" which allows your GPU to get more memory than a standalone GPU with dedicated VRAM.
- **Ollama** installed and running on your system. If you are not familiar with Ollama, check out [a previous post][1] to get started and set up Ollama.
- **Node.js** (version 20 or higher recommended). Opencode is a JavaScript application and is published to the public Node package manager repo.
- A terminal or command line interface. [I use ghostty in 2025][3].
- At least one Ollama model downloaded, later on we will show ones you can pull.


## Step 1: Install OpenCode

First, let's get OpenCode installed on your system. 

There are multiple methods to install. I will use the Node.js package manager. For more options, check out the [official documentation][2].

Open your terminal and run:

```bash
npm i -g opencode-ai
```

This installs OpenCode globally, making it available from anywhere on your system.

Once installation completes, verify it worked by running:

```bash
opencode --version
```


## Step 2: Pull an Ollama Model

OpenCode works best with models that support tool calling. Tools give the ability for the AI to interact with your codebase through functions like reading files, writing code, and executing commands. Let's download a compatible model:

```bash
ollama pull gpt-oss:20b
```

For more demanding tasks, you might want a larger model:

```bash
ollama pull qwen3-coder:30b
```

> **Note:** Ollama defaults to a 4096-token context window even when models support much larger contexts. We'll fix this in the next step to unlock the full potential of your models.


## Step 3: Increase the Context Window

Here's a critical step that many people miss. To enable agentic actions and tool use in OpenCode, you need to manually increase the context window. Here's how:

```bash
# Connect to your Ollama instance
ollama run gpt-oss:20b

# Inside the Ollama prompt, set a larger context
>>> /set parameter num_ctx 16384

# Save this as a new model variant
>>> /save gpt-oss:20b-16k

# Exit
>>> /bye
```

This creates a new model variant with a 16,384 token context window. Without this tweak the model will use the default context window for ollama which is by default too low to use tools.


## Step 4: Configure OpenCode

Now we need to tell OpenCode how to talk to a local Ollama server. 

Create or edit the configuration file at `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (local)",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      },
      "models": {
        "gpt-oss:20b-16k": {
          "name": "GPT OSS 20b (16k context)"
        }
      }
    }
  }
}
```

Let's break down what each part does:

- **`ollama`**: Your custom provider ID (you can name this anything)
- **`npm`**: Specifies the AI SDK package; for OpenAI-compatible APIs like Ollama, use `@ai-sdk/openai-compatible`
- **`baseURL`**: The endpoint for your local Ollama server, typically http://localhost:11434/v1
- **`models`**: is a map of model IDs to their configurations. The model name will be displayed in the model selection list.


## Step 5: Select Your Model

Launch OpenCode and select your newly configured model:

```bash
opencode
```

Inside the OpenCode interface, run:

```
/models
```

You should see your Ollama model in the list. Select it, and you're ready to code!

![opencode_models](/images/opencode_models.png)

## Step 6: Test It Out

Let's verify everything works correctly. Try a simple command:

```txt
Create a hello.py file that prints 'Hello from Ollama!'
```

If your setup is correct, OpenCode will use your local Ollama model to generate the file. You should see the AI thinking through the task and then executing it.

![opencode_prompt](/images/opencode_prompt.png)

Next I asked it to check the git status as I was hoping to see it use tools successfully. It managed to use the bash tool after failing once to use a non-existent git tool. Your milage may vary as LLMs are non-deterministic.

![opencode_prompt2](/images/opencode_prompt2.png)

## Advanced Configuration

### Multiple Models

Want to switch between different models? You can configure multiple Ollama models in your config file:

```json
"models": {
  "gpt-oss:20b-16k": {
    "name": "GPT OSS 20b (16k context)"
  },
  "qwen3-coder:30b-16k": {
    "name": "Qwen3 Coder 30b (16k context)"
  }
}
```

Switch between them anytime using the `/models` command in OpenCode as shown earlier.

### Configure ollama via environment

If you are running ollama as a single process or a systemd service, you can also use an Environment variable to override the default context window. For example my systemd service looks like this:

```ini
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="PATH=$PATH"
Environment="OLLAMA_CONTEXT_LENGTH=32000"

[Install]
WantedBy=default.target
```

## Troubleshooting Common Issues

### Tools Aren't Working

If OpenCode's file operations and commands aren't executing:

1. Verify your context window is set to at least 16k-32k tokens
2. Make sure you're using a model that supports tool calling (Qwen, GPT OSS, and similar models work well)

### Model Not Appearing

Run these checks:

```bash
# Verify your model is available in Ollama
ollama list

# Check OpenCode can see your config
cat ~/.config/opencode/opencode.json
```

### Connection Errors

Ensure Ollama is running and accessible at the baseURL specified in your configuration, typically `http://localhost:11434/v1`.

## Next steps

Now that you have OpenCode running with Ollama, you can:

- **Generate entire applications** from natural language descriptions
- **Refactor code** with AI-powered suggestions
- **Debug issues** by asking the AI to analyze your code
- **Write tests** automatically for your functions
- **Document code** with intelligent comments

The best part? Everything runs locally, so your code never leaves your machine(s), and there are no usage limits or API costs.

## Closing thoughts

These tools give a taste of what is possible with Generative AI coding agents but the truth is as of December 2025, foundation models from labs like OpenAI and Anthropic and Google are going to perform so much better than these local models running on your GPU.

I don't use this setup for work but I think for homelab it can be useful to build and enhance simple scripts or apps that don't require massive Context to be loaded into the model.

If you want to use Generative AI to write code professionally, your best bet is _not_ a free LLM or service whether that is running local or in the cloud. My personal opinion is that Anthropic models like Sonnet 4.5 and Opus 4.5 along with a harness like Claude Code or Cursor are the best AI coding agents available at this time.

I also strongly believe that AI coding should only be done at the level you have already mastered. If you understand what you want to build and how to build it, you can better describe to the LLM what code should be created and you can actually read and understand what the LLM has created. If you rely on the LLM to write the code for you and you are not familiar with coding or your app source code, you will be in trouble the next time there is an incident and you have no idea how anything works or you want to create a new feature.

_New disclaimer I am adding: I used an LLM to help create this post but afterwards I spent more than an hour editing it to the final form._

 [1]: /posts/ollama-blog/
 [2]: https://opencode.ai/docs
 [3]: /posts/ghostty/