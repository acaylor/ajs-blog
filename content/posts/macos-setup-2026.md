---
title: macOS setup early 2026
author: aj
date: 2026-01-11

categories:
  - macOS
tags:
  - macOS
  - tools
  - macOS setup
---

After several years I received a new MacBook Pro from my employer. This post is a walk-through of how I set up a new macOS device right at the start of 2026.

## Setup

When you get a new macOS device, you must follow the setup wizard provided by Apple. If you have multiple Apple devices, you may consider enabling iCloud. I *think* you can still use a mac without and Apple ID.

Regardless of if you have an Apple ID, I recommend first updating to the latest version of macOS in the _System Settings_ app.

One of the nice features of macOS is you have a shell similar to `bash` already present on the system, `zsh`.

To access the shell and the command line on macOS, open the terminal application. I find the easiest way to open applications is with the built in spotlight search: CMD + SPACE will open the spotlight search and then search for "terminal" and press enter when you see the terminal application.

## Finder preferences

I cannot stand the default settings for Finder and saving screenshots to desktop. I suggest making the following tweaks:

### screenshot directory

By default when you take a screenshot (CMD + SHIFT + 4 to select an area or window with SPACE) it will be saved to the desktop. I do not like saving _anything_ to the desktop so to change this, press CMD + SHIFT + 5 to open the screen capture app. Next, click on the **Options** button on the bottom. Change _Save to_ from **Desktop** to something else.

### Finder tweaks

In a finder window, press CMD + , to open the preferences. I suggest changing new finder windows to show your home directory.

In the Sidebar I like to remove **Shared** and add **Pictures** to Favorites. On my work machine, I remove the iCloud drive from the **Locations**.

In Advanced I like to check **Show all filename extensions** and **Remove items from the Trash after 30 days**.

## Development setup

I have a few recommendations for macOS apps that everyone can use but I am starting with development tools because one of the tools I recommend (brew.sh) is used to install all kinds of third-party software from the command line. I assume the audience of my ramblings are folks interested in technology and software development.

You can also install software for macOS on the Apple App Store and from other places such as GitHub if a developer provides a macOS application that you can install on your system.

### xcode

The first thing I will install is `xcode` which is available on the Apple [App Store][1] to download. We need this installed to use tools like `git` and `grep`.

The app should also install the xcode command line tools (BSD tools as opposed to GNU tools you might find on a linux system) but you can specifically install those with this command on the macOS terminal:

```shell
xcode-select --install
```

You can verify the CLI tools were installed (or check before installing) with this command:

```shell
xcode-select -p
```

Also you can check if `git` is now installed:

```shell
git --version
```

At this point there is a license agreement that will more than likely show up in the terminal. On my corporate macbook, I had to use sudo to accept:

```shell
sudo xcodebuild -license
```

### git

In order to work with [git][2] repositories, the `git` program needs to be configured with your username and email.

First you need to [install git manually][3] or use the version installed in the previous step by xcode.

Configure git with your information:

```shell
git config --global user.name "user name"
git config --global user.email "email@example.com"
git config --global credential.helper osxkeychain
```

You can check if these were properly configure by viewing the file `.gitconfig` in your home directory:

```shell
cat ~/.gitconfig
```

### brew

[Homebrew][4] is a package manager for macOS (and Linux now I believe) that enables installing third-party software from the command line. Homebrew installs packages to their own directory and then symlinks their files into `/opt/homebrew`.

The backend is `git` and Ruby code.

They provide an installation bash script on GitHub that you can use to install homebrew on your system.

`https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh`

For example to download and execute this script:

```shell
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

One other method is to use an installation package included with the GitHub [release artifacts][5]

Once brew is installed, you need to ensure it is included in the shell $PATH. Here is an example of how to add it when using zshell:

```shell
(echo; echo 'eval "$(/opt/homebrew/bin/brew shellenv)"') >> ~/.zprofile
```

At this point you want to close the terminal or source the .zprofile:

```shell
source ~/.zprofile
```

Now you should be able to use the `brew` command on your system:

```shell
brew update
```

### Python setup

> If you have no interest in Python development you can probably skip this. That said, there are plenty of tools written in Python that will install it if you are using Homebrew (`brew install`).

To work with Python, I recommend installing the latest version of Python3 and setting up `pipx` and Python virtual environments for projects. The tool `uv` (installable via brew) helps with this.

First install the latest version: `brew install python3`

Now you should be able to run `python3 --version`. To create a new virtual environment for a project: `python3 -m venv my-venv`



#### pipx

Next I recommend `brew install pipx`

From here you can install Python packages using `pipx install package-name` and it will set up a virtual environment for that package and add to your local system.

### JavaScript setup

> If you have no interest in JavaScript or TypeScript development you can probably skip this.

To develop with Javascript or Typescript, I recommend using nodejs and / or bun to manage your environments.

#### NodeJS setup

To setup NodeJS, you can install the latest version with homebrew: `brew install node`. This will install `node` and `npm` onto your system. You can install nodejs packages like this:

```shell
npm install -g package-name
```

#### bun setup

There is an alternative to node which is called bun. It is an all-in-one dev toolkit that includes a JavaScript runtime (like node), a package manager (like npm), a test runner (like jest), and a bundler that lets you package your code into a single executable.

To install bun with homebrew:

```shell
brew install oven-sh/bun/bun
```

Check it worked: `bun --version`

You can create a new project: `bun init new-app`

It will prompt you to create a project based on a template. If you select `Blank` it will create a simple project with an `index.ts` that simply logs a message.

Run your project with bun: `bun run index.ts`

You should see console output `Hello via Bun` or similar.

If you want to add a dependency to your project: `bun add new-package` and it will be added to the package lock.

---

### zshell setup

On macOS, the default shell is `zsh` and there are some great community utilities out there. If you want to add plugins to zsh, I recommend a tool like Antidote that creates a static bundle of your plugins and supports deferred loading of certain plugins to reduce startup time. You can install with: `brew install antidote`

Create a plugin list in your home directory: `touch ~/.zsh_plugins.txt` (Antidote builds a static bundle from it).

These are the plugins I use for a prompt theme, syntax highlighting, auto completions, and suggestions from your history:

```txt
# Prompt
romkatv/powerlevel10k

# Completions (must be available before compinit)
zsh-users/zsh-completions

# UX
zsh-users/zsh-autosuggestions kind:defer
zdharma-continuum/fast-syntax-highlighting kind:defer
```

Create or update the file `.zshrc` in your home directory:

```zsh
# ---- p10k instant prompt (keep at top) ----
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# ---- Antidote (fast plugin loading) ----
source $HOMEBREW_PREFIX/opt/antidote/share/antidote/antidote.zsh  # brew caveat
# Generate/refresh static bundle (fast path on subsequent shells)
antidote load ${ZDOTDIR:-~}/.zsh_plugins.txt

# ---- Completion system (do this early) ----
autoload -Uz compinit
# If you care about absolute fastest startup, you can add -C to use a cached compdump.
compinit -u

# p10k config
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh
```

Now when you open a new shell, antidote will clone the plugins you specify in `~/.zsh_plugins.txt`. If you have not previously configured powerlevel10k it will prompt you to set it up now.

After setup, your shell should open fast and come with syntax highlighting and suggestions from your history.


### CLI tools

There are some tools I recommend to use in the shell:

#### ripgrep

`rg` or ripgrep is a searching tool similar to grep if you have used coreutils.

You can install with brew:

```shell
brew install ripgrep
```

Once installed, I can recursively search for the following string `foo` and ignore the case of the word. This would return a match for `foo`, `FOO`, or `Foo`, and any other combination.

```shell
rg -i foo
```

#### bat

`bat` is the same as coreutil `cat` with syntax highlighting and Git integration. Install with brew: `brew install bat`

Now use the command to output the contents of a file with syntax highlighting if it is a source code file.

```shell
bat foo.js
```

#### fzf

This is a command line Fuzzy find utility. It is written in golang.

You can install with brew:

```shell
brew install fzf
```

After you install you want to install the shell integrations:

```shell
$(brew --prefix)/opt/fzf/install
```

Once loaded into your environment, you can use it to help find files and directories by entering `**` and TAB on the command line. Pressing CTRL + R will also bring up fuzzy search results for your command history. It can also be fed into other commands when you need to locate a file or directory on your system without having to open another shell session.

#### atuin

Database of shell history. Useful for morons like me who don't save useful commands to notes! 

```bash
brew install atuin
```

For zshell, install the shell integrations:

```shell
echo 'eval "$(atuin init zsh)"' >> ~/.zshrc
```

Similar to `fzf`, you rebind CTRL + R and UP arrow (configurable) to a full screen history search menu in the terminal.

#### chezmoi

Manage dotfiles with git securely across multiple machines. Dotfiles would be like the ~/.zshrc or ~/.zprofile or ~/.ssh/config files on your system that configure zshell and ssh respectively.

```bash
brew install chezmoi
```

chezmoi stores the desired state of your dotfiles in the directory `~/.local/share/chezmoi`. When you run `chezmoi apply`, chezmoi calculates the desired contents for each of your dotfiles and then makes the minimum changes required to make your dotfiles match your desired state.

##### setup

```shell
chezmoi init
```

This will create a new git local repository in `~/.local/share/chezmoi` where chezmoi will store its source state. By default, chezmoi only modifies files in the working copy. From here you can add a file that is already on your system:

```shell
chezmoi add ~/.zshrc
```

Now you should make changes to that file in the chezmoi directory and do NOT directly edit `~/.zshrc` any longer.  All chezmoi commands accept the `-v` (verbose) flag to print out exactly what changes they will make to the file system, and the `-n` (dry run) flag to not make any actual changes. The combination `-n -v` is very useful if you want to see exactly what changes would be made.

```shell
chezmoi -n -v apply
```

This will output a dry run of any edits needed to files managed by chezmoi. From here you can commit changes to the git repo created by chezmoi and add your own remote origin URL to use your own git repo which could be one you set up or a provider such as GitHub.

You can use it on a second machine by giving the `init` command your repo URL.

```shell
chezmoi init https://github.com/$GITHUB_USERNAME/example_repo.git
```

#### dust

Terminal utility that summarizes of file sizes. This can be used to estimate the disk usage of a directory on your system with a visual aid added to the terminal output. Install with: `brew install dust`

Then you can run `dust` to summarize the current directory.

#### eza

list files with fancy output. Fancy `ls`

```bash
brew install eza
```

It has the same options as ls so you can set alias commands such as `alias lha='eza -laH'` in your shell profile.

#### jq and yq

The tools `jq` and `yq` are used for processing JSON and YAML data respectively. They are similar to the tool `sed` but more structured. You can install with brew.

For example, if you have a JSON document with user information. You can extract something like a `firstName` field by piping to `jq`: 

```shell
cat users.json | jq '.firstName'
```

similar syntax for `yq`:

```shell
cat users.yaml | yq '.firstName'
```

### Terminal emulators

The built in terminal application works but there are some other terminal emulators available to use. The reason to use another terminal may be if you find yourself opening many terminal sessions, the following apps help manage sessions through tabs, keyboard shortcuts, and multiplexing to show multiple terminal sessions in the same window/tab of your terminal.

#### ghostty

ghostty is an open-source terminal emulator written in Zig. It has some native macOS features as it has SwiftUI components. There are a lot of nice features that don't require pouring through configs.

You can install with brew:

```shell
brew install ghostty
```

#### iterm2

iterm2 is an open-source terminal emulator for macOS. If you are into a lot of AI tools, it now supports direct integration with openAI. I no longer use this one.

You can install with brew:

```shell
brew install iterm2
```

Now you can quit the mac terminal app and enter terminal commands in iterm2 app.

#### kitty

Kitty is a GPU-based terminal emulator. This terminal is also available on Linux systems. I used to use this a lot but ghostty does everything I need.

```shell
brew install kitty
```

Now you can open the kitty app and enter terminal commands in kitty app.

### text editors

#### vim

Vi 'workalike' with [many additional features][7]. This is a text editor that works in a shell/terminal.

Check out how to set that up in [a post I made][8] along with other vim extensions.

#### neovim

If you like vim but also want to get your hands dirty integrating and writing advanced plugin ecosystem, check out [neovim][9].

You can install with brew.

```shell
brew install neovim
```

You can open with `nvim`

Customizations can be written in Lua. There are neovim "distributions" like LazyVim and NvChad that have pre-installed addons to neovim. I have ambitions to configure it myself and only add what I need similar to my zsh customizations.

### GUI editors

These are graphical apps that often include their own terminal emulators and plugins to be full IDE or Integrated Developer Environment.

#### BBEdit

This is a mac editor. It has a free mode but suggests you pay for a license to unlock additional features. If you use it for work, you should probably pay for it.

```shell
brew install bbedit
```

#### sublime text

This is shareware text editor that has installation packages for Windows, Linux distros and macOS. It natively supports popular programming languages and markup languages. Users can customize with themes and plugins with a python API.

You can install with brew.

```shell
brew install sublime-text sublime-merge
```

If you end up using these apps to make money creating your own app, please give the developers some money for their hard work.

#### vscode (and forks like Cursor)

This is shareware text editor that has installation packages for Windows, Linux distros and macOS. It natively supports popular programming languages and markup languages. Users can customize with themes and plugins with a JavaScript API. You can contribute to an open source repo but the distributed application is compiled by Microsoft with some closed off features.

You can install with brew.

```shell
brew install visual-studio-code
```

The main reason I always come back to this one is the extension marketplace. Here are some recommended extensions:

- Auto Rename Tag (update closing tag in html and xml tags)
- Code Runner (this helps vscode act a proper ide to run/debug your code)
- eslint (if you write JavaScript)
- Prettier (code formatting)
- Code Spell Checker (spell check various spoken languages)
- Error Lens (this helps vscode act a proper ide and highlight errors in the editor)
- Live Server (built in dev web server)
- Material Icon Theme
- gitlens (more integration with git. you can see who authored the current line in the editor)
- Git Graph (provides a visualization of the git history in your project)
- Dev Containers (lets you use a Docker container as a development environment instead of your local filesystem)
- Remote - SSH (open code on another server using SSH)
- Catppuccin for VSCode (this is a theme. you may or may not like it)
- Claude Code (If you use the agentic AI tool claude code, the extension allows you to work more in the IDE instead of just a terminal window.)

I also install Language support vscode extensions:
- Python
- YAML
- Go
- Markdown All In One
- XML

#### Zed

This is a nice editor if you are on macos as it supports high refresh rate, vim mode, and plugins similar to vscode. It feels faster than vscode.

```shell
brew install zed
```

---

## General apps

General apps I recommend on macOS that you can install with brew. If I don't include a command, assume it is just `brew install name` (ex `brew install btop`). If the package is not one word, I will include the appropriate command.

### Browsers

- **Google Chrome**: if you are developing in JavaScript and NodeJS, likely you want to use a browser with the Chromium engine. The Chromium browser is also available which only includes open source components. Install: `brew install google-chrome`
- **Mozilla Firefox**: I have used this browser since 2006 and to this day it is the only real competition with Chrome/Chromium-based. I don't think it runs very well on mac.
- **Zen**: This is based on Firefox and will have similar performance. I still like it because of the distraction free vertical tab management.
- **Librewolf**: this is a fork of Firefox that does not include any telemetry. The developers do not want to pay Apple for a developer license (I get that, what happened to supporting open source?). Unfortunately, Homebrew has decided to drop librewolf because of this.

### AI tools

- **LM Studio** is an app for running LLM (Large Language) models on your system. Install: `brew install lm-studio`
- **claude code** is an agentic coding tool for Anthropic models (Like Claude Sonnet and Opus) in the terminal with integration into IDEs like Zed and a vscode extension. Install: `brew install claude-code`
- **codex** is an agentic coding tool for OpenAI models in the terminal. Install: `brew install codex`
- **opencode** is an open source agentic coding tool that supports the most models including using a local model on your system. Install: `brew install opencode`
- **gemini-cli** is an open source agentic coding tool from Google that supports their models like Gemini Pro. Install: `brew install gemini-cli`
- **cursor** is a fork of visual studio code that was one of the first agentic coding tools. Install: `brew install cursor`
- 

### Misc

Unless otherwise noted, you can install these with `brew install`.

- **Stats** to show system data in the menu bar
- **Syncthing** is an open source file-syncing app. I use it to keep a scratch directory in sync with other systems such as a Linux Desktop. It is worth noting I do not use this on my work laptop.
- **Obsidian** is a shareware/paid app for taking notes and staying organized. Knowledge base that works on top of a local folder of plain text Markdown files.
- **DatWeatherDoe** is a macOS app that shows weather in the menu bar. I have followed this one for years and I am happy to see it continue to evolve.
- **Cyberduck** is an interface for SFTP or other remote file systems.
- **dbeaver** is a java application for connecting to a database such as sqlite or postgresql to execute queries and view schemas.
- **handbrake** is an app for transcoding media files. It probably uses the command line utility `ffmpeg` under the hood.
- **Insomnia** is a REST API client and useful for testing APIs similar to the popular tool Postman.
- **Upscayl** is an image upscaling tool.
- **GIMP** is an image editor an alternative to tools like photoshop with a terrible name and mediocre (but free!) performance. (GNU Image Manipulation Program)
- **Rectangle** is one of my favorite apps, it adds shortcuts for arranging windows on your desktop. For example I can snap the current window to the left half of the screen with CTRL + OPT + LEFT or the first 2/3 of the screen with CTRL + OPT + E
- **Pearcleaner** helps uninstall other apps and cleanup files that may be left behind.

## Monitoring with Prometheus

In a previous post I ran a prometheus server on a mac. If you have a prometheus server elsewhere, you can set up `node_exporter` to collect system metrics for a mac.

You can install `node_exporter` by downloading from GitHub or using homebrew:

```shell
brew install node_exporter
```

Homebrew is easiest because you can then run this command to run `node_exporter` now and when you log in again:

```shell
brew services start node_exporter
```

Prometheus should now be able to scrape metrics from port `:9100` on your mac.

### Grafana Alloy

You can also install Grafana Alloy to collect metrics and the logs on your Mac. I have [some previous posts about Alloy][10] but I have not made a comprehensive post for monitoring macOS with Alloy yet. I plan to look into that soon after this post.

---

## Docker and Containers

Containers let you run software in a sandbox along with all the required dependencies. They are also great for packaging software that you write. If you are not familiar with containers, check out [a previous post][11] for an introduction.

At the time of this post, I recommend installing docker in a lightweight vm using a tool called Colima. Check out [my post on colima specifically][12] to install and get started on your machine.

Install with: `brew install colima`

Once installed, I recommend starting with a flag to use Google's DNS server:

```shell
colima start --dns 8.8.8.8
```

Once started you can use the `docker` command to create containers:

```shell
docker run --rm -d nginx
```

> The alternative is to install the official Docker Desktop app: `brew install docker-desktop`

## My package install script

On my GitHub I have a script that installs my favorite packages. It may change based on what is in this post. [See GitHub][13] for my latest script.

# Links

Here are some resources for Developing on macOS:

- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [MacOS keyboard shortcuts](https://support.apple.com/en-us/102650)
- [MacOS developer tips](https://www.xda-developers.com/macos-tips-and-tricks/)


 [1]: https://apps.apple.com/us/app/xcode/id497799835?mt=12
 [2]: https://www.git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F
 [3]: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
 [4]: https://brew.sh
 [5]: https://github.com/Homebrew/brew/releases/latest
 [6]: /posts/zshell/
 [7]: https://www.vim.org/
 [8]: /posts/vim/
 [9]: https://neovim.io
 [10]: /tags/alloy/
 [11]: /posts/containers/
 [12]: /posts/colima/
 [13]: https://github.com/acaylor/linux_setup/blob/master/mac-packages.sh
