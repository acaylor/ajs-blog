---
title: A Linux development environment with mise
author: aj
date: 2026-08-15
image: /images/mise-logo.svg
description: 'Moving all my sourcecode and four AI coding agents from macOS to Linux with mise managing all my tools.'
categories:
  - Linux
  - Software Development
  - AI
tags:
  - linux
  - macos
  - mise
  - javascript
  - development-environment
  - claude-code
  - codex
  - opencode
  - pi
---

I recently set up a new Linux machine as a development environment. I have used macOS for development for over a decade so I know where my tools live on a Mac, which shell profile gets read, and where each CLI keeps its state. A fresh Linux install has none of that. It has a prompt and an empty `PATH`.

The machine in this post is a Linux host called `ayymd`. I had already copied my `sourcecode` tree to `/home/aj/sourcecode`, but the rest of the move was more interesting than `rsync`. I use four AI coding agents: Claude Code, Codex, OpenCode, and Pi. Each one keeps session history in a different way. I wanted the new host to be a real development environment with my recent agent sessions available, not a second terminal that starts every task from zero. If you are not familiar with these coding agents, check out [a previous post][7] where I set up OpenCode with local models.

In this post I will cover the setup I ended up with: Node 24 LTS and the agent CLIs managed by [mise][1], session history moved over where the tools support it, credentials deliberately left behind, and enough path translation to make a Mac-shaped history useful on Linux.

## Moving session history

The first transfer was simple. I copied the local session directories with `rsync`:

```bash
rsync -a ~/.claude/projects/ ayymd:.claude/projects/
rsync -a ~/.codex/sessions/ ayymd:.codex/sessions/
rsync -a ~/.codex/archived_sessions/ ayymd:.codex/archived_sessions/
rsync -a ~/.pi/agent/sessions/ ayymd:.pi/agent/sessions/
```

That preserves the data but it is not enough for the tools to actually find the sessions. On the Mac my projects lived under:

```text
/Users/aj/sourcecode/...
```

On Linux they live under:

```text
/home/aj/sourcecode/...
```

This matters because agent transcripts record their working directory, and some tools use that path to figure out which project a session belongs to. A transcript that says it was created in `/Users/aj/sourcecode/public/apps/web-tools` points at a path that does not exist on the Linux host.

One option is to create a compatibility symlink at `/Users/aj` and resume sessions through that path. In addition, for the directories I had actually moved, I kept the raw Mac-path copies, made Linux-path copies, and rewrote the single known prefix `/Users/aj/sourcecode` to `/home/aj/sourcecode`. I did not run a broad search-and-replace through every transcript. The untouched originals are my rollback plan if something goes wrong.

Going through the sessions was also a useful inventory exercise. Several old session paths were repositories that had been renamed, not repositories that were missing. For example, an old OpenCode session pointed at `public/web-tools` but the repository now lives at `public/apps/web-tools`. If you do a migration like this, checking whether the old path exists is not enough. You also need a mapping for repositories that moved.

## Leave credentials behind

I copied transcripts and the configuration needed to locate them. I did **not** copy authentication files, browser cookies, API keys, or macOS keychain state.

This is intentional. Session history is just data, but copying credentials between machines is a security shortcut and can cause weird problems that are hard to debug later. The first thing to do on the new Linux host is log in to each provider normally. A session should survive a host move but a login should not have to.

The four tools turned out to have four different migration stories.

### Claude Code and Pi: JSONL files

Claude Code stores local project data under `~/.claude/projects/`. Pi stores JSONL sessions under `~/.pi/agent/sessions/`, organized by working directory. Both are portable enough to back up as plain files, but both care about the original working directory.

On `ayymd` I kept the Mac-path originals and created Linux-path copies for the source tree. That gave me 23 relocated Claude project directories and 4 relocated Pi JSONL sessions. Starting either tool from `/home/aj/sourcecode/<project>` now shows the session history for that Linux checkout.

Plain files are nice for this. They are easy to inspect and easy to recover. If a future version changes how the session picker indexes them, I still have the original transcripts instead of an opaque database export.

### Codex: copy the rollouts, let it rebuild the index

Codex keeps its durable rollout history under `~/.codex/sessions/` with archived history under `~/.codex/archived_sessions/`. I copied 133 active JSONL files and 37 archived JSONL files to the Linux host.

The local metadata/index does not need to be copied. Codex can rebuild it from the rollout files on startup, so after signing in on Linux the workflow is simply:

```bash
codex resume --all
```

Move the append-only source of truth and let the new installation build its own cache.

### OpenCode: export and import

OpenCode has a proper export/import path, so I used that instead of copying its SQLite database. On the Mac, I exported each session I wanted as JSON:

```bash
opencode export <session-id> > session.json
```

Then, from the corresponding checkout on the Linux host:

```bash
opencode import session.json
```

Make sure to run the import from the destination project directory. That associates the session with the current project and path instead of keeping the old Mac path.

I had 59 OpenCode sessions. I exported all of them and imported 58 into their current Linux locations after mapping the renamed projects. The last export belongs to `~/.dotfiles`, which I did not copy to this machine. It stays saved as an export file in case I ever bring that repository over. An export file sitting on disk is much better than a fake empty project directory created just to make the session picker happy.

## Managing tools with mise

My first Linux bootstrap was simple: download Node, put it under `~/.local`, install the agent packages with npm, and verify the versions. It worked, but now I had a custom Node directory, npm globals, distro packages, and several separate update mechanisms to remember.

This is exactly what [mise][1] is good at. It is a version manager, but it also works as a declarative list of all the developer tools my user account owns.

I installed mise into `~/.local/bin` and activated it in Bash and Zsh:

```bash
curl https://mise.run | sh

echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc
```

In a new interactive shell, mise puts the active tool directories ahead of `~/.local/bin` and `/usr/bin`. That means an upstream `eza`, `gh`, `ripgrep`, or agent CLI can replace Ubuntu's older copy without removing the package the operating system installed. Shims are a separate option for contexts that do not run interactive shell activation, more on that later.

### Who owns what

The important decision here is a boundary, not trying to force every file on the machine through one package manager.

Ubuntu owns the operating system: the kernel, GPU drivers, the desktop and display stack, systemd services, shared libraries, compilers and headers, and bootstrap basics like `git`, `curl`, and `zsh`. Those packages need distro integration, ABI compatibility, or privileged installation.

mise owns user-scoped development software: language runtimes, package managers, terminal applications, cloud and Kubernetes clients, coding agents, and standalone GUI developer tools. My global manifest now contains entries like:

```toml
[tools]
# Stay inside the LTS line rather than following the newest Node major.
node = "24"
python = "latest"
go = "latest"
rust = "latest"

# Resolve current upstream releases instead of Ubuntu 24.04's snapshots.
eza = "latest"
gh = "latest"
glab = "latest"
ripgrep = "latest"
godot = "latest"
"npm:@anthropic-ai/claude-code" = { version = "latest", allow_builds = ["@anthropic-ai/claude-code"] }
"npm:@openai/codex" = "latest"
"npm:opencode-ai" = { version = "latest", allow_builds = ["opencode-ai"] }
"npm:@earendil-works/pi-coding-agent" = "latest"
```

The full manifest also covers tools like `bat`, `btop`, `cmake`, `fd`, `fzf`, `jq`, `k9s`, `kubectl`, `lazygit`, `neovim`, `pandoc`, `rclone`, `terraform`, `tmux`, `yq`, `zoxide`, and the GitHub (`gh`) and GitLab (`glab`) CLIs. mise picks the appropriate backend for each package: Aqua for upstream release artifacts, npm for JavaScript CLIs, `go:` and `cargo:` for Go and Rust tools distributed as source, and `pipx:` through `uv` for Python CLIs. I no longer run `npm install -g`, `go install`, `cargo install`, or `pipx install` directly for any of these.

> Note: the `allow_builds` entries are needed because mise disables npm lifecycle scripts by default. Claude Code and OpenCode both need their package-level postinstall step to install native binary components, so I allowlist those specific packages instead of enabling scripts for everything.

The manifest lives next to my Ubuntu bootstrap script and gets copied to `~/.config/mise/config.toml`. That makes the whole user environment reproducible. A bootstrap script can install the distro baseline, install mise, activate the shell integration, copy the manifest, and run `mise install`. There is no hand-maintained list of global npm commands anymore.

Day-to-day updates are now short:

```bash
mise outdated
mise upgrade
mise self-update
```

`latest` entries move to the newest published stable release. `node = "24"` moves only within Node 24, so I stay on the LTS line. The desired state of the machine is visible in one file instead of whatever `npm update -g` happened to do six months ago.

## Applying the same setup to an existing Fedora workstation

I later applied the same manifest to `papa`, an established Fedora 44 workstation. It already had development software from RPM, rustup, pipx, and a root-owned global npm install. It also had years of project virtual environments, an NVIDIA stack, and an Ollama system service. Running the Ubuntu bootstrap script on that machine would have been a mistake.

The safer sequence was to install mise without activating it, copy the manifest, and build the new environment alongside the old one:

```bash
curl https://mise.run | sh
mkdir -p ~/.config/mise
cp linux-workstation.toml ~/.config/mise/config.toml

# npm's mise wrapper invokes mise while reshimming, so the binary itself must
# be on PATH even before shell activation is enabled.
export PATH="$HOME/.local/bin:$PATH"
mise install --yes

# Exercise the managed tools without changing normal command resolution yet.
mise exec -- node --version
mise exec -- opencode --version
mise doctor
```

Only after every declared tool installed and worked through `mise exec` did I activate mise in Bash and Zsh. I also put the shims on `PATH` for noninteractive SSH commands and GUI applications that do not read `.zshrc`:

```bash
# ~/.zshrc and ~/.bashrc use the matching shell name
eval "$("$HOME/.local/bin/mise" activate zsh)"

# ~/.zshenv and ~/.profile
export PATH="$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH"
```

The difference between the two: interactive activation puts the actual install directories on `PATH` and responds immediately to project configuration. Shims give noninteractive callers a stable path that asks mise which version should run.

### You do not have to uninstall every fallback

I previewed removal of the now-shadowed Fedora packages with `dnf remove --assumeno`. A broad cleanup wanted to remove Anaconda installer metadata along with boot, storage, and recovery dependencies. Removing `jq` alone reached into Clevis and Dracut packages. Not worth it to save a little disk space.

The RPM copies remain installed, but they no longer own command resolution for my user. mise wins in interactive shells, noninteractive SSH sessions, and GUI launch environments. Root and recovery contexts keep Fedora's versions. To me "one owner" means one declared source for my active development environment, not an obligation to erase every fallback the operating system knows about.

I applied the same restraint above the package-manager level:

- Rust stays managed through rustup; mise selects the declared toolchain rather than pretending rustup does not exist.
- Existing `.venv` and conda environments continue to own project dependencies. The global mise Python does not replace them.
- Ollama stays a system service because its daemon and GPU integration cross the userspace boundary. Check out [a previous post][8] if you want to set up Ollama.
- Before switching OpenCode from a root npm install to mise, I archived its config and database. OpenCode 1.18 opened the existing database and found all three local sessions, and only then did the old package become a cleanup candidate.

The finished Fedora migration had 45 manifest entries and a clean `mise doctor`, and the workstation's GPU services and project environments were untouched. The pattern is not Fedora-specific: layer the new environment first, verify through `mise exec`, activate second, and delete old installations only when their removal transaction is boring.

## Verify everything

A new environment should be verified from the machine itself, not from the commands you meant to run. This was my final check over SSH:

```bash
ssh ayymd 'bash -lc '\''
  mise current
  for tool in node claude codex opencode pi; do
    printf "%s: " "$tool"
    "$tool" --version 2>&1 | head -1
  done

  find ~/.codex/sessions -type f -name "*.jsonl" | wc -l
  find ~/.codex/archived_sessions -type f -name "*.jsonl" | wc -l
'\''
```

The live host reported:

```text
node: v24.18.0
claude: 2.1.220 (Claude Code)
codex: codex-cli 0.145.0
opencode: 1.18.5
pi: 0.82.1

Codex active sessions:   133
Codex archived sessions:  37
OpenCode exports:         59
OpenCode imported:        58
OpenCode deferred:         1  (~/.dotfiles)
```

The version check is not the whole test. I also confirmed that the commands resolved through mise's install paths, that OpenCode could re-export an imported session from its new database, and that the relocated Claude and Pi session files had no remaining `/Users/aj/sourcecode` references.

The only part left deliberately incomplete is the interactive authentication and the first Codex resume. The session data is on the host, but the Linux host should establish its own account sessions.

## Closing thoughts

The goal was not to turn Linux into a worse Mac. I still have a different shell environment, a different package manager, systemd, and a machine that is happier living over SSH than in a laptop dock.

The continuity I actually needed turned out to be small: the source tree is where I expect it, the development runtime is pinned and updatable, the coding agents are available, and their recent work did not disappear because I changed operating systems.

If you are a macOS developer curious about Linux, I would optimize for that same threshold. Do not start by replicating every preference. Copy the work that matters, leave secrets behind, make the toolchain declarative, and verify the result from the new machine. Once `node`, `git`, an editor, and your familiar agent are available at a Linux prompt, the operating system stops being an experiment and starts being a place to build.

_I used Claude Code, Codex, OpenCode, and Pi while moving their own session histories to this Linux host, and I used an LLM to help draft this post before editing it to its final form._

## Sources

- [mise][1]
- [Node.js releases][2]
- [Claude Code][3]
- [OpenAI Codex][4]
- [OpenCode][5]
- [Pi][6]

[1]: https://mise.jdx.dev/
[2]: https://nodejs.org/en/about/previous-releases
[3]: https://code.claude.com/docs/
[4]: https://github.com/openai/codex
[5]: https://opencode.ai/
[6]: https://github.com/badlogic/pi-mono
[7]: /posts/opencode-ollama/
[8]: /posts/ollama-blog/
