---
title: Getting started with Ansible
author: aj
image: /images/ansible.png
date: 2021-09-01
categories:
  - ansible
tags:
  - ansible
  - configuration management
  - infrastructure as code

---

![ansible](/images/ansible.png)

[Ansible][1] is an open-source software that uses python to provide an automation language. It uses [YAML][2] declarative files known as playbooks to describe tasks that are executed by Ansible. Ansible can configure computer systems, deploy software, and automate IT tasks at scale. Ansible does not require software to be installed on managed systems and utilizes protocols such as [OpenSSH][3] and [WinRM][4] to connect to systems. The official documentation has more detailed information on [how to get started][5].

## Installing Ansible

Ansible can be installed on non-Windows operating systems using `pip`, the Python package manager.

```bash
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python get-pip.py --user
python -m pip install --user ansible
```

Ansible is also distributed in various Linux distributions. See the offical docs for [how to install][6] on various distros.

## How to get started

The best way to manage Linux systems is to use SSH keys and `ssh-agent`. Create a ssh key and distribute it to a system that you would like to manage.
```bash
ssh-keygen
eval `ssh-agent`
ssh-add
ssh-copy-id yourserver.example.com
```

## Using Ansible to run commands

Once you have the ability to remotely connect to a system, you can use Ansible to execute commands on one or more systems.

```bash
ansible yourserver.example.com -a "whoami"
# use a built in ansible module
ansible yourserver.example.com -m apt -a "name=vim state=present"
```

## Using Ansible to keep Linux systems up to date

An Ansible playbook can be used to apply patches to Linux systems.

```bash
ansible yourserver.example.com -m yum -a "name=* state=latest"
```

A playbook can be used to include tasks required to apply updates. A playbook is a YAML file.

```yaml
---
# Target all hosts from an inventory
- hosts: all
  # Patching requires root privileges
  become: yes
  # Check the operating system, this playbook only supports RedHat and Debian based distros
  pre_tasks:
  - name: OS Check
    debug:
      msg: System {{ inventory_hostname }} not supported
      verbosity: 1
    when: (ansible_facts['os_family'] != "RedHat") or (ansible_facts['os_family'] != "Debian")
  # Check for yum-utils on EL 7 hosts
  - name: Check for yum-utils
    yum:
      name: 'yum-utils'
      state: present
    when: (ansible_facts['os_family'] == "RedHat" and ansible_facts['distribution'] == "7")

  tasks:
  # update all packages with the apt package manager
  - name: apt - Upgrade everything
    apt:
      update_cache: yes
      upgrade: dist
    when: ansible_facts['os_family'] == "Debian"
  # update all packages with the yum package manager
  - name: yum - Upgrade everything
    yum:
      name: "*"
      state: latest
    when: ansible_facts['os_family'] == "RedHat"
   # Check if the applied updates require a system reboot
  - name: check needs-restarting - el7
    command: 'needs-restarting -r'
    failed_when: false
    register: needs_restarting
    changed_when: needs_restarting.rc == 1
    notify: restart
    when: (ansible_facts['os_family'] != "RedHat" and ansible_facts['distribution'] == "7")
  - name: check reboot required - Ubuntu
    shell: "[ -f /var/run/reboot-required ]"
    failed_when: false
    register: reboot_required
    changed_when: reboot_required.rc == 0
    notify: restart
    when: (ansible_facts['distribution'] == "Ubuntu")
# A handler is called when a task reports 'changed'
  handlers:
  - name: restart
    reboot:
```

You can create an inventory file to point Ansible at your systems in INI or YAML format.
```ini
[centos]
centos.example.com
centos2.example.com
[ubuntu]
ubuntu1.example.com
ubuntu2.example.com ansible_host=192.168.1.99
[debian]
debian.example.com
```

Now with the above playbook and above inventory file, I can use ansible to apply updates to all of those systems:
```bash
# -i is for the inventory file and -K is to specify the become password for escalating to sudo
ansible-playbook -i inventory.ini updates.yml -K
```

For more information, visit the [official Ansible documentation][5]. This post only scratches the surface for what is possible.

 [1]: https://www.ansible.com
 [2]: https://yaml.org
 [3]: https://www.openssh.com/
 [4]: https://docs.ansible.com/ansible/latest/user_guide/windows_winrm.html
 [5]: https://docs.ansible.com/ansible/latest/user_guide/index.html#getting-started
 [6]: https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html#installing-ansible-on-specific-operating-systems