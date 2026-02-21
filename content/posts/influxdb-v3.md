---
title: Store Metrics with InfluxDB v3
author: aj
date: 2026-02-21
description: 'This post is an introduction to influxdb version 3 which is a modern time series database for storing metrics. Tips for influxdb version 1 users are included to migrate to the new version. Examples for storing and querying data are included.'
categories:
  - Observability
tags:
  - telegraf
  - influxdb
  - metrics
  - javascript
---

Modern time-series data demands modern solutions. Whether you're monitoring server metrics, tracking IoT sensor data, or analyzing application performance, InfluxDB v3 Core combined with Telegraf provides a foundation for an Observability platform. In this post, we'll walk through setting up a complete monitoring stack using Docker Compose, querying data via HTTP API, and understanding the migration path from older InfluxDB versions.

I have not used InfluxDB a lot in my homelab but I have used it at my job to store custom business application metrics. Once you have millions of metrics to keep track of, a single database and disk will become a bottleneck. If you are not familiar with Telegraf and InfluxDB, check out [a previous post][1] for an introduction to these tools and InfluxDB version 1 (open-source version).

## **Prerequisites**

Before diving in, make sure you have:
- Docker and Docker Compose installed on your system. If you are not familiar with Docker, check out [a previous post][2] for an introduction to containers.
- Basic familiarity with command-line operations and HTTP APIs
- A text editor for configuration files
- `curl` or another HTTP client for testing
- About 20 minutes of your time

## **Understanding the Stack**

```text
Host system
  |
  v
Docker / Docker Compose
  |
  +--> influxdb3-explorer container
  |      - InfluxDB 3 Explorer UI on :80
  |      - admin mode
  |
  +--> telegraf container
  |      - collects host & Docker metrics
  |
  +--> influxdb3-core container
         - InfluxDB 3 Core TSDB
         - HTTP API on :8181

telegraf  --(HTTP write API)-->  influxdb3-core
browser   --(Explorer UI)-------> influxdb3-explorer --(API)--> influxdb3-core
```

InfluxDB 3 Core serves as your time-series database, while Telegraf acts as an agent for collecting, processing, and writing metrics. Think of Telegraf as your data collector and InfluxDB as your database. They work seamlessly together to capture and store your metrics.

**What's New in InfluxDB v3?**

InfluxDB 3 provides both modern v3 API endpoints for new workloads and backward-compatible v1/v2 endpoints, making migration from older versions simple. You can query using SQL or InfluxQL, with responses in JSON, JSONL, CSV, or Parquet formats.

## **Step 1: Create Your Project Structure**

First, let's organize the project files. Create a dedicated directory for an InfluxDB setup:

```bash
mkdir -p ~/influxdb-stack
cd ~/influxdb-stack
```

Inside this directory, we'll create subdirectories for our configurations and data:

```bash
mkdir -p telegraf config data
```

## **Step 2: Create the Docker Compose File**

In order to manage the containers we can set up a Docker Compose file. Create a file named `docker-compose.yml`:

```yaml
services:
  influxdb3-core:
    container_name: influxdb3-core
    image: influxdb:3-core
    ports:
      - "8181:8181"
    command:
      - influxdb3
      - serve
      - --node-id=node0
      - --object-store=file
      - --data-dir=/var/lib/influxdb3/data
      - --plugin-dir=/var/lib/influxdb3/plugins
    volumes:
      - ./data/influxdb:/var/lib/influxdb3/data
      - ./data/plugins:/var/lib/influxdb3/plugins
    healthcheck:
      test: ["CMD-SHELL", "pgrep influxdb3 >/dev/null || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    environment:
      - INFLUXDB_IOX_OBJECT_STORE=file

  influxdb3-explorer:
    container_name: influxdb3-explorer
    image: influxdata/influxdb3-ui:latest
    command:
      - --mode=admin
    depends_on:
      influxdb3-core:
        condition: service_healthy
    ports:
      - "80:80"
    restart: unless-stopped

  telegraf:
    container_name: telegraf
    image: telegraf:latest
    depends_on:
      influxdb3-core:
        condition: service_healthy
    environment:
      - INFLUXDB_HOST=http://influxdb3-core:8181
      - INFLUXDB_TOKEN=${INFLUXDB_TOKEN}
      - INFLUXDB_DATABASE=local_system
      - HOST_ETC=/hostfs/etc
      - HOST_PROC=/host/proc
      - HOST_SYS=/host/sys
      - HOST_MOUNT_PREFIX=/hostfs
    volumes:
      - ./telegraf/telegraf.conf:/etc/telegraf/telegraf.conf:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/hostfs:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped

```

**What's happening here?**
- InfluxDB 3 Core exposes port 8181 for HTTP API connections
- InfluxDB 3 Explorer runs in admin mode and is exposed on host port 80 (`http://localhost`)
- We're using file-based object storage for simplicity (suitable for development and small deployments)
- The healthcheck ensures Telegraf only starts after InfluxDB is ready
- Explorer and InfluxDB are on the same Compose network, so Explorer can connect to InfluxDB by service name (`http://influxdb3-core:8181`)
- Bind mounts (`./data/influxdb`) persist your data even if containers restart
- Docker socket access allows monitoring of container metrics (optional)
- The healthcheck uses `pgrep influxdb3` to verify the server process is running without generating repeated auth errors from unauthenticated `/health` probes
- If port 80 is already in use on your host, change the mapping to `8888:80` and open `http://localhost:8888` instead

## **Step 3: Configure Telegraf**

Telegraf needs to know what metrics to collect and where to send them. Create a Telegraf configuration file in the project's telegraf directory:

`./telegraf/telegraf.conf`

```toml
# Global Agent Configuration
[agent]
  interval = "10s"
  round_interval = true
  metric_batch_size = 1000
  metric_buffer_limit = 10000
  collection_jitter = "0s"
  flush_interval = "10s"
  flush_jitter = "0s"
  precision = "0s"
  hostname = "telegraf"
  omit_hostname = false

# Output Plugin - InfluxDB v2 API (compatible with InfluxDB 3)
[[outputs.influxdb_v2]]
  urls = ["${INFLUXDB_HOST}"]
  token = "${INFLUXDB_TOKEN}"
  organization = "primary"
  bucket = "${INFLUXDB_DATABASE}"
  timeout = "10s"
  user_agent = "telegraf"

# Input Plugin - Collect CPU metrics
[[inputs.cpu]]
  percpu = true
  totalcpu = true
  collect_cpu_time = false
  report_active = false

# Input Plugin - Collect disk usage
[[inputs.disk]]
  ignore_fs = ["tmpfs", "devtmpfs", "devfs", "iso9660", "overlay", "aufs", "squashfs"]

# Input Plugin - Collect disk I/O metrics
[[inputs.diskio]]

# Input Plugin - Collect memory usage
[[inputs.mem]]

# Input Plugin - Collect network statistics
[[inputs.net]]

# Input Plugin - Collect system load
[[inputs.system]]

## Optional: Docker metrics
# The docker input plugin options vary by Telegraf version.
# If you enable it, start with the minimal config below and
# adjust keys according to `telegraf --input-filter docker config`.
# [[inputs.docker]]
#   endpoint = "unix:///var/run/docker.sock"
#   gather_services = false
#   timeout = "5s"
```

**Configuration breakdown:**
- The `influxdb_v2` output plugin connects to the InfluxDB v2 HTTP API write endpoint included in InfluxDB 3 Core (v2 API is fully compatible); use organization `primary` unless you've created a different org
- Input plugins gather CPU, memory, disk, network, and Docker metrics
- Docker input is optional; plugin fields differ across Telegraf versions, so generate a version-correct stub with `telegraf --input-filter docker config` before enabling
- The agent collects metrics every 10 seconds by default
- Environment variables keep sensitive data out of the config file
- Host system mounts (`/proc`, `/sys`, `/`) enable Telegraf to collect accurate host metrics from within the container

## **Step 4: Create the Environment File**

Create a `.env` file in your project root to store configuration variables:

Add these variables:

```bash
INFLUXDB_TOKEN=your-token-will-go-here
INFLUXDB_DATABASE=local_system
```

**Note:** We'll generate the actual token in the next step. Leave the placeholder for now.

## **Step 5: Start InfluxDB and Generate Your Token**

Time to bring up InfluxDB. Start only the database service first:

```bash
docker compose up -d influxdb3-core
```

Wait about 10-15 seconds for the container to fully initialize. You can check the logs to verify it's ready:

```bash
docker compose logs influxdb3-core
```

Look for a message indicating the server is listening on port 8181.

Now create your admin token:

```bash
docker compose exec influxdb3-core influxdb3 create token --admin
```

Expected output:

```text
New token created successfully!

Token: apiv3_*******************************
HTTP Requests Header: Authorization: Bearer apiv3_*******************************

IMPORTANT: Store this token securely, as it will not be shown again.
```

Your token value will be different, but in current InfluxDB 3 Core images it should start with `apiv3_`.

**Important:** Copy this entire token string. you cannot retrieve it later if you lose it. Store it securely.

Copy this token and update your `.env` file.
Replace `your-token-will-go-here` with your actual token.

## **Step 6: Create Your Database**

Before Telegraf can write data, we need to create a database:

```bash
docker compose exec influxdb3-core influxdb3 create database local_system --token "$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)"
```

Or manually replace the token:

```bash
docker compose exec influxdb3-core influxdb3 create database local_system --token YOUR_TOKEN_HERE
```

Expected output:

```text
Database "local_system" created successfully
```

## **Step 7: Launch the Complete Stack**

Now that everything is configured, start all services:

```bash
docker compose up -d
```

Typical output:

```text
Network influxdb-stack_default  Created
Container influxdb3-core        Started
Container influxdb3-explorer    Started
Container telegraf              Started
```

Docker Compose will:
1. Ensure InfluxDB is healthy
2. Start Telegraf with your configuration
3. Start Explorer UI in admin mode
4. Begin collecting metrics immediately

## **Step 8: Connect with InfluxDB 3 Explorer (UI)**

Now let's connect to InfluxDB through the web UI.
If you want to cross-check against vendor docs, see the official [Explorer install guide][6] and [Explorer getting started guide][7].

1. Open Explorer in your browser:
   - `http://localhost` (or `http://localhost:80`)
   - If you remapped ports, use that host port instead (example: `http://localhost:8888`)
2. In Explorer, create a new server connection (for example, "Connect your first server" or "Add server")
3. Use these values:
   - **Name**: `local-core`
   - **URL**: `http://influxdb3-core:8181`
   - **Token**: the value of `INFLUXDB_TOKEN` from your `.env`
4. Save the server connection
5. Open the SQL editor and run:

```sql
SHOW TABLES
```

You should see measurements like `cpu`, `mem`, and `disk` once Telegraf has written data.

## **Step 9: Verify Data Collection with HTTP API**

Instead of using Docker exec commands, let's use the HTTP API directly. This is how you'll interact with InfluxDB in most situations. Check if Telegraf is writing data successfully.

[Here is a link to the official documentation][3] for the API

### **Query Using SQL (Modern v3 API)**

Use the `/api/v3/query_sql` endpoint to execute SQL queries with support for multiple output formats:

```bash
TOKEN=$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)
curl -G "http://localhost:8181/api/v3/query_sql" \
  --header "Authorization: Bearer $TOKEN" \
  --data-urlencode "db=local_system" \
  --data-urlencode "format=pretty" \
  --data-urlencode "q=SHOW TABLES"
```

Or manually replace `TOKEN` with your actual token.

Sample output:

```text
+---------------+--------------------+---------------------+------------+
| table_catalog | table_schema       | table_name          | table_type |
+---------------+--------------------+---------------------+------------+
| public        | iox                | cpu                 | BASE TABLE |
| public        | iox                | disk                | BASE TABLE |
| public        | iox                | diskio              | BASE TABLE |
| public        | iox                | mem                 | BASE TABLE |
| public        | iox                | net                 | BASE TABLE |
| public        | iox                | system              | BASE TABLE |
| public        | information_schema | tables              | VIEW       |
+---------------+--------------------+---------------------+------------+
```

You should see tables like:
- `cpu`
- `disk`
- `diskio`
- `mem`
- `net`
- `system`
- `docker` (if you enabled Docker monitoring)

Now let's query some actual CPU data:

```bash
TOKEN=$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)
curl -G "http://localhost:8181/api/v3/query_sql" \
  --header "Authorization: Bearer $TOKEN" \
  --data-urlencode "db=local_system" \
  --data-urlencode "format=pretty" \
  --data-urlencode "q=SELECT cpu, usage_user, time FROM cpu WHERE time >= now() - interval '5 minutes' ORDER BY time DESC LIMIT 10"
```

Sample output:

```text
+-----------+---------------------+---------------------+
| cpu       | usage_user          | time                |
+-----------+---------------------+---------------------+
| cpu0      | 0.0                 | 2025-12-03T04:58:10 |
| cpu10     | 0.10020040080160254 | 2025-12-03T04:58:10 |
| cpu1      | 0.10010010010009952 | 2025-12-03T04:58:10 |
| cpu2      | 0.10010010010009955 | 2025-12-03T04:58:10 |
| cpu-total | 0.05462988254575302 | 2025-12-03T04:58:10 |
+-----------+---------------------+---------------------+
```

### **Query Using InfluxQL (v1 Compatibility)**

For InfluxQL queries, use the `/api/v3/query_influxql` endpoint. This is useful if you're migrating from InfluxDB 1.x:

```bash
TOKEN=$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)
curl -G "http://localhost:8181/api/v3/query_influxql" \
  --header "Authorization: Bearer $TOKEN" \
  --data-urlencode "db=local_system" \
  --data-urlencode "format=json" \
  --data-urlencode "q=SELECT mean(usage_user) FROM cpu WHERE time > now() - 5m GROUP BY time(1m)"
```

Sample output:

```json
[
  {"iox::measurement":"cpu","time":"2025-12-03T04:55:00"},
  {"iox::measurement":"cpu","time":"2025-12-03T04:56:00"},
  {"iox::measurement":"cpu","time":"2025-12-03T04:57:00","mean":0.1437187856296443},
  {"iox::measurement":"cpu","time":"2025-12-03T04:58:00","mean":0.06065173427371059}
]
```

### **Query with POST Requests**

For complex queries, use POST requests with JSON:

```bash
TOKEN=$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)
curl -X POST "http://localhost:8181/api/v3/query_sql" \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "local_system",
    "q": "SELECT * FROM mem WHERE time >= now() - interval '\''5 minutes'\'' LIMIT 5",
    "format": "jsonl"
  }'
```

Sample output (JSON Lines):

```json
{"active":5194307584,"available":13240156160,"buffered":1418694656,"cached":9519296512,"time":"2025-12-03T04:58:10"}
{"active":5059809280,"available":13248094208,"buffered":1418694656,"cached":9522630656,"time":"2025-12-03T04:58:00"}
```

**Format Options:**
- `pretty` - Human-readable formatted output (great for manual queries)
- `jsonl` - JSON Lines, preferred for streaming results and programmatic processing
- `json` - Standard JSON format (good for structured data handling)
- `csv` - Comma-separated values (useful for spreadsheet import)
- `parquet` - Apache Parquet binary format (optimal for large dataset exports)

## **Understanding InfluxDB v1 Protocol Compatibility**

One of InfluxDB 3's biggest strengths is backward compatibility with v1 APIs, making migration seamless.

Here is a [link to the official documentation][4] for the API.

### **Writing Data Using v1 Protocol**

The `/write` endpoint provides backward compatibility for InfluxDB 1.x write workloads. This is perfect for existing applications or tools that use the v1 API.

**Write with Line Protocol:**

[Line protocol][5] is a text-based format for writing data points, containing measurement name, tags, fields, and timestamp:

```bash
TOKEN=$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)
curl -X POST "http://localhost:8181/write?db=local_system" \
  --header "Authorization: Token $TOKEN" \
  --header "Content-Type: text/plain" \
  --data-binary 'temperature,location=office,sensor=A value=23.5 1641024000000000000
temperature,location=office,sensor=B value=24.1 1641024000000000000'
```

Expected result: `HTTP 204 No Content (no body)`.

**Line Protocol Format:**

```txt
<measurement>[,<tag_key>=<tag_value>[,<tag_key>=<tag_value>]] <field_key>=<field_value>[,<field_key>=<field_value>] [<timestamp>]
```

**Example Breakdown:**

- `temperature` - Measurement/table name
- `location=office,sensor=A` - Tags (indexed for fast queries)
- `value=23.5` - Field (the actual data)
- `1641024000000000000` - Timestamp in nanoseconds (optional or the time of write request will be recorded)

### **Authentication Methods for v1 API**

InfluxDB 3 supports v1-style authentication through query string parameters:

```bash
# Using query parameter authentication (v1 style)
TOKEN=$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)
curl -X POST "http://localhost:8181/write?db=local_system&p=$TOKEN" \
  --header "Content-Type: text/plain" \
  --data-binary 'temperature,location=datacenter value=22.8'
```

The `u` (username) parameter is ignored, but accepted for compatibility.

Expected result: `HTTP 204 No Content`.


## **Migrating from InfluxDB v1 to v3**

If you're currently running InfluxDB 1.x, here's your migration path to v3.

### **Understanding Key Differences**

**Schema Changes:**
InfluxDB 3 enforces stricter schema restrictions than v1: you cannot use duplicate names for tags and fields, and measurements can contain up to 250 columns by default.

**Database Model:**
In InfluxDB v1, databases and retention policies were separate concepts; in InfluxDB 3, they're combined into a single database concept.

**Example Conversion:**
```
InfluxDB v1: database "mydb" with retention policy "30days"
InfluxDB v3: database "mydb_30days" or "mydb"
```

### **Schema Validation Before Migration**

Before migrating, check your v1 schema for issues:

```bash
# In InfluxDB v1, check for duplicate tag/field names
influx -execute 'SHOW FIELD KEYS FROM "measurement_name"' -database="mydb"
influx -execute 'SHOW TAG KEYS FROM "measurement_name"' -database="mydb"
```

Look for any names that appear in both lists, these need to be renamed.

Example output (abbreviated):

```text
name: measurement_name
fieldKey  fieldType
-------   ---------
value     float
status    string

name: measurement_name
tagKey
------
host
region
```

## **Advanced HTTP API Features**

### **Health Check Endpoint**

Monitor your InfluxDB instance status:

```bash
# Without auth, this typically returns 401
curl -i http://localhost:8181/health

# With auth, expect 200
TOKEN=$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)
curl -i http://localhost:8181/health \
  --header "Authorization: Bearer $TOKEN"
```

Typical responses:
```
HTTP/1.1 401 Unauthorized
content-length: 0

HTTP/1.1 200 OK

OK
```

### **Batch Writes for Performance**

Send multiple measurements in a single request:

```bash
TOKEN=$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)
curl -X POST "http://localhost:8181/write?db=local_system" \
  --header "Authorization: Token $TOKEN" \
  --header "Content-Type: text/plain" \
  --data-binary 'cpu,host=server01 usage=45.2
mem,host=server01 used_percent=67.8
disk,host=server01 free=500000000000i
cpu,host=server02 usage=23.1
mem,host=server02 used_percent=45.3
disk,host=server02 free=750000000000i'
```

### **Parameterized Queries**

The SQL HTTP endpoint in current InfluxDB 3 Core images accepts **named** query parameters through a `params` object:

```bash
TOKEN=$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)
curl -X POST "http://localhost:8181/api/v3/query_sql" \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "db": "local_system",
    "q": "SELECT * FROM temperature WHERE location = $loc LIMIT 5",
    "params": {"loc": "office"},
    "format": "json"
  }'
```

If you omit a required named parameter, you'll get an error like `No value found for placeholder with name $loc`.

## **Monitoring and Troubleshooting**

### **Check API Connectivity**

```bash
# Test connection
curl -v http://localhost:8181/health

# Test authentication
TOKEN=$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)
curl -G "http://localhost:8181/api/v3/query_sql" \
  --header "Authorization: Bearer $TOKEN" \
  --data-urlencode "db=local_system" \
  --data-urlencode "q=SELECT 1"
```

### **Common HTTP Error Codes**

- **401 Unauthorized**: Invalid token or missing authorization header (check your `.env` file)
- **404 Not Found**: Database doesn't exist or incorrect endpoint URL
- **400 Bad Request**: Malformed query syntax or invalid line protocol format
- **413 Payload Too Large**: Write batch exceeds size limit (split into smaller batches)
- **429 Too Many Requests**: Rate limit exceeded (reduce write frequency or batch size)


### **Viewing Logs**

```bash
# Follow logs in real-time
docker compose logs -f

# Check for specific errors
docker compose logs | grep -i error # or rg -i if you have ripgrep
```

## **Production Best Practices**

### **Security Considerations**

1. **Never expose tokens in URLs**: Use Authorization headers instead (URLs may be logged)
2. **Use HTTPS in production**: Configure TLS certificates to encrypt data in transit
3. **Rotate tokens regularly**: Create new tokens periodically and invalidate old ones for better security
4. **Principle of least privilege**: Create separate tokens with read-only or write-only permissions as needed


### **Performance Optimization**

1. **Batch writes**: Send 5,000-10,000 points per request
2. **Use coarser timestamp precision**: Improves compression
3. **Choose appropriate tags**: High-cardinality tags can impact performance
4. **Index strategy**: Tags are indexed, fields are not

---

## **Integration Examples**

There are client libraries for writing to InfluxDB but you can also use more simple libraries for sending web requests to the InfluxDB API. Here are some examples of how to send metrics directly to the InfluxDB API.


### **JavaScript/Node.js Example**

I do not have many if any posts with JavaScript code as of this post but we use TypeScript at my current job for full-stack applications so I am including it in this post to help me practice a bit. If you are not familiar, basically Node.js is a JavaScript run-time that implements the same engine as all browsers that use v8/Chromium code as a base. This lets you run your JavaScript applications on a server that you control instead of requiring something like a web browser to execute the code.

First, install the required dependency:

```bash
npm install axios
```

The `npm` command is the Nodejs package manager that will install libraries that you need for your code/project.

Next create a JavaScript file:

```javascript
const axios = require('axios');

const INFLUXDB_URL = 'http://localhost:8181';
const TOKEN = process.env.INFLUXDB_TOKEN || 'YOUR_TOKEN_HERE';
const DATABASE = 'local_system';

// Write data
async function writeData() {
  const url = `${INFLUXDB_URL}/write?db=${DATABASE}`;
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'text/plain'
  };
  
  const data = `temperature,location=room2 value=23.8 ${Date.now() * 1000000}`;
  
  const response = await axios.post(url, data, { headers });
  console.log(`Write status: ${response.status}`);
}

// Query data
async function queryData() {
  const url = `${INFLUXDB_URL}/api/v3/query_sql`;
  const headers = { 'Authorization': `Bearer ${TOKEN}` };
  const params = {
    db: DATABASE,
    q: 'SELECT * FROM temperature ORDER BY time DESC LIMIT 10',
    format: 'json'
  };
  
  const response = await axios.get(url, { headers, params });
  return response.data;
}

// Run examples
(async () => {
  await writeData();
  const results = await queryData();
  console.log(results);
})();
```

Sample output:

```text
write status 204
[
  { location: 'room2', time: '2025-12-03T14:18:13.416', value: 23.8 },
  { location: 'room1', time: '2025-12-03T14:17:42.260966912', value: 22.5 }
]
```

**How this example works**
- `axios`: a compact HTTP client with promise-based calls and built-in JSON parsing.
- Tokens stay in `process.env` (load with tools like `dotenv`) so you don't hardcode secrets.
- `Date.now() * 1_000_000` turns milliseconds into nanoseconds; change the multiplier if you set `precision=ms` on writes.
- The write uses the v1 `/write` path for compatibility; the query uses the SQL endpoint with `format=json` for easy JS consumption.
- The async IIFE keeps the file runnable on Node 18+ without ESM-handy for drop-in scripts or serverless functions.

### **Bash Monitoring Script**

You can even generate metrics with a bash script that perhaps runs on a cron job every so often.

```bash
#!/bin/bash

# Load token from .env file
TOKEN=$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)

# Monitor CPU usage and send to InfluxDB
while true; do
  if [[ "$(uname)" == "Darwin" ]]; then
    # macOS top output differs from Linux
    CPU_USAGE=$(top -l 1 | awk -F'[:, ]+' '/CPU usage/ {print $3}' | tr -d '%')
  else
    CPU_USAGE=$(top -bn1 | awk '/Cpu\(s\)/ {print $2}' | cut -d'%' -f1)
  fi
  TIMESTAMP=$(date +%s)000000000
  
  curl -X POST "http://localhost:8181/write?db=local_system" \
    --header "Authorization: Bearer $TOKEN" \
    --header "Content-Type: text/plain" \
    --data-binary "custom_cpu,host=$(hostname) usage=${CPU_USAGE} ${TIMESTAMP}"
  
  sleep 10
done
```

**How this example works**
- `grep INFLUXDB_TOKEN .env | cut -d'=' -f2` reuses the same token managed by Docker Compose, keeping secrets in one place.
- `top` output differs by OS, so the script uses `uname` to choose a Linux (`top -bn1`) or macOS (`top -l 1`) parser.
- `date +%s` returns epoch seconds; appending `000000000` converts them to nanoseconds for InfluxDB's default precision.
- The curl call posts line protocol to `/write?db=local_system` with `Bearer` auth-v3 accepts this v1-style path.
- A 10-second loop is light enough for cron/systemd timers while still producing a steady time series.

## **Managing Your Stack**

### **Useful Docker Commands**

```bash
# View all logs
docker compose logs -f

# Restart specific service
docker compose restart telegraf

# Stop all services
docker compose down

# Stop and remove all data (WARNING: destructive)
docker compose down -v

# Update to latest images
docker compose pull
docker compose up -d

# Check resource usage
docker stats influxdb3-core telegraf
```

### **Database Management**

```bash
# List all databases
TOKEN=$(grep INFLUXDB_TOKEN .env | cut -d'=' -f2)
docker compose exec influxdb3-core influxdb3 show databases --token "$TOKEN"

# Create a new database
docker compose exec influxdb3-core influxdb3 create database \
  production --token "$TOKEN"

# Delete a database (be careful!)
# Prompts for confirmation
docker compose exec influxdb3-core influxdb3 delete database \
  test_db --token "$TOKEN"

# Non-interactive form for scripts/automation
printf 'yes\n' | docker compose exec -T influxdb3-core influxdb3 delete database \
  test_db --token "$TOKEN"
```

## **What's Next?**

Now that you have a working InfluxDB v3 setup with HTTP API access, you can:

1. **Add Grafana** for dashboards and visualizations of the metrics in InfluxDB
2. **Implement alerting** using the HTTP API to check thresholds
3. **Scale horizontally** by adding more Telegraf agents across your infrastructure
4. **Explore advanced SQL queries** with joins, window functions, and aggregations
5. **Integrate with applications** using HTTP APIs in your preferred language
6. **Set up continuous migration** from InfluxDB v1 using Telegraf
7. **Implement data retention policies** to manage storage costs

## **Conclusion**

You've successfully deployed InfluxDB 3 Core with Telegraf and learned how to interact with it using modern HTTP APIs. The v1 protocol compatibility ensures you can migrate existing applications, while the new v3 SQL capabilities provide powerful querying options for modern workloads.

Whether you're monitoring a single server, migrating from InfluxDB v1, or managing thousands of IoT devices, the example from today can be scaled out easily. At work we use AWS s3 storage as a backend and a single container handles millions of active metrics.

---

_Disclaimer: I used an LLM to help create this post. Opinions expressed are likely from me and not the LLM._

 [1]: /posts/influxdbv1/
 [2]: /posts/containers/
 [3]: https://docs.influxdata.com/influxdb3/core/query-data/execute-queries/influxdb-v3-api
 [4]: https://docs.influxdata.com/influxdb3/core/api/v3
 [5]: https://docs.influxdata.com/influxdb3/core/reference/line-protocol
 [6]: https://docs.influxdata.com/influxdb3/explorer/install/
 [7]: https://docs.influxdata.com/influxdb3/explorer/get-started/
