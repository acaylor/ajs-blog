---
title: Container updates with n8n + Gitea
author: aj
image: /images/docker_logo.png
date: 2025-10-12
categories:
  - Containers
tags:
  - containers
  - docker
  - n8n
  - gitea

---


I have tried many tools to manage containers. I keep coming back to Docker for the user experience. If you are not familiar with containers or Docker, check out [a post][1] for an introduction. While most containers in my homelab are now in [Kubernetes][2], I still manage some containers with Docker compose. My DNS servers are 2 Raspberry Pi with a VM as 3rd DNS server. They also have reverse proxy servers deployed as containers (like [nginx][3], [caddy][4], etc.). So I built a workflow to manage those as containers. I do not want these DNS servers to be part of the k8s cluster and I want them to be able to start up without having dependencies on an external system. I want to have a functioning network if there is 1 DNS server online or all 3 are online. [I am using Adguard Home][5] to manage DNS queries in my Homelab.

I'm going to set up a workflow to automatically deploy Docker Compose apps when changes are pushed to the `main` branch of a self-hosted [Gitea][6] repository. To do this, I am going to use an open source tool n8n. Check out [a previous post][7] for a less complicated introduction to n8n.


## n8n workflow Setup Instructions:

_Note: This workflow is tailored to my setup so the n8n UI may change slightly but I believe this guidance should you want to create a similar workflow._

### 1. **Set Up SSH Access on Remote Server**

On your Docker server, create a deploy user with Docker permissions:

```bash
# Create deploy user
sudo useradd -m -s /bin/bash deploy

# Add to docker group
sudo usermod -aG docker deploy

# Create deployments directory or use an existing
sudo mkdir -p /opt/deployments
sudo chown -R deploy:deploy /opt/deployments
```

### 2. **Generate SSH Key Pair**

On your n8n server (or locally):

```bash
ssh-keygen -t ed25519 -C "n8n-deploy" -f ~/.ssh/n8n_deploy_key
```

Copy the public key to your remote server:

```bash
ssh-copy-id -i ~/.ssh/n8n_deploy_key.pub deploy@your-docker-server.com
```

The other way is to put the value of the public key in this file on the deploy user's home dir: `~/.ssh/authorized_keys`

The private key will be need to be added to n8n.

### 3. **Configure n8n SSH Credentials**

In n8n:
- Go to **Credentials** → **Add First/New Credential**
- Select/search for: **SSH Private Key**
- Name it: `SSH Deploy Key` or for specific hosts, `$hostname ssh deploy key`
- Paste your private key content from `~/.ssh/n8n_deploy_key`
- Save it

### 4. **Create Workflow**

This next step is to create the workflow. Here I am using Discord notifications at the end but that could just as easily be swapped for Slack.

Create a new workflow in n8n and add the following nodes:

**a. Webhook Node**
- Add a **Webhook** node
- Set **HTTP Method** to `POST`
- Set **Path** to `gitea-webhook`
- Set **Respond** to "Using 'Respond to Webhook' Node"

**b. IF Node - Check Main Branch**
- Add an **IF** node
- Set **Value 1** to `{{ $json.body.ref }}`
- Set **Operation** to "Equals"
- Set **Value 2** to `refs/heads/main`

**c. Respond to Webhook - Ignored**
- Add a **Respond to Webhook** node connected to the **FALSE** output
- Set **Respond With** to "JSON"
- Set **Response Body** to: `{{ { "status": "ignored", "message": "Not main branch", "branch": $json.body.ref } }}`

**d. SSH Node - Update Repository**
- Add an **SSH** node connected to the **TRUE** output
- Select your SSH credential
- Set **Command** to: `cd /opt/containers && ./update-containers.sh || exit 1`
- Set **Working Directory** to `/home/deploy`

**e. IF Node - Check Success**
- Add another **IF** node
- Set **Value 1** to `{{ $json.code }}`
- Set **Operation** to "Equals" (number)
- Set **Value 2** to `0`

**f. Discord Node - Success** (Optional)
- Add a **Discord** node connected to the **TRUE** output
- Set **Content** to: `Docker n8n deployment completed successfully from Gitea repo: {{ $('Check Main Branch').item.json.body.repository.full_name }}`

**g. Discord Node - Failure** (Optional)
- Add a **Discord** node connected to the **FALSE** output
- Set **Content** to: `**ERROR:** Docker n8n deployment failed from Gitea repo: {{ $('Check Main Branch').item.json.body.repository.full_name }}\n\nSee output:\n{{ $('SSH: Update Repository').item.json.stderr }}`

### 5. **Set Up Gitea Webhook**

In your Gitea repository:
- **Settings** → **Webhooks** → **Add Webhook** → **Gitea**
- **Target URL**: Your n8n webhook URL
- **HTTP Method**: `POST`
- **Content Type**: `application/json`
- **Trigger On**: Push events
- Save

_Make sure that you configure Gitea to allow a webhook connection from n8n. There is an env var `ALLOWED_HOST_LIST` that you need to update to use webhooks._

### 6. **Test the Deployment**

Test the webhook by using the "Test Delivery" button in the Gitea webhook settings. N8n has a test webhook endpoint that can also be used to play around with the workflow before you activate the workflow for "production".

Activate the workflow and push a change to your main branch when everything looks good.

## What This Workflow Does:

1. **Receives webhook** from Gitea on push
2. **Checks if main branch** (ignores other branches)
3. **Runs deployment script** via SSH (`./update-containers.sh`)
4. **Checks exit code** to determine success or failure
5. **Sends Discord notification** with deployment status
6. **Responds to Gitea** with appropriate status

![n8n_docker_workflow](/images/n8n_docker_workflow.png)

Discord notifications are optional. Success notifications can be disabled if too noisy. Here is an example notification in a channel. Slack would use a similar format:

![n8n_docker_workflow_discord](/images/n8n_docker_workflow_discord.png)

## Update container script

Instead of having n8n or another system run a bunch of commands, here is a bash script that will pull changes from git remote origin and update each docker compose file in a single step. The script assumes we start in a top level directory and that each docker compose stack is a sub-directory with a yaml file.

Assuming that we put our git repo in /opt/containers, create a script in the git repo `update-containers.sh` to match the invocation in the n8n SSH command step.

```bash
#!/usr/bin/env bash

set -euo pipefail
shopt -s nullglob

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

echo "Updating repository..."
git pull --ff-only

for compose_file in "${ROOT_DIR}"/*/docker-compose.yml; do
  svc_dir="$(dirname "${compose_file}")"
  svc_name="$(basename "${svc_dir}")"
  echo
  echo "Running docker compose for ${svc_name}..."
  (
    cd "${svc_dir}"
    docker compose pull
    docker compose up -d
  )
done

echo
echo "Deployment complete."

```

This script can be executed on the terminal or by n8n.

## Additional Tips:

**For private Gitea repositories**, add a deploy key on the remote server to facilitate the `git pull` command in the SSH deployment.

```bash
ssh deploy@your-docker-server.com
ssh-keygen -t ed25519 -f ~/.ssh/gitea_deploy
cat ~/.ssh/gitea_deploy.pub
```

Add the .pub (public key) to Gitea repo → Settings → Deploy Keys

**Test SSH connection** from n8n:
```bash
ssh -i ~/.ssh/n8n_deploy_key deploy@your-docker-server.com
```

**Multiple servers?** Duplicate the workflow and change the host in each SSH node to deploy to different servers.

 [1]: /posts/containers/
 [2]: /posts/kubernetes/
 [3]: /posts/nginx/
 [4]: /posts/caddy/
 [5]: /posts/adguard-home/
 [6]: /posts/gitea/
 [7]: /posts/n8n/