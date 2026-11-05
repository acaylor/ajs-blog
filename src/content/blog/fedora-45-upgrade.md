---
title: Fedora 45 upgrade
author: aj
date: 2026-11-05
description: 'How to upgrade an existing Fedora workstation to Fedora 45, plus the problems I hit along the way.'
image: /images/fedora.png
categories:
  - Linux
tags:
  - fedora
  - linux
---

Fedora usually ships two releases a year. I upgraded to 44 back in April [in a previous post][3]. This post walks through upgrading an existing Fedora 44 workstation to Fedora 45 with `dnf` offline upgrades.

This upgrade gave me more trouble than usual. My `/boot` partition was full, Fedora 45 left four of my third-party repos disabled or missing, and my NVIDIA card booted to a black screen.

I have been upgrading the same system for a few years now:

```txt
2024:   Fedora 40 (install)
        |
        v
        f41
        |
        v
2025:   f42
        |
        v
        f43
        |
        v
2026:   f44
        |
        v
        Fedora 45 (today)
```

## What's new in Fedora 45

Fedora Linux 45 came out on November 3 after two slips from its original October 20 target. Workstation moves to GNOME 51, and the KDE edition moves to Plasma 6.8. Under the hood, the toolchain gets its usual refresh: GCC 16.2, glibc 2.44, binutils 2.47, LLVM 23, Python 3.15, Go 1.27, Perl 5.44, and RPM 6.1. A few changes matter more for an existing system than for a fresh install:

- **RPM enforces signature checking by default.** RPM now refuses to install a package without a verified signature unless you explicitly skip the check. This affects RPMs you download by hand.
- **kmscon replaces fbcon as the default virtual console.**
- **The kernel restricts ptrace for unprivileged users by default.** Debuggers still work, but attaching to another user's running process now needs more privileges.
- **Packaged repo configs move from `/etc` to `/usr`.** This can silently disable third-party repos. See [Re-enable disabled repositories](#re-enable-disabled-repositories).
- **GNOME Keyring desktops switch to oo7 as the default Secrets Service provider.**
- **Fedora retires the NetworkManager `vpnc` and `fortisslvpn` plugins.** If you have VPN connections that use them, move them to another plugin before you upgrade.
- **MySQL 9.7 and MariaDB 12.3 become the defaults.**
- **`setuptools` 82 drops `pkg_resources`.**

## Prepare for the upgrade

Back up important files off the machine you're upgrading before you start. Even if past Fedora upgrades went cleanly, a failed boot update or interrupted transaction can leave the system unbootable.

### Check free space on /boot

Check `/boot` usage before anything else, since the upgrade installs a Fedora 45 kernel and builds a new initramfs for it:

```sh
df -h /boot
```

If `/boot` runs out of space partway through, you get a broken boot entry. Aim for at least 300–400M free, especially if you use the proprietary NVIDIA driver.

If you need to make room, list the installed kernels, check which one you're currently running (`uname -r`), and remove the older versions:

```sh
rpm -q kernel-core
sudo dnf remove kernel-core-<old-version>
```

Removing `kernel-core` also removes the matching `kernel`, `kernel-modules`, and `kmod-nvidia` packages. It leaves `kernel-devel` behind, so remove that separately if you have it.

Fedora keeps three kernels by default. If your `/boot` is small, it can fill up again a few weeks later as kernel updates arrive. You can prevent that in two ways:

- **Keep fewer kernels:** Set `installonly_limit=2` in `/etc/dnf/dnf.conf`.
- **Drop the rescue image:** Stop dracut from building one, then remove the existing image and its boot entry (which include your `/etc/machine-id`):

  ```sh
  echo 'dracut_rescue_image="no"' | sudo tee /etc/dracut.conf.d/no-rescue.conf
  sudo rm /boot/*-rescue-"$(cat /etc/machine-id)"*
  sudo rm /boot/loader/entries/"$(cat /etc/machine-id)"-0-rescue.conf
  ```

> **On my system:** `/boot` was 974M and 100% full. With the NVIDIA driver installed, each initramfs is about 190M, so three kernels plus a 275M rescue image filled the partition. Removing the two older kernels freed 473M, but that would only last until the next few kernel updates. I chose to drop the rescue image and keep three kernels. Dracut had built the rescue image back in April from Fedora 44, and a btrfs snapshot makes a better fallback. Afterward, `/boot` was 24% used, with 691M free.

### Check third-party repositories

Run `dnf repolist` and check that every third-party repo you use publishes Fedora 45 builds; a repo without them can make the download step fail with dependency errors. All of mine (RPM Fusion, Google Chrome, Sublime Text, the NVIDIA container toolkit, and two COPRs) already had Fedora 45 packages ready.

If you use the NVIDIA driver from RPM Fusion, confirm specifically that `akmod-nvidia` has an `fc45` build so Fedora 45 doesn't boot without a working driver.

### Take a btrfs snapshot (optional)

If your root filesystem is btrfs, take a snapshot before you upgrade. If the upgrade fails, you can boot the snapshot and get your system back as it was.

List the subvolumes on the root filesystem:

```sh
sudo btrfs subvol list /
```

The default Fedora layout has a `root` subvolume for the system and a separate `home` subvolume. A snapshot of `root` covers the operating system but not `/home`, so it doesn't replace a backup.

Run `findmnt /` to find the device behind `/` (ignore the `[/root]` subvolume suffix in the `SOURCE` column). Mount the top level of that filesystem and verify that `root` appears in the listing, replacing `/dev/nvme1n1p3` with your device:

```sh
sudo mkdir -p /mnt/snapshots
sudo mount -o subvolid=5 /dev/nvme1n1p3 /mnt/snapshots
ls /mnt/snapshots
```

Take a snapshot of `root`, then unmount the top-level volume so it isn't left mounted during the upgrade:

```sh
sudo btrfs subvol snapshot /mnt/snapshots/root /mnt/snapshots/fedora-upgrade.snapshot
sudo umount /mnt/snapshots
```

To roll back after a failed upgrade, pick the **Fedora 44** kernel entry in the GRUB menu, not the new Fedora 45 one, since the Fedora 44 snapshot has no modules for the Fedora 45 kernel. Press <kbd>e</kbd> and change `rootflags=subvol=root` to `rootflags=subvol=fedora-upgrade.snapshot`. That GRUB edit applies only to the current boot; to make the rollback permanent, mount `subvolid=5` again and replace `root` with the snapshot.

## Upgrade

The [official documentation][1] has the current instructions. Check it before you start in case the process has changed.

### Update all packages

Bring your current system fully up to date:

```sh
sudo dnf upgrade --refresh
```

If this installs a new kernel, reboot to make sure the system is stable before you continue.

Fedora 41 and later use DNF5, which has `system-upgrade` built in, so you don't need to install `dnf-plugin-system-upgrade`. You can verify it's available with:

```sh
dnf system-upgrade --help
```

### Review the transaction

The download command lists the whole transaction and asks you to confirm it. The list scrolls past quickly and can be longer than your terminal's scrollback. To review it first, do a dry run that saves the list to a file:

```sh
sudo dnf system-upgrade download --releasever=45 --assumeno > /tmp/f45-txn.txt 2>&1
```

Read two sections of `/tmp/f45-txn.txt` before you go ahead:

- **Removing:** Make sure it doesn't include anything you need.
- **Downgrading:** A few packages usually get slightly older builds because their Fedora 44 updates are newer than the Fedora 45 release builds. This is normal, and the Fedora 45 updates repo catches them up.

> **On my system:** The transaction came to about 3,100 upgrades and 6 GiB. The list was longer than my tmux history, which is why I added the dry run. It removed only `kernel-devel` for a kernel I had already uninstalled, and downgraded 18 packages, including `hplip`, `bind-utils`, and `python3.12`.

### Download the new release

Once the transaction looks clean, download the Fedora 45 packages:

```sh
sudo dnf system-upgrade download --releasever=45
```

After downloading, `dnf` tests the transaction and asks you to import the new Fedora 45 GPG key. **This is a second `[y/N]` prompt, separate from the transaction prompt.** Check the fingerprint against the [Fedora security page][2] before you accept it. The Fedora 45 key is:

```txt
4F50 A611 4CD5 C697 6A7F  1179 655A 4B02 F577 861E
```

If you answer `n`, the test fails with `Signature verification failed`. Run the download command again. `dnf` keeps the packages it already downloaded, so the retry doesn't download them again.

> **On my system:** I answered `n` to the key prompt by mistake because I thought it was the transaction prompt. Running the download again took 15 seconds and went straight back to the key prompt.

### Install the new release

Reboot into the offline upgrade environment to apply the transaction:

```sh
sudo dnf offline reboot
```

The upgrade runs in a minimal boot environment with no networking, so SSH won't work until it finishes and reboots into Fedora 45. On my machine it took about 30 minutes, with a black screen the entire time. If your screen goes black or stops responding, don't power the machine off; see [Black screen with an NVIDIA card](#black-screen-with-an-nvidia-card).

## After the upgrade

### Re-enable disabled repositories

Fedora 45 moves packaged repo configs from `/etc/yum.repos.d/` to `/usr/share/dnf5/repos.d/`, and the new copies in `/usr` ship **disabled**. RPM renames your old, enabled copies to `.rpmsave`. This affects repos that Fedora packages, mostly the ones from `fedora-workstation-repositories`, such as Google Chrome, RPM Fusion's NVIDIA driver and Steam repos, and the PyCharm COPR. Repos you added yourself stay in `/etc` and keep working.

Check for `.rpmsave` files and newly disabled repos:

```sh
ls /etc/yum.repos.d/*.rpmsave
dnf repolist --all | grep disabled
```

The second command also lists `debuginfo`, `source`, and `updates-testing` repos, which are always disabled. Ignore those and look for repos you were using.

Packages from a repo that's now disabled show up as "extras", meaning installed but not available from any enabled repo:

```sh
dnf repoquery --installed --extras
```

If you use the NVIDIA driver, fix this right away so future kernel updates don't outpace the driver. Re-enable the repos you need with DNF5's `setopt`, which writes an override to `/etc/dnf/repos.override.d/` and leaves the packaged file alone so the setting survives package updates:

```sh
sudo dnf config-manager setopt rpmfusion-nonfree-nvidia-driver.enabled=1 rpmfusion-nonfree-steam.enabled=1 google-chrome.enabled=1
```

Fedora 45's `fedora-workstation-repositories` no longer ships the PyCharm COPR, so enable it directly if you use it:

```sh
sudo dnf copr enable phracek/PyCharm
```

Once `dnf repolist` shows everything you need enabled, run `sudo dnf upgrade --refresh` to pull in any Fedora 45 updates from the restored repos, then delete the leftover `/etc/yum.repos.d/*.rpmsave` files.

> **On my system:** Google Chrome, RPM Fusion's NVIDIA driver repo, and RPM Fusion's Steam repo all ended up disabled, while the PyCharm COPR disappeared altogether. Nothing warned me. I only noticed because `akmod-nvidia` and `steam` showed up in the extras list. My own repos, including Sublime Text, the wezterm COPR, and the NVIDIA container toolkit, kept working.

### Remove retired packages

Install `remove-retired-packages` and pass it the release you upgraded from to clean up packages Fedora has retired since 44:

```sh
sudo dnf install remove-retired-packages
sudo remove-retired-packages 44
```

It shows why Fedora retired each package and asks for confirmation before removing anything.

> **On my system:** It removed `kwebkitpart`, along with seven Qt5 and KDE Frameworks 5 packages that nothing else used. It also removed `linux-atm-libs`, which Fedora retired because it no longer builds against kernel 7.2's headers.

### Clean up

Check that no duplicate packages were left behind (this should produce no output):

```sh
dnf repoquery --duplicates
```

Run `dnf repoquery --installed --extras` again. It should list only packages you expect to have no repo, like locally built `kmod-nvidia-*` packages and anything you installed from a downloaded RPM.

`sudo dnf autoremove` removes packages that nothing depends on anymore, but it can also remove an application you installed yourself. Read the list before you confirm.

`dnf` removes your Fedora 44 kernel automatically as newer kernels arrive; until then, keep it as a fallback. If you removed older kernels before the upgrade, check `rpm -q kernel-devel` for any orphaned `kernel-devel` packages left behind.

If you took a btrfs snapshot earlier, delete it once you're happy with Fedora 45:

```sh
sudo mount -o subvolid=5 /dev/nvme1n1p3 /mnt/snapshots
sudo btrfs subvol delete /mnt/snapshots/fedora-upgrade.snapshot
sudo umount /mnt/snapshots
```

Reboot once more to confirm everything comes up correctly. If you reach the login screen and can log in, the upgrade most likely succeeded.

## Troubleshooting

### Black screen with an NVIDIA card

**Symptom:** The screen goes black during or after the upgrade, and the keyboard does nothing.

During the upgrade itself, a black screen doesn't necessarily mean anything is wrong. Cutting power mid-transaction leaves packages and the RPM database half-upgraded, so leave the machine running and check from another computer. SSH works again once the system reboots into Fedora 45.

If the screen is still black on Fedora 45, SSH in from another machine and check which driver your GPU is using:

```sh
lspci -k | grep -A3 -i vga
```

If you blacklist `nouveau` but this shows `Kernel driver in use: nouveau`, the `nvidia` module failed to load. When that happens, RPM Fusion's `nvidia-fallback.service` loads `nouveau` anyway, and `nouveau` has limited support for recent GPUs. Check the kernel log for the reason:

```sh
journalctl -b -k | grep -E 'unavailable key|NVRM'
```

If you see `Loading of module with unavailable key is rejected`, Secure Boot is rejecting the module. `akmods` signs the modules it builds with a local key, and the firmware's MOK list has to contain that key. Compare the key that signed the module with the keys the kernel loaded at boot:

```sh
modinfo -F signer nvidia
journalctl -b -k | grep 'Loaded X.509 cert'
```

If the signer is missing from the cert list, enroll the `akmods` key again:

```sh
sudo mokutil --import /etc/pki/akmods/certs/public_key.der
```

`mokutil` asks you to set a one-time password. On the next reboot, the blue MOK Manager screen appears in UEFI firmware before Linux loads, so it will display normally even when Fedora boots to a black screen. It waits 10 seconds for a key press and then carries on booting without enrolling anything, so watch for it. Choose **Enroll MOK**, **Continue**, and **Yes**, then enter the password and reboot. The modules already carry this key's signature, so nothing needs rebuilding.

> **On my system:** The screen on my RTX 5090 stayed black through the upgrade and on the first Fedora 45 boot. I first assumed `akmods` had built the module too late in boot, so I rebooted again, but `nouveau` loaded again. The kernel log showed the real cause: my `akmods` key had disappeared from the MOK list. The journal showed the kernel loading the key on an earlier Fedora 44 boot and missing it on every boot after that. The first of those boots was before I started the upgrade, so the upgrade didn't cause it. After I re-enrolled the key, `lspci` reported `Kernel driver in use: nvidia`.

[1]: https://docs.fedoraproject.org/en-US/quick-docs/upgrading-fedora-offline/
[2]: https://fedoraproject.org/security/
[3]: /posts/fedora-44-upgrade/
