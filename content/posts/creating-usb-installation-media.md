---
title: Creating USB installation media
author: aj
date: 2021-07-03
categories:
  - USB
tags:
  - etcher
  - rufus
  - usb

---
One way to install new Operating Systems onto your computer is by using a [USB][1] storage device, also known as a flash drive. There is already great software available to users on different operating systems for rewriting USB drives to serve as operating system installers.

## Recommended software for Windows 10 &#8211; Rufus

If you are creating USB installation media on Windows 10, especially if you are creating a Windows 10 installer, I recommend using [Rufus][2].

Midway through the rufus homepage are download links. The portable version is a single executable file that can be stored anywhere on your device.

Once you have downloaded Rufus, launch the software by opening the start menu (Windows key) and searching for &#8220;rufus&#8221;.

![rufus](/images/rufus.png)

Once you launch Rufus, select your USB drive under &#8220;Device&#8221; and then click &#8220;Select&#8221; and choose a disk image file.

Rufus has some built in functionality for creating Windows 10 installation images. If you select a Windows 10 installation .iso image, you should see the following options:

![rufus_win.png](/images/rufus_win.png)

I recommend letting Rufus pick the default settings as shown here, then click &#8220;Start&#8221; at the bottom to begin rewriting the USB drive with the installation image.


## Recommended Software for Linux, macOS or Windows 10 users &#8211; Etcher

I recommend [etcher][3] which will run on Linux, Windows 10 and macOS as well. You cannot use etcher to create Windows 10 installation media but it works great for creating bootable Linux installers. You could download the latest version of the standalone executable from the [etcher github repository][4].

#### Installing etcher on Debian and Ubuntu based distributions

If you have a Debian based distro i.e. Debian, Ubuntu, Mint, Pop_OS, MX Linux or similar, you can install etcher by adding the Package repository to your system:

```bash
echo "deb https://deb.etcher.io stable etcher" | sudo tee /etc/apt/sources.list.d/balena-etcher.list
```

Before installing, add Bintray.com&#8217;s GPG key to your system:

```bash
sudo apt-key adv --keyserver hkps://keyserver.ubuntu.com:443 --recv-keys 379CE192D401AB61 
```

This key will verify that the software you download comes from the maintainer.

Update your apt cache and install:

```bash
sudo apt-get update && sudo apt-get install balena-etcher-electron
```

Now etcher can stay up to date along with the rest of your system through apt updates.

#### Installing etcher on Red Hat and Fedora systems:

If on RHEL 8 or Fedora 22 or a newer version, add the DNF repository and install the rpm package:

```bash
sudo dnf config-manager --add-repo https://balena.io/etcher/static/etcher-rpm.repo && sudo dnf install balena-etcher-electron 
```

#### Installing etcher on macOS:

I recommend using [homebrew][5] to install etcher. Once you have homebrew available, install with one command:

```bash
brew install balenaetcher 
```

Recent versions of macOS will block execution of all third-party software by default. To circumvent this issue, enable ‘App Store and identified developers’ in the ‘Security & Privacy’ pane of System Preferences. 

System preferences can be opened from the desktop and then pressing [ Command ] + [ , ] keys. If you are still warned against running the application: 

&#8220;Etcher&#8221; was blocked from opening because it is not from an identified developer.

Click ‘Open Anyway’ in the same pane of System Preferences.

#### Installing etcher on Windows 10:

For windows and for the other platforms, you can also download a precompiled executable for etcher from the official site. Similar to Rufus it can come in a single executable file.

https://www.balena.io/etcher/

![etcher_download](/images/etcher_download.png)

### Running etcher

Once you have installed etcher, launch it by pressing the Windows/Super key and searching for &#8220;etcher&#8221; in your desktop environment. If on macOS, open spotlight search instead of pressing the Command key.

![etcher](/images/etcher.png)

  1. Once you have launched etcher, similar to Rufus you can select a disk image that has a bootable installer. 
  2. Click &#8220;Flash from file&#8221; and find the location of the disk image you downloaded. 
      * Alternatively, you can paste in the URL of a installation image. 
  3. Once you have selected your image file or URL, click &#8220;Select target&#8221; and choose the USB device that is connected to your computer.
  4. Once you have selected your USB device, press &#8220;Flash!&#8221; and etcher will rewrite the USB device.

I can recommend etcher because of how easy it is to create installation USB drives and it can also be used to copy images onto SD cards. There are also ways to do it from the command line but personally, I wouldn&#8217;t script something like this because USB drives can change device labels and this process can be destructive to data on those devices.

## Creating a bootable USB drive &#8211; macOS & Linux Shell

Linux and macOS have a command shell program known as `dd` that can take installation .iso images and rewrite your usb drive with these files.

#### Format USB drive &#8211; macOS

```bash
diskutil list 
```

Identify your USB device from the list of disks and unmount it, replacing &#8220;N&#8221; with the disk number from the last step:

```bash
diskutil unmountDisk /dev/diskN 
```

Copy installation image with `dd`

```bash
sudo dd bs=4M if=location_of_image.iso of=/dev/rdiskN; sync
```

This will take quite a bit of time and progress can be checked with [ Ctrl ] + [ t ] . If you get an error about the block size, try `bs=1M`

Once this command completes, eject the disk:

```bash
sudo diskutil eject /dev/diskN
```

### Format USB drive &#8211; Linux and Cygwin

First, determine the USB device name and unmount the partition (if there is a partition).

```bash
# Linux
lsblk
# Find the correct /dev/sdN device
sudo unmount /dev/sdN

# Cygwin
cat /proc/partitions
# Find the correct /dev/sdN device 
```

Navigate to the directory where the image file is located. If on Cygwin, run as an admin (this is required to access USB devices). On Linux, run the command with sudo.

```bash
dd bs=4M if=image_filename.iso of=/dev/sdN
```

This will take quite a bit of time and progress can be checked with [ Ctrl ] + [ t ] . If you get an error about the block size, try `bs=1M` 

## Formating a USB Drive &#8211; Command Line Windows

Open an administrative shell i. e. [ Win key ] + [ x ] + [ a ]

Open the diskpart program, and identify your usb device disk number and replace with X below

```
diskpart
DISKPART> list disk
Disk ###  Status         Size     Free     Dyn  Gpt
DISKPART> select disk X
Disk X is now the selected disk.
DISKPART> clean
DiskPart succeeded in cleaning the disk.
DISKPART> create partition primary
DiskPart succeeded in creating the specified partition.
DISKPART> select partition 1
Partition 1 is now the selected partition.
DISKPART> format fs=fat32 quick
100 percent completed
 DiskPart successfully formatted the volume.
DISKPART> active
DiskPart marked the current partition as active.
DISKPART> exit 
```

After this you can move files to the root of the drive.

 [1]: https://en.wikipedia.org/wiki/USB
 [2]: https://rufus.ie/en_US/
 [3]: https://www.balena.io/etcher
 [4]: https://github.com/balena-io/etcher/releases
 [5]: https://brew.sh/