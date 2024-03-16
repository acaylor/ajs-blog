---
title: State of the homelab, March 2024
author: aj
date: 2024-03-16
categories:
  - Homelab
tags:
  - homelab
---

As part of a big move, I will be setting up the homelab from the ground up. I am also setting a new objective for the homelab. The homelab is an environment to learn about software and computer networks. I prefer to learn by example so my lab will be a do-it-yourself software factory. There are many roles in the Tech industry and a homelab is a good place to learn aspects of technology that go beyond writing code.

## Personal computer setup

Hopefully if you made it to this blog on the internet, you already have a personal device set up. For a personal computer people tend to form their own opinions and I am no different. I have used [Windows][1], [macOS][2], and [Linux][3] as a personal computer and these choices all come with their own tradeoffs.

Here's an overview of the pros and cons of using Windows, macOS, and Linux as personal computer operating systems:

### Windows:

#### Pros:

1. **Wide Compatibility**: Windows has extensive compatibility with software and hardware, making it suitable for a wide range of applications and devices. The makers of Windows, Microsoft, spend billions ensuring that companies make their software and hardware compatible with windows.
2. **User-Friendly Interface**: Windows typically offers a basic graphical interface, making it easy for beginners to navigate and use. Though it seems we are in a transitionary phase between an old style interface that has been around for 30 years and more "modern" "material" design.
3. **Large Software Library**: Windows has a vast library of software and games available, including many popular commercial applications. Typically any new version can run software from any previous version of Windows.
4. **Commercial Support**: Microsoft provides extensive support for Windows users, including regular updates, patches, and a wide range of online resources.

#### Cons:
1. **Vulnerability to Malware**: Windows is more prone to malware and security threats compared to macOS and Linux, partly due to its widespread usage and popularity.
2. **Performance Overhead**: Windows can sometimes suffer from performance overhead due to its resource-heavy nature, particularly on older hardware.
3. **Cost**: Windows licenses can be expensive, especially for the professional versions, and it seems there will continue to be new versions developed and sold.
4. **Privacy Concerns**: Windows has faced criticism for privacy concerns, with some users expressing dissatisfaction with data collection practices. It is difficult to set up a new system without providing Microsoft with your personal information and email.

### macOS:

#### Pros:
1. **Integration with Apple Ecosystem**: macOS seamlessly integrates with other Apple devices and services, providing a cohesive user experience across devices. If you have a lot of Apple devices, they will all work together.
2. **High Performance**: macOS is known for its performance optimization, providing smooth and responsive operation, since Apple designs the hardware used for their devices.
3. **User-Friendly Interface**: macOS offers an intuitive and polished user interface, with features like Spotlight search and Mission Control for easy navigation.
4. **Strong Security**: macOS has a reputation for strong security features, including built-in encryption, Gatekeeper app verification, and sandboxing.

#### Cons:
1. **Limited Hardware Options**: macOS is only officially supported on Apple hardware, limiting options for hardware customization and potentially increasing costs.
2. **Software Compatibility**: While macOS has a decent selection of software available, it may lack compatibility with some niche or industry-specific applications. This is especially true after they stopped using Intel CPUs in their computers and instead developed their own processors.
3. **Cost**: Apple hardware, including Mac computers, tends to be more expensive compared to Windows-based PCs.
4. **Customization Limitations**: macOS offers less customization options compared to Linux, limiting the ability to tailor the system to individual preferences.

### Linux:

#### Pros:
1. **Open Source**: Linux is open-source software, meaning it's freely available to use and modify, with a large community of developers contributing to its development.
2. **Customizable**: Linux offers extensive customization options, allowing users to tailor the operating system to their specific needs and preferences.
3. **Security**: Linux provides many security features and typically software does not execute with full access to the underlying system. Since Linux is less popular than alternatives, there is not as much malware that will target a Linux system.
4. **Resource Efficiency**: Many Linux distributions are lightweight and optimized for performance, making them suitable for older hardware or resource-constrained devices.

#### Cons:
1. **Software Compatibility**: While Linux has a growing library of software available, it may lack compatibility with certain proprietary applications or games. There are often alternatives available to commercial software but game software typically requires additional software to translate software that was meant to run on Windows systems.
2. **Hardware Compatibility**: Linux drivers for some hardware components may be limited or less optimized compared to Windows or macOS, leading to potential compatibility issues. If you buy a brand new Windows laptop, Linux may not have support for the keyboard and trackpad for example.
3. **Learning Curve**: Linux can have a steeper learning curve for beginners, particularly those unfamiliar with command-line interfaces and system administration tasks. You may also inadvertently install a version of Linux that does not have a Graphical User Interface installed by default.
4. **Fragmentation**: The wide variety of Linux distributions (distros) can lead to fragmentation, with different distros offering varying levels of stability, software availability, and support. This also manifests in software for Linux such as several large projects that provide a desktop graphical interface but are not the same (GNOME desktop, KDE plasma, and xfce to name a few options).

Ultimately, the choice between Windows, macOS, and Linux as a personal computer operating system depends on individual preferences, requirements, and priorities in terms of compatibility, performance, user experience, and customization options. If you need to use certain software for your job, I suggest not trying to force yourself to use an Operating System with compatibility issues. Also for a system provided by an employer, you may not have a choice as to what you are given to use for your job.

Since I am setting up a homelab, I will explore all of the major operating systems. My employer gave me a macOS Macbook pro so that is the system I will be using as a personal computer. I will use virtualization technology to run other operating systems both on my Macbook and the systems I set up to be servers. If you are not familiar with virtual machines, check out a [previous post][4] to get started with virtualization software that will run on Windows, macOS, or Linux.

For software that I recommend on a personal computer, check out a [previous post][5] with my recommended tools.

## Lab setup

- Stage 1: Networking
- Stage 2: Security
- Stage 3: Servers
- Stage 4: Software and IoT

Soon I will begin setting up a new lab.

 [1]: https://en.wikipedia.org/wiki/Microsoft_Windows
 [2]: https://en.wikipedia.org/wiki/MacOS
 [3]: https://en.wikipedia.org/wiki/Linux
 [4]: /posts/getting-started-with-virtual-machines/
 [5]: /posts/tools-jan-2024/