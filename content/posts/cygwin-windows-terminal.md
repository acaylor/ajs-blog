---
title: Cygwin + Windows Terminal
author: aj
date: 2021-07-17
updated: 2024-01-14
image: /images/image-1.png
categories:
  - Windows
tags:
  - chocolatey
  - cygwin
  - windows terminal
  - windows
---
 

Cygwin is a collection of open source tools that are commonly found on [GNU/Linux][1] systems but not found on Windows systems. It includes a [library][2] for x86_64 Windows systems that provides some [POSIX][3] API functionality.

### Installing Cygwin

If you set up Windows 10 per [my previous post][6], you already have this utility installed. If not, I recommend using [Chocolatey][4] to install and maintain this software.

```powershell
choco install cygwin
```

If you install Cygwin via chocolatey, the binary will be located in:

`C:\ProgramData\chocolatey\bin\Cygwin.exe`

## Add Cygwin to Windows Terminal

In my [aforementioned post][6], I installed the [Windows Terminal][5] via Chocolatey also. I highly recommend using this as your terminal on Windows 10 systems. It is GPU accelerated and supports adding multiple &#8220;tabs&#8221; making terminals easier to organize. This terminal is included on Windows 11 Systems.

### Windows Terminal config

Open the terminal and access the settings by pressing [ Ctrl ] + [ , ]

On the left-hand bar of the terminal, navigate to the + icon to create a new Profile. Alternatively, press the Gear at the bottom of the left-hand bar and that will open the settings JSON file. I have the example profile in JSON in the next section.

![image](/images/image.png)

Name the profile `Cygwin` or whatever you prefer and enter the location of the Cygwin binary as the Command line. You can adjust the appearance in the next tab.

![image1](/images/image-1.png)

#### Windows Terminal JSON config profile

```json
{
     "colorScheme": "Vintage",
     "commandline": "C:\\ProgramData\\chocolatey\\bin\\Cygwin.exe",
     "cursorShape": "emptyBox",
     "experimental.retroTerminalEffect": true,
     "name": "Cygwin"
}
```

The important settings here are &#8220;name&#8221; and &#8220;commandline&#8221;, the rest is a silly theme that makes the terminal look like it is on a CRT monitor.

## Opening the new profile

Press the + on the top bar and select &#8220;Cygwin&#8221; to open your new profile.

![cygwin](/images/cygwin_tab-1.png)

This will open a new terminal tab with the Cygwin bash shell. Entering the command `help` will display information about the shell.

```bash
$ help
GNU bash, version 4.4.12(3)-release (x86_64-unknown-cygwin)
These shell commands are defined internally.  Type `help' to see this list.
Type `help name' to find out more about the function `name'.
Use `info bash' to find out more about the shell in general.
Use `man -k' or `info' to find out more about commands not in this list.

A star (*) next to a name means that the command is disabled.
```

### Notable commands and directories

When using Cygwin, you can use `bash` utilities for browsing files on your computer.

- `clear` : will clear the output in the terminal window.
- `ls` : list directory contents
  - `ls -a` : option added to show hidden files (files that start with ".")
- `pwd` : display the current directory path in the file system.
- `man [command]` : open the manual page for specified command in the current terminal window.

#### Windows drive letters

Windows will assign drive letters to partitions. In Cygwin, these are mounted as `/cygdrive/N`. For example, if you are looking for folder `D:\videos` in Cygwin it would be under `/cygdrive/d/videos`

### Cygwin User guide

https://cygwin.com/cygwin-ug-net.html


 [1]: https://www.getgnulinux.org/en/linux/
 [2]: https://docs.microsoft.com/en-us/troubleshoot/windows-client/deployment/dynamic-link-library
 [3]: https://en.wikipedia.org/wiki/POSIX
 [4]: https://chocolatey.org/install
 [5]: https://github.com/microsoft/terminal
 [6]: /posts/setting-up-windows/