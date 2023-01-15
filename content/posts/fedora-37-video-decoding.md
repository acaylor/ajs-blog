---
title: Fedora 37 and newer AMD video decoding
author: aj
date: 2023-01-15
categories:
  - Linux
tags:
  - fedora
  - linux
---

For linux distribution Fedora version 37 and newer, if you are using an AMD graphics card (gpu), the main package repositories no longer provide the drivers needed to decode video streams in browsers and other applicationns that utilize libraries such as vdpau.

Fortunately along with other non-free software such as codecs, the RPMFusion repository can be added to your system to install the drivers needed to decode videos using your GPU.

## Install RPM Fusion repo

If you don't already have the RPM fusion repositories installed on your system, first you need to install those.

See the latest instructions from the RPM fusion site: [https://rpmfusion.org/Configuration][1]

## Install Hardware codecs for AMD with mesa

Once the rpfusion-free repository is enabled, you can use the `dnf` package manager to install the mesa drivers from rpm fusion instead of the normal Fedora package repositories.

First install needed libraries:

```sh
sudo dnf install ffmpeg libva libva-utils
```

```sh
sudo dnf swap mesa-va-drivers mesa-va-drivers-freeworld
sudo dnf swap mesa-vdpau-drivers mesa-vdpau-drivers-freeworld
```

Now run `vainfo` in the terminal to verify that the VA-API is working. (This is what you installed before mesa).

Should look similar to this (note this is on wayland not x11):

```
Trying display: wayland
libva info: VA-API version 1.16.0
libva info: Trying to open /usr/lib64/dri/radeonsi_drv_video.so
libva info: Found init function __vaDriverInit_1_16
libva info: va_openDriver() returns 0
vainfo: VA-API version: 1.16 (libva 2.16.0)
vainfo: Driver version: Mesa Gallium driver 22.3.2 for AMD Radeon Graphics (rembrandt, LLVM 15.0.6, DRM 3.48, 6.0.16-300.fc37.x86_64)
vainfo: Supported profile and entrypoints
      VAProfileH264ConstrainedBaseline:	VAEntrypointVLD
      VAProfileH264ConstrainedBaseline:	VAEntrypointEncSlice
      VAProfileH264Main               :	VAEntrypointVLD
      VAProfileH264Main               :	VAEntrypointEncSlice
      VAProfileH264High               :	VAEntrypointVLD
      VAProfileH264High               :	VAEntrypointEncSlice
      VAProfileHEVCMain               :	VAEntrypointVLD
      VAProfileHEVCMain               :	VAEntrypointEncSlice
      VAProfileHEVCMain10             :	VAEntrypointVLD
      VAProfileHEVCMain10             :	VAEntrypointEncSlice
      VAProfileJPEGBaseline           :	VAEntrypointVLD
      VAProfileVP9Profile0            :	VAEntrypointVLD
      VAProfileVP9Profile2            :	VAEntrypointVLD
      VAProfileAV1Profile0            :	VAEntrypointVLD
      VAProfileNone                   :	VAEntrypointVideoProc
```

Now you can check a browser such as firefox to see if hardware video decoding is enabled. If using firefox, enter the url `about:support` in firefox. There should be a basic page with tables of information. Search for "decoding" and you should see a row `HARDWARE_VIDEO_DECODING_` with the value "available". This means that firefox is able to use the va-api to decode videos.

 [1]: https://rpmfusion.org/Configuration
