---
title: Vagrant Installation/Demo
author: aj
date: 2021-08-10
image: /images/vagrant.png
categories:
  - Virtual Machines
tags:
  - vagrant
  - virtual machine
  - virtualbox
  - linux
---
 

[Vagrant][1] is a software from HashiCorp that provides easy to configure and replicate virtual machine images. Vagrant integrates with existing hypervisor software to quickly deploy VM templates from the Vagrant community or templates that you create.

![vagrant_logo](/images/vagrant.png)

## Installation

### Prerequisites

In order to proceed, you need a hypervisor software such as VirtualBox. I have [a previous post][2] regarding virtual machines and setting up VirtualBox.

#### Windows 10

I will be installing vagrant with Chocolatey. Check out [my post on setting up Windows][3] for info on how to get started with Chocolatey.

`choco install vagrant`

As you can see, with chocolatey the installation is trivial on Windows.

#### macOS

On macOS, I use [homebrew][4] to install and update software. I can install vagrant with one command:

`brew cask install vagrant`

#### Linux

The publishers of Vagrant have repositories to integrate into various distributions' package managers. See the official site for Instructions for your distribution: https://www.vagrantup.com/downloads

#### Verify the installation

After installing vagrant, verify that you can proceed by opening a new terminal. Use `PowerShell` or `/bin/bash` for example and type:

`vagrant`

If the installation worked, you should see the following or similar:

```
Usage: vagrant [options] <command> [<args>]

    -v, --version                    Print the version and exit.
    -h, --help                       Print this help.
```

## Getting started with Vagrant

Vagrant is a command line utility so to get started, open a new terminal. Open `PowerShell` for Windows 10 and `bash` most likely for Linux & macOS. The following commands will make create files in the current directory so create a workspace directory if desired.

```bash
# Create a vagrant template to start an Ubuntu VM 
vagrant init ubuntu/focal64
# Start the virtual machine
vagrant up
# log into a terminal within the virtual machine
vagrant ssh
# From inside the virtual machine shell, you can exit with
logout
# If you are done with this vm, remove it with
vagrant destroy
```

If you use the same vagrantfile that is created with `vagrant init` you can create a new VM with the same template by running `vagrant up` again. This file will contain some default values and you can modify this file to customize the vm template configuration.

### Cleaning up

If you would like to clean up the files downloaded by vagrant, run the following command to delete the box template.

```
vagrant box remove ubuntu/focal64
```

### Next steps

There are many more templates online that you can use with vagrant, check out the official website to search for templates that are compatible with Vagrant & VirtualBox: https://app.vagrantup.com/boxes/search?provider=virtualbox

 [1]: https://www.vagrantup.com/
 [2]: /posts/getting-started-with-virtual-machines/
 [3]: /posts/setting-up-windows/
 [4]: https://brew.sh