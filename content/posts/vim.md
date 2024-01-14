---
title: Vim the ultimate text editor
author: aj
date: 2023-09-08
updated: 2024-01-14
categories:
  - Utilities 
tags:
  - vim
---

My preferred text editor is `vim` because it is portable and highly customizable. Text editors can be used to edit configuration files on a system and write source files for scripts and programs. While you can run vim in a separate window in your operating system, it can also be run within a terminal emulator. You can even find the original version `vi` on most *nix systems that do not have any graphical interface. Learning vim will help make debugging systems that only have a terminal easier.

## Installation

You need to install `vim` on your system first. You can install vim on any operating system.

For example on Debian Linux based distributions including Ubuntu:

```sh
sudo apt-get install vim
`````

On RedHat based Linux distributions including RHEL, CentOS, and Fedora:

```sh
sudo dnf install vim
```
And on macOS I recommend using [homebrew][1] to install software.

```sh
brew install vim
`````

On windows systems I recommend using [Chocolatey][2] to install software including vim.

```powershell
choco install vim
```

When using Chocolately, your system will also have gvim installed which allows you to run vim like any other app. On Linux and macOS you may need to install `gvim` separately.

## Configurations

After installing vim, I install and open source vimrc files that includes a bunch of plugins. Vim is highly configurable and this is just scratching the surface. By default you can configure vim by customizing a `.vimrc` file in your home directory.

### Plugins for vim

#### Prerequisites

In order to install the vim plugins that I use you will need the `git` utility on your system.

https://git-scm.com/book/en/v2/Getting-Started-Installing-Git

Note this is entirely optional and if you are just getting started, I recommend NOT installing plugins until you are familiar with the basics.

```bash
# Clone the Ultimate vimrc project into your home directory
git clone --depth=1 https://github.com/amix/vimrc.git ~/.vim_runtime

sh ~/.vim_runtime/install_awesome_vimrc.sh # install the vimrc
```

Vim plugins go into `~/.vim_runtime/my_plugins/`

```bash
cd ~/.vim_runtime

# Terraform plugin
git clone https://github.com/hashivim/vim-terraform.git ~/.vim_runtime/my_plugins/vim-terraform

# My prefered color theme
git clone https://github.com/NLKNguyen/papercolor-theme.git ~/.vim_runtime/my_plugins/papercolor-theme
```

#### Customizing vim further

If you install the awesome_vimrc, custom configs no longer go into the file `~/.vimrc`

To add your own configurations to vim when using awesome vimrc, create a new file `~/.vim_runtime/my_configs.vim`

My customizations include showing line numbers, applying the downloaded color theme, and enabling transparency if the terminal supports it.

```vim
set number

let g:PaperColor_Theme_Options = {
\ 'theme': {
\   'default.dark': {
    \  'transparent_background': 1
    \ }
  \ }
\ }

colorscheme PaperColor
```

#### Upgrading plugins

Here is an example script to update the plugins:

```bash
# Upgrade vimrc
cd ~/.vim_runtime
git reset --hard
git clean -d --force
git pull --rebase
python update_plugins.py  # use python3 if python is unavailable
```

## Next steps

### Vim basics

The vim editor can be opened with the command `vim` in the terminal. You can specify an existing file as the first argument or vim will create that file if you write the changes.

`vim` will open with no current open file.

`vim file.foo` will either open file `file.foo` or create it if you write the changes.

When you first open vim it will be in `Normal` mode. In this mode there are a lot of keyboard shortcuts to navigate the file, search for text, and manipulate text. This is NOT the mode where typing will enter text into the file.

In order to start typing into the open file you want to enter `Insert` mode by pressing the <key>i</key>.

Another mode is `Visual` mode by pressing <key>v</key> from `Normal` mode where you can select blocks of text to edit or delete.

In order to exit `vim`, press <key>Escape</key> and then `:` to enter a command. The command to quit is <key>q</key> and if you have a file open and want to save the changes, enter `:wq` to write changes and quit.

#### Commands

Here is an overview of the basic commands to remember. For commands, make sure to start with a `:` and then press Enter/Return to execute your command.

- `:w` write changes to file (add a filename to save a new file `:w newfile.txt`)
- `:q` quit
- `:q!` If you have edited the file you need to enter this to quit without saving changes
- `:help` will bring up the help menu

When in `Normal` mode, here are some useful shortcuts:

Basic navigation with arrow keys or `jk` for down/up and `hl` for left/right

- `0` will move the cursor to the beginning of the line
- `$` will move the cursor to the end of the line
- `a` will switch to insert mode and move the cursor one character to the right
- `b` will move the cursor to the beginning of the previous word
- `w` will move the cursor to the beginning of the next word
- `o` will create a new line after the current line and move the cursor there
- `d` can be used to delete things. (`dw` to delete next word, `d$` will delete to the end of the current line, or use `Visual` mode to select text and then `d` to delete the selected text)
- `dd` will delete an entire line where the cursor is
- `gg` will move the cursor to the beginning of the file
- `G` will move the cursor to the end of the file
- `yy` will copy the current line which you can paste elsewhere with
- `p` will paste the vim clipboard (not to be confused with the system clipboard)
- `r` can be used to replace a single character (move the cursor under the character. Press `r` followed by the character you want to replace)
- `x` will delete the character under the cursor

For `r`, let's say the file has the word `vin` that is supposed to be `vim`. You can fix this in `Normal` mode by moving the cursor to `n` and then press `rm` to replace the `n` with a `m`. 

 [1]: https://brew.sh
 [2]: https://docs.chocolatey.org/en-us/choco/setup
