---
title: macOS setup late 2024
author: aj
date: 2024-12-22

categories:
  - macOS
tags:
  - macos
  - tools
  - macOS setup
---

I picked up a mac mini with the m4 CPU, 24 GB shared memory, and 512 GB of storage. Even with solar power, especially in the winter, my lab is using too much power. My new goal is to use less power than my plant grow lights. Fortunately, I can measure all of that power usage now and store it in prometheus to query. I run two NAS systems 24/7 and one of them is off the shelf from Synology and it uses between 15-30 watt hours. My "backup" NAS which is a backup but also stores my "warm" backup archives uses between 50 and 75 watt hours. This adds up. The mac mini provides 10 CPU cores that use less power than the AMD 64 bit CPUs in my other systems. The mac mini is using less than 10 watt hours with several services running in memory including Home Assistant. The mac mini will likely replace my "AI Server" which is an old gaming PC. That system uses over 500 watts when the GPU is active which drives up power usage for the whole house. That system also runs containers which I am migrating to the mac mini.

## setup

Now to the actual topic of this post.

When you get a new macOS device, you must follow the setup wizard provided by Apple. If you have multiple Apple devices, you may consider enabling iCloud. I *think* you can still use a mac without and Apple ID.

Regardless of if you have an Apple ID, I recommend first updating to the latest version of macOS in the _System Settings_ app.

One of the nice features of macOS is you have a shell similar to `bash` already present on the system, `zsh`.

To access the shell and the command line on macOS, open the terminal application. I find the easiest way to open applications is with the built in spotlight search: CMD + SPACE will open the spotlight search and then search for "terminal" and press enter when you see the terminal application.

## Development setup

I have a few recommendations for macOS apps that everyone can use but I am starting with development tools because one of the tools I recommend (brew.sh) is used to install all kinds of third-party software from the command line. I assume the audience of my ramblings are folks interested in technology and software development.

You can also install software for macOS on the Apple App Store and from other places such as GitHub if a developer provides a macOS application that you can install on your system.

### xcode

The first thing I will install is `xcode` which is available on the Apple [App Store][1] to download.

The app should also install the xcode command line tools (bsd tools as opposed to gnu tools you might find on a linux system) but you can specifically install those with this command on the macOS terminal:

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

### git

In order to work with [git][2] repositories, the `git` program needs to be configured with your username and email.

First you need to [install git][3]

Configure git:

```shell
git config --global user.name "user name"
git config --global user.email "email@example.com"
git config --global credential.helper osxkeychain
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

Now you should be able to use the `brew` command on your system.

### zshell setup

On macOS, the default shell is `zsh` and there are some great community utilities out there called `Oh my zsh`. Check out how to set that up in [a post I made][6] along with other zshell tips.

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

`bat` is the same as coreutil `cat` with syntax highlighting and Git integration.

You can install with brew:

```shell
brew install bat
```

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

Terminal utility that summarizes of file sizes. This can be used to estimate the disk usage of a directory on your system with a visual aid added to the terminal output.

```bash
brew install dust
```

Then you can run `dust` to summarize the current directory.

#### eza

list files with fancy output. Fancy `ls`

```bash
brew install eza
```

It has the same options as ls so you can set alias commands such as `alias lha='eza -laH'` in your shell profile.

### Terminal emulators

The built in terminal application works but there are some other terminal emulators available to use. The reason to use another terminal may be if you find yourself opening many terminal sessions, the following apps help manage sessions through tabs, keyboard shortcuts, and multiplexing to show multiple terminal sessions in the same window/tab of your terminal.

#### iterm2

iterm2 is an open-source terminal emulator for macOS. If you are into a lot of AI tools, it now supports direct integration with openAI.

You can install with brew:

```shell
brew install --cask iterm2
```

Now you can quit the mac terminal app and enter terminal commands in iterm2 app.

#### kitty

Kitty is a GPU-based terminal emulator. This terminal is also available on Linux systems.

```shell
brew install --cask kitty
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

Customizations can be written in Lua.

### GUI editors

These are graphical apps that often include their own terminal emulators and plugins to be full IDE or Integrated Developer Environment.

#### BBEdit

This is a mac editor. It has a free mode but suggests you pay for a license to unlock additional features.

```shell
brew install --cask bbedit
```

#### sublime text

This is shareware text editor that has installation packages for Windows, Linux distros and macOS. It natively supports popular programming languages and markup languages. Users can customize with themes and plugins with a python API.

You can install with brew.

```shell
brew install --cask sublime-text sublime-merge
```

If you end up using these apps to make money creating your own app, please give the developers some money for their hard work.

#### vscode

This is shareware text editor that has installation packages for Windows, Linux distros and macOS. It natively supports popular programming languages and markup languages. Users can customize with themes and plugins with a JavaScript API. You can contribute to an open source repo but the distributed application is compiled by Microsoft with some closed off features.

You can install with brew.

```shell
brew install --cask visual-studio-code
```

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

#### Zed

This is a nice editor if you are on macos as it supports high refresh rate, vim mode, and plugins similar to vscode. It feels faster than vscode.

```shell
brew install zed
```

---

## General apps

General apps I recommend on macOS that you can install with brew:

### Browsers

- Google Chrome: if you are developing in JavaScript and NodeJS, likely you want to use a browser with the Chromium engine. The Chromium browser is also available which only includes open source components.
- Mozilla Firefox: I have used this browser since 2006 and to this day it is the only real competition with Chrome/Chromium-based. I don't think it runs very well on mac.
- Librewolf: this is a fork of Firefox that does not include any telemetry.


### Misc

- Stats.app to show system data in the menu bar: `brew install stats`
- Syncthing is an open source file-syncing app. I use it to keep a scratch directory in sync with other systems such as a Linux Desktop.
- Obsidian is a shareware/paid app for taking notes and staying organized. Knowledge base that works on top of a local folder of plain text Markdown files.
- DatWeatherDoe is a macOS app that shows weather in the menu bar. I have followed this one for years and I am happy to see it continue to evolve.
- Cyberduck is an interface for SFTP or other remote file systems.
- dbeaver is a java application for connecting to a database such as sqlite or postgresql to execute queries and view schemas.
- handbrake is an app for transcoding media files. It probably uses the command line utility `ffmpeg` under the hood.
- Insomnia is a REST API client and useful for testing APIs similar to the popular tool Postman.
- Msty is an app for running LLM (local ai) models on your system.
- Upscayl is an image upscaling tool.
- Seashore is an image editor an alternative to tools like photoshop.
- Rectangle is one of my favorite apps, it adds shortcuts for arranging windows on your desktop. For example I can snap the current window to the left half of the screen with CTRL + OPT + LEFT or the first 2/3 of the screen with CTRL + OPT + E

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

---

# Links

- [my package install script](https://github.com/acaylor/linux_setup/mac-packages.sh)
- [A previous post to install docker and colima](/posts/colima/)
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