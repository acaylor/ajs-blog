---
title: Losing access to Fable 5 in the middle of a project
author: aj
date: 2026-06-13
description: 'My access to Fable 5 was cut off on a Friday evening mid-project. Then I found out why: a US export control directive suspended access to Fable 5 and Mythos 5 globally.'
image: /images/fable-5-access-suspended.png
categories:
  - AI
tags:
  - anthropic
  - claude
  - claude-code
  - fable
  - llm
  - ai
---

I sat down after work this past Friday to try out the latest AI model from Anthropic. I had a [Claude Code][1] session, the new [Fable 5][2] model picked in `/model`, and I wanted to see how far I could get in a few hours with a simple 3D game. About an hour in, the requests started failing. Not a rate limit, not a network blip on my end, the model itself was simply gone. Switching back to [Opus 4.8][3] worked fine, so it was not my account or my setup.

![fable_5_gone](/images/fable_5_gone.png)

Soon after on social media I found out why. Anthropic published a [statement][4] about it.

## What actually happened

According to the announcement, on **June 12, 2026 at 5:21pm ET** the US government issued an export control directive requiring Anthropic to suspend all access to **Fable 5 and Mythos 5** globally, for every customer.

A few details from the statement worth pinning down, because the first round of takes online got them wrong:

- **It is only Fable 5 and Mythos 5.** Opus, Sonnet, and Haiku are unaffected. That matches what I saw.
- **It is a government directive, not a deprecation.** Anthropic did not pull the model because it broke. They were ordered to.
- **The stated rationale is national security**, with the government citing an alleged jailbreak method that bypassed Fable 5's safeguards. Anthropic says its own review found the demonstrated technique amounted to "minor vulnerabilities" that other publicly available models could surface too. I am perplexed, while a this model was a step up in capabilities I do not see how it is different from competitors such as GPT 5.5 xhigh reasoning.

Anthropic also made clear it disagrees with the suspension, arguing that holding every model to the standard implied here would "essentially halt all new model deployments for all frontier model providers." Read the [full statement][4] for their framing. This feels so unprecedented.

## What it felt like from the user side

There is no graceful degradation when a model disappears by directive. One minute Fable 5 is the thing I am building against, the next it returns errors and the only signal is the request failing. They were complying with an order on a Friday evening. This whole situation smells wrong. Why was this announced on a Friday evening right after the stock markets are closed? Oh and it happened on a day with the largest IPO in history, spacex.

Here's a screenshot of the game after only 2 prompts:

![fable_5_project](/images/fable_5_project.png)

## Where this leaves things

As of this writing the suspension is still in effect and this is a developing situation, so anything here is a snapshot of a moving story. A model I was actively using vanished by government order, the provider says it disagrees, and nobody outside the rooms where this is being decided knows how long it lasts.

I am particularly troubled that the Government is claiming that people outside the US should not be able to access these AI models. Why should we leave the rest of the world out? Then they will leave us out and leave us behind making progress without us. This whole situation feels wrong. Just the thoughts of one engineer.

[1]: https://www.anthropic.com/claude-code
[2]: https://www.anthropic.com/news/fable-mythos-access
[3]: https://www.anthropic.com/claude/opus
[4]: https://www.anthropic.com/news/fable-mythos-access
