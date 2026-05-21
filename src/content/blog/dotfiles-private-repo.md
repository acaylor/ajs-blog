---
title: Dotfiles in a private Git repository
author: aj
date: 2026-05-20
description: 'A simple way to track shell, Git, SSH, and other configuration files with a private bare Git repository.'
categories:
  - Command Line
tags:
  - git
  - dotfiles
  - terminal
  - cli
  - developer tools
---

I have spent a lot of time setting up shell environments, editors, terminal utilities, and Git configuration across different computers. Some of that configuration is easy to recreate from memory, but most of it is small enough that I do not want to keep rediscovering it every time I set up a new machine.

There are dedicated dotfile managers that do a great job with templating, machine-specific config, and bootstrapping a new system. I still think tools like [chezmoi][1] are worth using if you want that extra structure. For my own setup, I wanted something simpler: a private Git repository that tracks selected files directly from my home directory.

The trick is to use a bare Git repository for the metadata and use `$HOME` as the working tree. The config files stay where the tools already expect them to be:

```text
~/.zshrc
~/.gitconfig
~/.ssh/config
~/.config/nvim/init.lua
~/.config/zed/settings.json
```

Git only tracks the files I explicitly add, so the rest of my home directory stays ignored.

## How the bare repository works

A normal Git repository keeps its metadata in a `.git` directory inside the working tree:

```text
.git/
README.md
src/
```

For dotfiles, I do not want a separate `~/dotfiles` directory full of copies or symlinks. I want `~/.zshrc` to be `~/.zshrc`, and I want `~/.config/nvim/init.lua` to live where Neovim already reads it.

A bare repository separates the Git metadata from the working tree:

```bash
git --git-dir="$HOME/.dotfiles" --work-tree="$HOME"
```

Typing that every time would get old quickly, so I use a shell alias:

```bash
alias dot='git --git-dir="$HOME/.dotfiles" --work-tree="$HOME"'
```

After that, `dot status`, `dot add`, `dot commit`, and `dot push` behave like normal Git commands, but they operate on files in my home directory.

## Create the private repository

First, create a private repository wherever you host Git repositories. I use a private repo because dotfiles often contain hostnames, paths, usernames, SSH aliases, editor settings, and other information I do not need to publish on the internet.

Private does not mean secret-safe though. I still avoid committing passwords, API tokens, private keys, cloud credentials, and anything else that belongs in a password manager or secret store.

## Initialize the local repo

On the machine that already has the dotfiles I want to track, initialize the bare repository:

```bash
git init --bare "$HOME/.dotfiles"
```

Then add the alias to `~/.zshrc`:

```bash
alias dot='git --git-dir="$HOME/.dotfiles" --work-tree="$HOME"'
```

Reload the shell configuration:

```bash
source ~/.zshrc
```

The next setting is the one that makes this workflow usable:

```bash
dot config status.showUntrackedFiles no
```

Without that setting, `dot status` would try to show every untracked file under my home directory. That is technically accurate, but completely unhelpful.

## Add the remote

Point the local bare repository at the private remote repository:

```bash
dot remote add origin git@example.com:you/dotfiles.git
```

Use the remote URL from your Git host. HTTPS works too:

```bash
dot remote add origin https://example.com/you/dotfiles.git
```

## Track files explicitly

Add only the files you actually want in the repository:

```bash
dot add ~/.zshrc
dot add ~/.gitconfig
dot add ~/.ssh/config
dot add ~/.config/nvim/init.lua
dot add ~/.config/zed/settings.json
```

Because the working tree is `$HOME`, paths are stored relative to the home directory. For example, `~/.zshrc` is tracked as `.zshrc`.

Check what is staged:

```bash
dot status
```

Then commit and push:

```bash
dot commit -m "Initial dotfiles"
dot branch -M main
dot push -u origin main
```

After that, the normal workflow is boring in the best way:

```bash
dot status
dot add ~/.config/nvim/init.lua
dot commit -m "Update Neovim config"
dot push
```

## Clone on a new machine

On a new machine, clone the private repository as a bare repository:

```bash
git clone --bare git@example.com:you/dotfiles.git "$HOME/.dotfiles"
```

Create the alias again:

```bash
alias dot='git --git-dir="$HOME/.dotfiles" --work-tree="$HOME"'
```

Then hide untracked files from `dot status`:

```bash
dot config status.showUntrackedFiles no
```

Before checking out the files, remember that Git will refuse to overwrite files that already exist. That is useful because a fresh machine may already have files like `~/.zshrc` or `~/.gitconfig`.

Move any existing files aside first:

```bash
mkdir -p ~/.dotfiles-backup
mv ~/.zshrc ~/.dotfiles-backup/.zshrc
mv ~/.gitconfig ~/.dotfiles-backup/.gitconfig
```

Then check out the repository into `$HOME`:

```bash
dot checkout
```

If Git reports more files that would be overwritten, move those aside too and run `dot checkout` again.

## Useful commands

List the files currently tracked:

```bash
dot ls-files
```

Check changes to tracked files:

```bash
dot status
dot diff
```

Add a new file:

```bash
dot add ~/.config/example/config.toml
dot commit -m "Add example config"
dot push
```

Stop tracking a file without deleting it locally:

```bash
dot rm --cached ~/.config/example/config.toml
dot commit -m "Stop tracking example config"
```

## What I keep out

Even with a private repository, I do not use Git as a secret manager. These stay out of my dotfiles repo:

- private keys
- API tokens
- passwords

For SSH, I may track `~/.ssh/config`, but I do not track private keys like `~/.ssh/id_ed25519`.

For Git, I may track `~/.gitconfig`, but I keep credentials in a password manager or shell profile that is not checked into git.

## Why I like this setup

The main advantage is that there is almost no machinery:

- no symlink manager
- no install script required
- no duplicated config directory
- no new dotfile-specific command to learn

It is just Git with a small alias wrapped around it. The only unusual part is remembering that the repository metadata lives in `~/.dotfiles`, while the working tree is `$HOME`.

[1]: https://www.chezmoi.io/
