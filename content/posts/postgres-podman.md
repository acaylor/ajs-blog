---
title: PostgreSQL with Podman
author: aj
image: /images/pg_logo.png
date: 2024-10-14

categories:
  - Database Management
tags:
  - postgres
  - postgresql
  - database
  - podman
---

I have previously worked with Postgres as a database. Check out a [previous post][1] if you are not familiar with Postgres. In that post I ran Postgres as a docker container and used `psql` to execute commands against the database. Today I am going to look at running Postgres with Podman as an alternative container engine and another container "adminer" which provides a web UI for interacting with a database. If you are not familiar with Podman, check out [a previous post][2] about alternatives to Docker.

## Create a pod

With a podman pod, I can spin up several containers related to a database. To start, here is a pod with:

1. A postgresql server
2. a adminer container (a php app to interact with databases)
3. a container that runs the `psql` binary attached to your terminal

without the `-d` flag, you will need to open a new terminal for each subsequent container.

Generally here I will not add that flag unless the container is meant to act as a server. The adminer and psql containers performs database operations so I would not recommend to leave that running.

A new pod can be created with any of these containers or with the command:

```bash
podman pod create postgresp
```

To create containers inside a pod, add the pod flag:

```bash
podman run -it --rm --pod postgresp -p 8080:8080 docker.io/adminer
```

This will attach the current terminal session to the adminer container.

To create a postgres container, open a new terminal:

```bash
podman run --pod postgresp --name postgres_test -e POSTGRES_PASSWORD=supersecretpass -dt docker.io/postgres
```

Once the database is running you can access it with a browser on your localhost port `8080`.

You can open a `psql` shell with another container created within the pod:

```bash
podman run -it --rm --pod postgresp docker.io/postgres psql -h postgres_test -U postgres
```

 [1]: /posts/postgres/
 [2]: /posts/docker-alternatives/