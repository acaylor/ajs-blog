---
title: ZShell
author: aj
date: 2021-12-19
categories:
  - Linux
tags:
  - zsh
  - linux
  - shell
---

## What is a shell?

The [shell][1] is a program that translates human readable words (commands) and converts them into binary data that the Operating System [kernel][2] can interpret. The shell can interpret commands entered from the keyboard or a file commonly refered to as a script.

You can access the shell through a [terminal][3] program on the local computer or remotely using [SSH][4].

The most popular shells that I am aware of are:

- [Bash][5]
- [Csh][6]
- [Ksh][7]
- [Tcsh][8]
- Zsh

## ZSH

Zsh is a shell that builds on shells such as bash, ksh, and tcsh. Zsh offers some useful features such as better tab completion.

### Installing Zsh

#### Windows

On Windows, you would need Cygwin or the newer Windows Subsystem for Linux.
Check out [a previous post][9] for setting up Cygwin.

#### macOS

```bash
# MacPorts
sudo port install zsh
# homebrew
brew install zsh
```

#### Linux

On Red Hat family:
```bash
sudo dnf install zsh
```
On Debian family:
```bash
sudo apt-get install zsh
```
On SUSE family:
```bash
sudo zypper install zsh
```

#### Change default shell

Once you have installed zsh, you need to configure it as your default shell.

```bash
chsh -s /bin/zsh
```
## Examples

### CD shorthand

```zsh
% repos
% pwd
/home/user/repos
```

In the example above, simply typing the name of a directory into the prompt will take you to that directory in the shell. On other shells such as bash, this would return an error.

### Tab completion

```zsh
ls
dir1 dir2 foo bar
```

Zsh improves tab completion. Try typing `ls` and tab twice. Zsh will display the files and directories that you can interact with and navigate through with arrow keys. It also works with `cd` and `mk`.

### Directory shorthand

```zsh
ls /f/b/ar
```

Try entering only a few characters to the paths to a directory you wish to navigate to. Zsh will expand these fuzzy directories and let you navigate with less typing.

## Recommended addons

Out of the box, Zsh has a lot to offer and there are a few additions that make it even better. 

### Oh my zsh

[Oh my Zsh][10] is an open-source framework of Zsh plugins and themes.

```sh
sh -c "$(wget https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh -O -)"
```
or if you do not have the `wget` package:
```sh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

Once you install zsh, your zsh config file `~/.zshrc` will be modified. This framework makes it easier to integrate the following plugins.

#### Powerlevel10k theme

[Powerlevel10k][11] is a theme for zsh that can be easily selected when you have Oh my zsh.

```zsh
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
sed -i 's/_THEME=\"robbyrussell\"/_THEME=\"powerlevel10k\/powerlevel10k\"/g' ~/.zshrc
source ~/.zshrc
```

Now you should see the powerlevel10k config wizard:

```
   This is Powerlevel10k configuration wizard. You are seeing it because you
 haven't defined any Powerlevel10k configuration options. It will ask you a few
                      questions and configure your prompt.

                Does this look like a diamond (rotated square)?
                  reference: https://graphemica.com/%E2%97%86

                                 --->    <---

(y)  Yes.

(n)  No.

(q)  Quit and do nothing.

Choice [ynq]:
```
### Plugins

#### Zsh syntax highlighting

[A plugin][12] that easily can be installed when you have Oh my zsh that will highlight syntax that is typed into the terminal.

```zsh
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

#### Zsh auto suggestions

[A plugin][13] that easily can be installed when you have Oh my zsh that will suggest a completed command based on reference from your history.

```zsh
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```

#### Activate plugins

Update your `~/.zshrc` file in the "plugins" section:

```zshrc
plugins=(git zsh-syntax-highlighting zsh-autosuggestions)
```

Activate the plugins:

```zsh
source ~/.zshrc
```

Now, when you begin typing, you should see suggestions based on your command history. Valid commands will be green and invalid commands will be red.

![zsh_plugins](/images/zsh_plugins.png)


 [1]: https://bash.cyberciti.biz/guide/What_is_Linux_Shell
 [2]: https://www.redhat.com/en/topics/linux/what-is-the-linux-kernel
 [3]: https://en.wikipedia.org/wiki/Terminal_emulator
 [4]: https://www.ssh.com/academy/ssh
 [5]: https://www.gnu.org/software/bash/
 [6]: https://en.wikipedia.org/wiki/C_Shell
 [7]: https://www.computerhope.com/unix/uksh.htm
 [8]: https://en.wikipedia.org/wiki/Tcsh
 [9]: /posts/cygwin-windows-terminal/
 [10]: https://ohmyz.sh/
 [11]: https://github.com/romkatv/powerlevel10k
 [12]: https://github.com/zsh-users/zsh-syntax-highlighting
 [13]: https://github.com/zsh-users/zsh-autosuggestions
