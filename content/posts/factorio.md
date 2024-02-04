---
title: Factorio container game server
author: aj
image: /images/factorio_logo.png
date: 2022-02-11
updated: 2024-02-03
categories:
  - Containers
tags:
  - containers
  - docker
  - factorio
---

_updated: 2024-02-03_

[Factorio][1] is a game where you crash land on an alien planet and build a factory to create a space ship and escape the dangerous world you landed on.

![factorio_logo](/images/factorio_logo.png)

## Configuring the server

Someone has already created an amazing [container image][2] that will start the game server as a non-root user and supports mods out of the box.

Only one volume/directory is needed to store the persistent data of the game server. In this example, the container will run on a Linux system with docker and the game server files will be stored in `/opt/factorio`. The game server runs on UDP port `34197` by default. This can be changed but the game client will expect the default port. If you are not familiar with running containers, see [a previous post][3] on how to get started with docker.

If using a directory mount, after making any changes, the file permissions must be mapped to the factorio user that will run the server software inside the container. This user has a `uid` of `845`.

After making any changes, run:

```shell
chown -R 845:845 /opt/factorio
```

If you want to store the factorio files elsewhere, run this command on that directory.

Using `docker compose` and the template below, a fully functional factorio server can be created in seconds.

Create a `docker-compose.yaml` file with the following contents:

```yaml
version: '2'
services:
  factorio:
    image: factoriotools/factorio
    ports:
      - "34197:34197/udp"
    environment:
      - UPDATE_MODS_ON_START=true
    volumes:
      - /opt/factorio:/factorio
```

Replace `/opt/factorio` with any directory on your system where you want to run the factorio server and store the server files.

If you start this container, the server configuration will be auto-generated. This file can be modified to meet your requirements and then you can restart the container to reload the server configuration.

Once this compose template has been saved, the factorio server can be started with the following command:

```shell
docker compose up -d
```

You can directly connect to the server from the game main menu: 

Multiplayer > Connect to address

`hostname_or_ip:port` i.e. `factorio_host:34197`

### Upgrading to new versions

Run these commands in the directory with the `docker-compose.yml` template:

```shell
docker compose pull
docker compose up -d
```

### Port forwarding

Now in order to connect to your factorio server from the internet, you must open the associated port in your firewall and if on a consumer ISP, the best bet is to [port forward][4] the factorio port to your Internet gateway or router provided by your ISP.

In the example above, the server was configured to use port **34197/udp**


### Server settings

If using the volume mount `/opt/factorio` , the server settings can be found under `/opt/factorio/config/server-settings.json`.

### Saves

A new map/save file is created when the server starts for the first time. If you have a map from a single player game, this can be used by the server. The default save will be found in `/opt/factorio/_autosave1.zip`

The `map-gen-settings.json` and `map-settings.json` files in `/opt/factorio/config` can be modified to generate a new map/save. The server will always use the newest save. Timestamps can be checked with `ls -lt /opt/factorio`

To load an existing map/save, 
- Stop the container and run the command `touch oldsave.zip`. This resets the modified date. Next, restart the container. 
- Another option is to delete all saves except one.

To generate a new map stop the container, delete all of the saves and restart the container.

### Mods

The easiest way to import mods is to copy the `mods` directory from your system to the container's persistent volume `/opt/factorio/mods`

In the container compose template above, the environment variable `UPDATE_MODS_ON_START` will update the mod files when the container starts/restarts.

 [1]: https://www.factorio.com/
 [2]: https://hub.docker.com/r/factoriotools/factorio
 [3]: /posts/containers/
 [4]: https://portforward.com/

