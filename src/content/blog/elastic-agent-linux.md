---
title: Monitor Your Linux System with the Elastic agent
author: aj
image: /images/elastic_logo.png
date: 2025-11-18
draft: true
categories:
  - Observability
tags:
  - elasticsearch
  - database
  - metrics
  - logging
---

Running Docker containers on Linux? Great choice! But are you keeping tabs on what's happening under the hood? In this guide, we'll walk you through setting up comprehensive monitoring for your Linux Docker host using the Elastic Stack. You'll be able to track container performance, system metrics, and logs—all from beautiful, prebuilt dashboards.

By the end of this tutorial, you'll have real-time visibility into your Docker environment, complete with the ability to spot performance issues before they become problems.

## What You'll Need Before Starting

Let's make sure you have everything in place before we dive in.

### Your Elastic Environment

You'll need one of these setups:

**Option 1: Elastic Cloud (Recommended for Beginners)**

- Sign up for a free trial at [cloud.elastic.co](https://cloud.elastic.co/registration)
- Everything is managed for you—perfect if you want to get started quickly

**Option 2: Self-Hosted Elastic Stack**

- Elasticsearch cluster (for storing your data)
- Kibana (for visualizing and managing everything)
- You can run these on separate servers or even in Docker containers themselves

**Option 3: Elastic Observability Serverless**

- The newest option—fully serverless, scales automatically
- Create a project at [cloud.elastic.co](https://cloud.elastic.co/)

(screenshot)

### User Permissions

Make sure your Elastic user has the right access level:

- **For Elastic Cloud/Stack**: You need the `superuser` role OR these specific privileges:
  - Cluster: `monitor` and `manage_own_api_key`
  - Index: `auto_configure` and `create_doc` for `logs-*-*` and `metrics-*-*`
  - Kibana Fleet: `all` permissions

- **For Serverless**: You need the **Admin** role or higher

### On Your Linux Docker Host

- **Root/sudo access**: The installation script needs elevated privileges
- **Linux OS**: This guide is specifically for Linux systems (sorry, the auto-detection script doesn't support Windows)
- **Docker running**: Obviously! Whether you're running Docker Engine or Docker CE, we've got you covered

## Understanding What Gets Monitored

Before we install anything, let's talk about what Elastic Agent will collect from your Docker host:

### Docker Container Metrics

- CPU usage per container
- Memory consumption and limits
- Network I/O statistics
- Container health status
- Disk I/O operations

### Docker Container Logs

- stdout and stderr from all running containers
- Container lifecycle events (start, stop, restart)

### System-Level Metrics

- Overall CPU utilization
- Memory and swap usage
- Disk space and I/O
- Network traffic across all interfaces
- System load averages

### System Logs

- `/var/log/syslog` or `/var/log/messages`
- Authentication logs
- Kernel messages

Pretty comprehensive, right? The best part is that Elastic Agent auto-detects most of this for you.

## Important Limitations to Know

Before we proceed, here are a few gotchas:

⚠️ **Docker Desktop Users**: If you're running Docker Desktop on Linux (not Docker Engine), the auto-detection won't work perfectly because Docker Desktop runs in a VM. This guide is optimized for native Docker Engine installations.

⚠️ **Custom Log Paths**: The script will find Docker's default log locations, but if you've configured custom logging drivers or paths, you'll need to add those manually.

⚠️ **lsof Requirement**: The script uses the `lsof` command to detect log files. Make sure it's installed:

```bash
sudo apt-get install lsof  # For Debian/Ubuntu
sudo yum install lsof       # For RHEL/CentOS
```

## Step 1: Access the Installation Interface

Let's get started with the actual setup!

### For Elastic Stack or Cloud:

1. Log into your Kibana instance
2. Navigate to the main menu (☰) in the top-left corner
3. Click on **Observability**
4. Click the **Add Data** button

(screenshot)

### For Serverless:

1. Open your Elastic Observability Serverless project
2. You'll see **Add Data** prominently on the main page
3. Click it to begin

(screenshot)

## Step 2: Choose Your Integration

Now you'll select what you want to monitor:

1. Under the section **"What do you want to monitor?"**, look for **Host**
2. Click on **Host** to expand the options
3. Select **Elastic Agent: Logs & Metrics**

This option uses the intelligent auto-detection script that will scan your system and configure everything automatically.

(screenshot)

## Step 3: Get Your Installation Command

Here's where the magic happens. Elastic will generate a custom installation command just for you.

1. You'll see a pre-populated command in a code block
2. Click the **Copy to clipboard** button (it looks like two overlapping squares)

The command will look something like this:

```bash
curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.x.x-linux-x86_64.tar.gz
tar xzvf elastic-agent-8.x.x-linux-x86_64.tar.gz
cd elastic-agent-8.x.x-linux-x86_64
sudo ./elastic-agent install --url=https://your-deployment-url:443 --enrollment-token=your-token-here
```

**Don't run it yet!** We need to prepare your host first.

(screenshot)

## Step 4: Prepare Your Linux Docker Host

Before running the installation, let's make sure everything is ready:

### Check if Elastic Agent is Already Installed

If you've previously experimented with Elastic Agent, you'll want to remove it first:

```bash
sudo elastic-agent uninstall
```

If the uninstall command hangs or fails, don't worry—the installer can force a reinstall. We'll use the `--force` flag if needed.

### Verify Docker is Running

Quick sanity check:

```bash
sudo docker ps
```

You should see a list of your running containers (or an empty list if nothing's running yet). If you get an error, start Docker first:

```bash
sudo systemctl start docker
sudo systemctl enable docker  # Make sure it starts on boot
```

### Check Available Disk Space

Elastic Agent needs some space for the binary and temporary files:

```bash
df -h /
```

Make sure you have at least 500MB free on your root partition.

## Step 5: Run the Installation Command

Now for the exciting part! Open a terminal on your Linux Docker host and paste the installation command you copied earlier.

```bash
# Paste your command here - it will look like the example from Step 3
```

### What Happens During Installation

The script will:

1. **Download** the auto-detection script and Elastic Agent binary
2. **Scan your system** for running services, log files, and Docker containers
3. **Detect** Docker and configure the Docker integration automatically
4. **Install** Elastic Agent as a system service
5. **Enroll** the agent with your Elastic deployment

You'll see output similar to this:

```
Downloading Elastic Agent...
Elastic Agent downloaded successfully
Starting system scan...
Detected services: Docker, System
Detected log files: /var/log/syslog, /var/log/auth.log
Scanning Docker containers...
Found 5 running containers
Installing Elastic Agent...
Elastic Agent installed successfully
Enrolling agent...
Successfully enrolled agent
```

(screenshot)

## Step 6: Review and Confirm Log Files

Here's where you get to make decisions! After scanning, the script will present a list of detected log files:

```
The following log files were detected:
  /var/log/syslog
  /var/log/auth.log
  /var/log/docker.log
  /var/log/custom-app/*.log

Ingest all detected logs? (Y/n):
```

### Your Options:

**Option A: Accept Everything (Recommended)**

- Type `Y` and press Enter
- All detected logs will be ingested
- This is the easiest option and works great for most setups

**Option B: Customize Your Selection**

- Type `n` and press Enter
- You'll be prompted to exclude specific logs or add additional paths
- Useful if you have custom application logs in non-standard locations

### For Docker-Specific Logs

If you have custom logging configurations for your Docker containers, this is your chance to add them:

```
Do you want to specify additional log paths? (y/N): y
Enter log path (or press Enter to finish): /var/lib/docker/containers/*/*.log
Enter log path (or press Enter to finish): [press Enter]
Confirm selections? (Y/n): Y
```

After confirmation, the agent will complete the installation:

```
Configuring Elastic Agent...
Starting Elastic Agent service...
Elastic Agent is configured and running.
```

(screenshot)

## Step 7: Verify the Installation

Let's make sure everything is working correctly.

### Check Agent Status

Run this command to verify Elastic Agent is running:

```bash
sudo elastic-agent status
```

You should see output indicating the agent is **healthy** and **connected**:

```
Status: HEALTHY
Message: Running
Components:
  docker-default: HEALTHY
  system-default: HEALTHY
  log-default: HEALTHY
```

### Check Docker Container Discovery

To see if Elastic Agent detected your Docker containers:

```bash
sudo docker ps --format "table {{.Names}}\t{{.Status}}"
```

All running containers should start appearing in your Elastic deployment within 1-2 minutes.

(screenshot)

## Step 8: Explore Your Data in Kibana

Now for the payoff—let's see your data!

### Navigate to Your Dashboards

Back in Kibana (where you got the installation command), you should see a **"Visualize your data"** section appear. This section shows links to prebuilt dashboards based on what was detected.

For a Docker host, you'll typically see:

1. **Docker Dashboard** - Container-specific metrics and logs
2. **System Dashboard** - Host-level system metrics
3. **Custom .log files** - Link to Discover for any custom logs

Click on **Docker** to open the Docker monitoring dashboard.

(screenshot)

### The Docker Dashboard: Your New Best Friend

The Docker dashboard gives you instant visibility into:

**Container Overview Panel**

- Number of running containers
- CPU usage distribution across containers
- Memory consumption per container
- Network I/O rates

**Container Health**

- Containers using >80% of their memory limits (highlighted in red)
- Containers with high CPU usage
- Container restart counts
- Recently stopped or failed containers

**Resource Trends**

- CPU usage over time (helps spot patterns)
- Memory trends
- Network traffic patterns
- Disk I/O patterns

(screenshot)

### The System Dashboard

Click on **System** in the "Visualize your data" section to see:

- **CPU Usage**: Per-core utilization and system-wide averages
- **Memory**: Used vs. available, swap usage
- **Disk I/O**: Read/write operations and throughput
- **Network**: Inbound/outbound traffic across all interfaces
- **Load Average**: 1-minute, 5-minute, and 15-minute averages

This dashboard helps you understand if your Docker host itself has enough resources.

(screenshot)

## Step 9: Explore the Infrastructure UI

Want a more detailed view? The Infrastructure UI is perfect for deep dives.

1. In Kibana, navigate to **Observability** → **Infrastructure** → **Inventory**
2. You'll see a visual map of your infrastructure
3. Click the **Show** dropdown and select **Hosts**
4. Find your Docker host in the list—it will show up with its hostname

Click on your host to see:

- Real-time metrics
- Active alerts
- Running processes
- Container list
- Metadata and configuration

(screenshot)

### Filter by Docker Containers

To focus specifically on Docker containers:

1. In the Infrastructure UI, change the view from **Hosts** to **Docker Containers**
2. You'll see each container as a hexagon
3. Hexagons change color based on resource usage:
   - Green: Healthy, normal usage
   - Yellow: Moderate resource usage
   - Red: High resource usage or problems

Click any container to drill into its specific metrics and logs.

(screenshot)

## Step 10: Set Up Alerts (Optional but Recommended)

Why wait for problems to get worse? Let's set up alerts!

### Create a Docker Container CPU Alert

1. In Kibana, go to **Observability** → **Alerts**
2. Click **Create rule**
3. Select **Inventory** rule type
4. Configure:
   - **For**: `Docker containers`
   - **When**: `CPU usage`
   - **Is above**: `80%`
   - **For the last**: `5 minutes`

5. Under **Actions**, choose how to get notified:
   - Email
   - Slack
   - PagerDuty
   - Webhook
   - Or any other connector

6. Click **Save**

(screenshot)

### Create a Memory Usage Alert

Follow the same steps, but set:

- **When**: `Memory usage`
- **Is above**: `90%`
- **For the last**: `5 minutes`

### Create a Container Status Alert

Want to know immediately when a container stops?

1. Create rule → **Inventory**
2. **For**: `Docker containers`
3. **When**: `Container status`
4. **Is**: `stopped` or `paused`
5. Set your notification method

Now you'll be alerted before small issues become outages!

## Advanced Tips and Tricks

### Rescanning Your Host

Need to add new services or containers? No problem! The auto-detection script is saved on your system:

```bash
cd /opt/Elastic/Agent
sudo ./auto_detect.sh
```

It will scan again and detect any new log files or services.

### Viewing Live Container Logs

Want to see logs from a specific container in real-time?

1. Go to **Observability** → **Logs** → **Stream**
2. Add a filter: `container.name: "your-container-name"`
3. Enable live streaming (play button in the top-right)

Watch your logs flow in real-time—perfect for debugging!

(screenshot)

### Custom Log Parsing

If your containers output structured logs (JSON), Elastic automatically parses them. But for custom formats, you can:

1. Go to **Stack Management** → **Ingest Pipelines**
2. Create a custom pipeline with grok patterns
3. Apply it to your log integration

### Adding More Hosts

Want to monitor multiple Docker hosts?

Simply run the installation command on each host. They'll all report to the same Elastic deployment, and you can:

- Compare performance across hosts
- See which host is the bottleneck
- Track your entire container fleet in one place

## Troubleshooting Common Issues

### Agent Shows as Offline

**Check the service status:**

```bash
sudo systemctl status elastic-agent
```

**Restart if needed:**

```bash
sudo systemctl restart elastic-agent
```

**Check connectivity:**

```bash
curl -I https://your-elastic-deployment-url:443
```

### No Docker Data Appearing

**Verify Docker integration is enabled:**

```bash
sudo elastic-agent inspect | grep docker
```

**Check Docker socket permissions:**

```bash
sudo ls -l /var/run/docker.sock
sudo usermod -aG docker elastic-agent
sudo systemctl restart elastic-agent
```

### High Memory Usage by Elastic Agent

If Elastic Agent itself is using too much memory:

1. Edit `/opt/Elastic/Agent/elastic-agent.yml`
2. Reduce log ingest rate with settings like:
   ```yaml
   outputs:
     default:
       bulk_max_size: 1000
   ```
3. Restart the agent

### Missing Custom Container Logs

If you're using a custom Docker logging driver (like `json-file` with a non-standard path):

1. Rerun the auto-detect script
2. When prompted, add your custom log path:
   ```
   /var/lib/docker/containers/*/*-json.log
   ```

## What's Next?

Congratulations! You now have full observability into your Linux Docker host. Here are some next steps to level up:

### Enhance Your Monitoring

- **[Set up anomaly detection](https://www.elastic.co/docs/solutions/observability/infra-and-hosts/detect-metric-anomalies)**: Let machine learning identify unusual patterns automatically

- **[Enable log pattern analysis](https://www.elastic.co/docs/explore-analyze/machine-learning/machine-learning-in-kibana/xpack-ml-aiops#log-pattern-analysis)**: Find common error patterns across your containers

- **[Create custom dashboards](https://www.elastic.co/docs/kibana/dashboards)**: Tailor views for your specific applications

### Integrate More Data Sources

Already monitoring Docker? Why stop there:

- Add APM (Application Performance Monitoring) to track your app performance
- Enable uptime monitoring for external endpoints
- Integrate AWS/GCP/Azure metrics if you're in the cloud

### Optimize Your Data Lifecycle

Control costs and performance:

1. Go to **Stack Management** → **Index Lifecycle Management**
2. Set up policies to:
   - Roll over indices when they reach certain sizes
   - Delete old data after 30/60/90 days
   - Move old data to cheaper storage tiers

## Wrapping Up

You've just transformed your Linux Docker host from a black box into a fully observable system. You can now:

✅ See real-time metrics for every container  
✅ Track system resource usage  
✅ Search through all your logs in one place  
✅ Get alerted before problems escalate  
✅ Identify performance bottlenecks quickly

The Elastic Stack's auto-detection made it easy to get started, but you now have a foundation to build on. As your containerized infrastructure grows, your monitoring will scale right alongside it.

Happy monitoring! 🐳📊

---

## Quick Reference Commands

```bash
# Check Elastic Agent status
sudo elastic-agent status

# Restart Elastic Agent
sudo systemctl restart elastic-agent

# View Elastic Agent logs
sudo journalctl -u elastic-agent -f

# Rerun auto-detection
cd /opt/Elastic/Agent && sudo ./auto_detect.sh

# Uninstall Elastic Agent
sudo elastic-agent uninstall

# Force reinstall
sudo elastic-agent uninstall --force
sudo ./elastic-agent install --url=<url> --enrollment-token=<token> --force
```

## Additional Resources

- [Elastic Observability Documentation](https://www.elastic.co/docs/solutions/observability)
- [Docker Integration Reference](https://www.elastic.co/docs/integrations/docker)
- [Infrastructure Monitoring Guide](https://www.elastic.co/docs/solutions/observability/infra-and-hosts/analyze-infrastructure-host-metrics)
- [Elastic Community Forums](https://discuss.elastic.co/c/observability)
