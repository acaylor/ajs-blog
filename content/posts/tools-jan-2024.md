---
title: Tools used Jan 2024
author: aj
date: 2024-01-08

categories:
  - Utilities
tags:
  - linux
  - macos
  - software
---

Mostly I have written blog posts to show how to get started with certain tools to use in a Homelab. Once I created a post showing off tools to install on a fresh Windows 10 workstation but I have not used Windows as a workstation since changing jobs in 2022.

There are certain tools I use on my macOS workstation at my job and most of these are also available to use on my Debian desktop workstations also.

Since this post is all about tools I will break it up by categories.

## Development tools

I will start with tools that I use for development work on macOS and Linux. If you are using Windows and the tool is command line based, you can install the [Windows Subsystem for Linux](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux) to run them on your machine.

### Terminal emulators

Most quick tasks can be accomplished in a terminal emulator. This program will also open other terminal based tools. Before setting up a terminal emulator, I recommend checking out [zshell](/posts/zshell).

#### kitty

My terminal emulator of choice is [kitty](https://github.com/kovidgoyal/kitty) which is hardware accelerated by a GPU. I can use it on macOS and Linux and the key bindings are the same on each OS. I usually don't need to use a terminal multiplexer because kitty supports opening and switching to multiple windows, tabs, and panels.

#### iterm2

On macOS I also sometimes use [iterm2](https://iterm2.com/) because it works so well with macOS and includes shell integration.

You can install with brew:

```shell
brew install --cask iterm2
```

Now you can quit the mac terminal app and enter terminal commands in iterm2 app.

### Text editors

When working with source code and configuration files for software, a good text editor that includes syntax highlighting is useful for viewing and editing code.

#### Vim

Vi 'workalike' with [many additional features](https://www.vim.org/). This is a text editor that works in a shell/terminal.

My text editor of choice is Vim. There is a steep learning curve but the benefit of learning Vim is that it is a minimal program that can be found on systems that do not have a graphical user interface such as headless Linux servers.

I have a whole post on the topic of [vim and setting up some addons](/posts/vim).

#### neovim

If you like vim but also want to get your hands dirty integrating and writing advanced plugin ecosystem, check out [neovim](https://neovim.io).

You can open with `nvim`

Customizations can be written in Lua.

#### Obsidian

This one is not open-source but I still love using it. [Obsidian](https://obsidian.md/) is for taking and organizing notes. I have the app on iOS, macOS, and Linux. Your notes are created in markdown format and saved to markdown files.

I sync my important notes with a git repository initialized in the same directory where Obsidian saves notes. It also supports other backends for sharing notes across devices.

#### sublime text

This is shareware text editor that has installation packages for Windows, Linux distros and macOS. It natively supports popular programming languages and markup languages. Users can customize with themes and plugins with a python API.

### IDE

Sometimes you need to create source code for a program with a more robust environment than a simple text editor can provide. An IDE is an integrated development environment. You can find these bespoke for certain programming languages or some focused on Web development.

#### Visual Studio Code

This is shareware text editor that has installation packages for Windows, Linux distros and macOS. It natively supports popular programming languages and markup languages. Users can customize with themes and plugins with a JavaScript API.

There is an open-source [repo on GitHub](https://github.com/microsoft/vscode) for vscode, that code is used to compile alternatives such as 'vscodium'. Alternatively you can clone that repo and build the app yourself without the extension marketplace and have only open-source components on your system.

The packaged version of Visual Studio Code includes proprietary code from Microsoft and the extension marketplace. Download instructions on [visualstudio.com](https://code.visualstudio.com/download)

The main reason I always come back to this one is the extension marketplace. Here are some recommended extensions in 2024:

- Auto Rename Tag (update closing tag in html and xml tags)
- Code Runner (this helps vscode act a proper ide)
- eslint (if you write JavaScript)
- Prettier (code formatting)
- Code Spell Checker (spell check various spoken languages)
- Error Lens (this helps vscode act a proper ide)
- Live Server (built in dev web server)
- Material Icon Theme
- gitlens
- Git Graph
- Remote - SSH

Language support vscode extensions:
- Python
- YAML
- Go
- Markdown All In One
- XML


#### DataGrip

This is part of the popular products offered by Jet Brains. [DataGrip](https://en.wikipedia.org/wiki/JetBrains#DataGrip) is an IDE for working with databases. It will work with SQL databases such as MySQL, MariaDB, PostgreSQL and non-relational databases such as MongoDB and even in-memory databases such as Redis.


#### adminer

I don't know where else to stick this but there is a versatile program written in php that provides a front end interface for some popular database management systems like MySQL and PostgreSQL. This tool is called [adminer](https://www.adminer.org/) There is also a container image that you can run along side a database container.

---

## Command Line tools

There are plenty of tools that you can use and get a lot of work done without ever leaving the terminal.

### command line metrics

Most GNU/Linux systems come with the `top` utility installed or available in the default system packages. This program allows you to view running processes and some of their usage metrics. There are plenty of open-source tools that show more metrics than `top`. I recommend checking these out and some can be installed without adding any additional package repos or with [homebrew](https://brew.sh/) on macOS.

- `btop`
- `htop`
- `vtop`
- `glances`
- `nvtop`

Unlike the others, `nvtop` is focused on showing short term GPU metrics while the others will show summaries of processes, CPU, Memory, Network, and Disk usage.

### cli Network tools

- `gping` ping with a graph
- `nc` netcat is always useful for network debugging
- `iftop` shows live network stats
- `termshark` a TUI app similar to Wireshark

### other cli tools

- `ag` Code searching tool `the_silver_searcher` similar to `grep -r` but much more performant.
- `bat` like `cat` but adds syntax highlighting for source code files
- `http` Known as HTTPie . API testing client on the CLI.
- `jq` and `yq` are cli processors for JSON and YAML documents. Very useful for scraping JSON APIs.
- `ranger` a TUI for browsing local filesystem. Includes previews for text files.
- `k9s` a TUI for managing kubernetes
- `lazydocker` a TUI for managing docker containers on your system
- `podman-tui` a TUI for managing podman containers but this requires a podman socket.
- `lazygit` a TUI for git commands
- `violet` a TUI for Hashicorp Vagrant commands
- `pandoc` quickly convert document file types
- `ss` you need to learn this to debug sockets
- `wordgrinder` is a TUI word processor. Simple without endless menus.
- `wttr.in` this is not a tool you install but you can `curl` or use a CLI user-agent like `HTTPie` to check the weather in the terminal
 - Ex. `curl wttr.in/Chicago`
 - `fzf` fuzzy find integration with your shell. Also useful for searching through shell history.


I'm sure there are thousands of CLI tools I have yet to discover and some of these may end up deprecated.

---

## Observability

When you operate more than one computer or web application, you need to have observability systems for collecting metrics and logs that will help you troubleshoot your systems when issues arise.

### Metrics

#### prometheus stack

In order to collect system and application metrics, I use [prometheus](https://prometheus.io/) stack which is a time-series database for storing metrics and exporters for collecting metrics. There is a central prometheus server that collects metrics every `n` seconds that you configure from targets that are typically web servers that expose a `/metrics` endpoint.

#### Grafana

For visualizing metrics and logs, I use [Grafana](https://grafana.com/oss/grafana/) for creating dashboards and alerts.

### Logs

#### Grafana Loki

Grafana has another open-source software for storing logs from all of your systems and applications and indexing them for you to query and create alerts. [Loki](https://grafana.com/oss/loki/) allows you to store logs on a file system or an object file store such as s3/minio.

---

## File storage

#### Syncthing

I use [syncthing](https://syncthing.net/) to keep my downloads and projects synced on multiple systems. Syncthing is an open-source file syncing app.

#### minio

A lot of software now supports cloud object storage instead of relying on an operating system and a file system such as ext4, xfs, zfs, btrfs. [MinIO](https://min.io/docs/minio/kubernetes/upstream/) presents object storage using the s3 API. That is the simple storage system created by Amazon Web Services.

This tool can be used to provide object storage for development, "the Edge", or in a homelab where you do not want to interface with a public cloud backend.

---

## Personal

There are plenty of tools that are useful to a desktop user but not related to software development or homelab.

### Productivity

- At the homelab I use [LibreOffice](https://www.libreoffice.org/) which is not as robust as Excel but for personal productivity it is sufficient.
- Obsidian I will mention again for taking notes and staying organized.
- [kanboard](/posts/kanboard) is a tool I made a post about. I use this for organizing projects. It can be used for agile software development.
- [Firefox](https://www.mozilla.org/en-US/firefox/new/) is my web browser of choice and it is able to use hardware video decoding on Linux.
- [Librewolf](https://librewolf.net/) is my second web browser of choice. It removes the telemetry built in to Firefox. It purges every browsing session so I use it for online shopping to avoid being tracked by advertisers.

### Gaming

#### Steam

It is incredible in the past few years how much Valve Software has brought gaming to Linux desktop. They integrated [proton](https://github.com/ValveSoftware/Proton) into Steam which is an enhanced Windows emulator for running video games that rely on Microsoft DirectX APIs to operate.
