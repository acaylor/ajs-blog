---
title: Polling Home Assistant to store data long term
author: aj
draft: true
date: 2026-03-02
categories:
  - AI
  - Software Development
  - Homelab
tags:
  - ai
  - llm
  - codex
  - claude code
  - go
  - home assistant
  - timescaledb
  - grafana
---

I've been running Home Assistant for a few years now. It's great at automating my house, but its built-in history is not great for long-term analysis. I wanted my sensor data in a database where I could query it properly and store data for a long time.

The project itself is not groundbreaking: poll an API, filter some data, write it to a database. But it's exactly the kind of thing that used to eat an entire weekend: designing the schema, wiring up config, getting Docker right, in this case, remembering how TimescaleDB continuous aggregates work, and writing tests.

With a somewhat clear goal in mind, I used two coding "AI" agents to plan and implement my project:

- **Codex** for plan review plus Phase 1 MVP implementation
- **Claude Code** for iterative expansion through production hardening

## Start with a plan, not with code

I started with a draft plan (`code-plan.md`) from a ChatGPT conversation: architecture, schema, filtering strategy, and phased rollout. Then I handed that plan to Codex to review and implement Phase 1.

A single Go service that:

- Polls Home Assistant every minute
  - **Home Assistant**: an open-source home automation platform that exposes your smart home devices and sensors over an HTTP API.
  - **Polling every minute**: the service hits that API once per minute to grab the latest sensor readings, rather than waiting for devices to push data.
- Filters entities with glob-based allowlist/blocklist
  - **Entities**: individual things in Home Assistant (for example `sensor.living_room_temperature` or `binary_sensor.front_door`).
  - **Allowlist/blocklist**: patterns that say "only include these" (allowlist) and "always exclude these" (blocklist) so you don't flood the database with noisy or unimportant sensors.
  - **Glob patterns**: simple wildcard strings like `sensor.*` or `sensor.energy_*` that match many entities without writing each one out by hand.
- Writes only on meaningful change (epsilon configurable)
  - **Meaningful change**: the service skips tiny fluctuations (like 21.00C to 21.01C) so you don't waste storage on noise.
  - **Epsilon**: a small threshold value you can tune that defines how big a change must be before it is written to the database.
- Stores data in TimescaleDB with compression, retention, and hourly rollups
  - **TimescaleDB**: a PostgreSQL extension designed for time-series data (data with timestamps), perfect for sensor readings.
  - **Compression**: automatically squeezes older data so it uses less disk space.
  - **Retention**: old raw data is deleted after some time so the database doesn’t grow forever.
  - **Hourly rollups**: precomputed summaries (like min/avg/max per hour) that make dashboard queries fast even over months of history.
- Exposes Prometheus metrics and health checks
  - **Prometheus metrics**: numeric counters and gauges (like "rows written" or "failed polls") that monitoring systems like Prometheus/Grafana can scrape and visualize.
  - **Health checks**: simple HTTP endpoints that say "this service is healthy" so you can alert if it stops working or loses DB/API access.
- Deploys with `docker compose up`
  - **Docker**: a way to package the app and its dependencies into a portable container image.
  - **Docker Compose**: a small YAML file that describes the app plus its database, so you can bring everything up locally or on a server with a single command.

Codex's review surfaced two concrete issues before coding:

- Add `CREATE EXTENSION IF NOT EXISTS timescaledb;` so hypertable setup works on a fresh database.
- Make startup migrations fully idempotent (the continuous aggregate policy in the draft needed an `if_not_exists` guard).

After that review, Codex implemented the Phase 1 MVP directly in the repo.

## Decisions, not blind acceptance

I did not accept every suggestion. Here are some things that were in the original plan:

- **Heartbeat removed**: Grafana's fill behavior was good enough for my use case, and heartbeat logic added complexity I did not need.
- **Allowlist and blocklist together**: I kept broad include globs (like `sensor.*`) plus targeted excludes (`sensor.energy_*`).
- **No Redis cache**: restarting and writing one new baseline row per entity is cheap; introducing Redis just to avoid that is unnecessary.

The process worked because the model gave options, and I made the trade-off decisions.

## Phase-by-phase implementation with real verification

The plan had four phases. For Phase 1, Codex implemented the MVP and I validated it end-to-end in Docker with a deterministic mock Home Assistant API.

### Phase 1: MVP (reviewed and implemented with Codex)

Codex scaffolded and wired the full baseline service:

- `cmd/ha-timescale-poller/main.go` entrypoint
- `internal/config` for env loading/validation
- `internal/ha` client for `GET /api/states` with bearer token
- `internal/filter` allowlist/blocklist glob filtering (`path.Match`)
- `internal/engine` polling loop (fetch -> filter -> numeric parse -> insert)
- `internal/store` pgx pool + `CopyFrom` inserts + schema execution
- `schema.sql` embedded via `go:embed`
- `Dockerfile` and `docker-compose.yml`

Validation setup:

- TimescaleDB container
- Poller container
- Mock HA container serving `/api/states`
- Poll interval set to `5s` for fast validation cycles

Mock payload included:

- numeric + allowed sensors
- blocked sensor
- `unknown` and `unavailable` states
- a `binary_sensor.*` entity

Observed poller logs:

```text
seen=6 matched=4 numeric=2 inserted=2
```

Database verification:

```text
total_rows = 22
distinct entity_id:
  - sensor.allowed_float
  - sensor.allowed_int
blocked_rows = 0
unknown_rows = 0
unavailable_rows = 0
binary_sensor_rows = 0

```

That satisfied all Phase 1 acceptance criteria: rows were written, allowlist/blocklist behavior was correct, and non-numeric states were excluded.

### Phase 2: Change detection (implemented with Claude Code)

With the MVP in place, Claude Code handled change-detection logic and tests. The core function is small:

```go
func ShouldWrite(current, last float64, epsilon float64, firstObservation bool) bool {
    if firstObservation {
        return true
    }
    return math.Abs(current-last) > epsilon
}
```

A subtle but important fix was using `>` instead of `>=`. With `epsilon=0`, `>=` would write unchanged values forever and defeat the feature.

Claude also generated table-driven tests for change detection and glob filtering, including floating-point boundary cases and malformed patterns.

Live verification:

```text
Poll 1: numeric=183 skipped=0   inserted=183
Poll 2: numeric=183 skipped=138 inserted=45
```

About 75% fewer writes on the second cycle.

### Phase 3: Operational hardening (implemented with Claude Code)

Phase 3 added production behavior:

- `/healthz` endpoint (fresh poll + DB reachable)
- Prometheus metrics at `/metrics`
- Minute-aligned polling (`:00` boundaries)
- Backpressure with `sync.Mutex.TryLock()`
- Graceful shutdown on `SIGTERM`

Minute alignment especially improved query consistency for time-bucketed analytics.

### Phase 4: Storage optimization (implemented with Claude Code)

Final phase was SQL-level optimization:

- Compression policy for chunks older than 7 days
- Retention policy dropping raw data after 90 days
- Continuous aggregate `ha_numeric_1h` with 15-minute refresh policy

We triggered a refresh and validated rollups:

```sql
SELECT bucket, entity_id, avg, min, max, n FROM ha_numeric_1h LIMIT 5;
```

Real data, real aggregates, working output.

## The project itself

The result of this plan is a new GitHub project: [acaylor/hass-poller][]

The project includes a `docker-compose.yml` to run the poller and a Postgresql server with TimescaleDB enabled.

## What I learned about AI-assisted engineering

### Bring a plan

A structured plan with goals, non-goals, and phases gives the agent something concrete to critique and implement. Phases give milestones where you can make adjustments without having an agent try and complete the whole project in "one shot".

### Make architecture calls explicitly

Saying things as simple as "drop heartbeat" or "use allowlist plus blocklist" narrows ambiguity and prevents wasted iteration by the models.

I highly recommend researching the tech stack that you want to use for a project. I know some people in 2026 advocate to not read the code at all but I want to at least understand my projects to know how they flow and know how to iterate on them. I went through several iterations of this project that included using Python, Typescript, and multiple Go services. Ultimately I went with this approach that is simple enough for me to understand and hopefully easy to maintain.

### Verify with real systems, not just tests

Unit tests mattered, but testing against real Home Assistant data and making real TimescaleDB queries were what built confidence. Documenting these "manual" tests that the models run such as SQL queries can help you learn more about the underlying system.

### Use agents as collaborators

Codex was strongest for shaping and delivering the MVP foundation quickly. Claude Code was effective at extending that foundation with tests, operational controls, and storage policies. The combined workflow was faster and better than either tool used in isolation.

For a solo user, having multiple agents is also a way you can continue working without having very expensive AI subscriptions or large bills for using a model directly via API.

Ultimately though I hope to settle on as few similar tools as possible but right now the AI tools are changing so frequently I have a desire to evaluate multiple options especially since Anthropic's Claude Code is closed source.

_Disclaimer: I used an LLM to help create this post. Opinions expressed are likely from me and not the LLM._
