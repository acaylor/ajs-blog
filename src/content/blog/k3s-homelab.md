---
title: k3s kubernetes cluster
author: aj
date: 2026-03-08

categories:
  - Containers
  - Kubernetes
tags:
  - containers
  - kubernetes
  - k3s
---

Kubernetes helps manage container based workloads across many machines. If you are not familiar with k8s, check out [a previous post][1] for an intro. I am going to switch to k3s as a more lightweight version of Kubernetes for my homelab. Previously [I have used kubespray][2] to set up a cluster. I am going to try out k3s which advertises itself as a more lightweight platform than regular k8s.

My goal is to run a Kubernetes cluster on my homelab network for experimenting with container-based workloads and running my own software. Instead of using one or two large, power-hungry servers, I prefer several small machines like Raspberry Pi or mini PCs. K8s (Kubernetes) lets me treat these nodes as a single pool of capacity, so I can deploy and manage applications centrally without configuring each server by hand.

## Prerequisites

### Hardware Requirements

- **Control Plane**: 3 nodes, minimum 2 vCPUs and 4 GB RAM per server for HA with embedded etcd ([K3s requirements][3])
- **Workers**: 1 vCPU and 512 MB RAM minimum; scale resources with workload demands
- **Network**: All nodes on same subnet with static IPs
- **Storage**: 20GB+ SSD-backed disk space per node to handle etcd I/O

### Software Requirements

- SSH key-based authentication configured
- sudo access on all nodes

## Node Preparation

### 1. Set Static IPs and Hostname

```bash
# On each node, configure static networking
sudo hostnamectl set-hostname <node-name>

# OPTIONAL: Add entries to /etc/hosts on all nodes
echo "10.0.0.11 cp-01" | sudo tee -a /etc/hosts
echo "10.0.0.12 cp-02" | sudo tee -a /etc/hosts
echo "10.0.0.13 cp-03" | sudo tee -a /etc/hosts
echo "10.0.0.21 worker-01" | sudo tee -a /etc/hosts
echo "10.0.0.22 worker-02" | sudo tee -a /etc/hosts
echo "10.0.0.23 worker-03" | sudo tee -a /etc/hosts
echo "10.0.0.24 worker-04" | sudo tee -a /etc/hosts
```

### 2. System Updates and Time Sync

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Configure time synchronization
sudo systemctl enable systemd-timesyncd
sudo systemctl start systemd-timesyncd
```

### 3. Firewall Configuration (if enabled)

```bash
# Control plane nodes
sudo ufw allow 6443/tcp           # Kubernetes API / supervisor
sudo ufw allow 2379:2380/tcp      # Required only when using embedded etcd

# All nodes (default networking ports)
sudo ufw allow 8472/udp           # Flannel VXLAN overlay
sudo ufw allow 51820/udp          # Flannel WireGuard (IPv4)
sudo ufw allow 51821/udp          # Flannel WireGuard (IPv6)
sudo ufw allow 10250/tcp          # kubelet metrics and probes
sudo ufw allow 22/tcp             # SSH management access
sudo ufw allow from 10.42.0.0/16  # Default pod CIDR
sudo ufw allow from 10.43.0.0/16  # Default service CIDR
```

> Update the CIDR rules if you customize `--cluster-cidr` or `--service-cidr`.

For quick lab experiments you can temporarily disable UFW, but re-enable or harden it before exposing the cluster:

```bash
sudo ufw disable
```

## Installation

### Installation Options

#### Disposable single-node test (Docker)

> Requires Docker (with `--privileged` support) and `kubectl` on your workstation.

```bash
# Start a disposable single-node K3s server in Docker
LATEST_K3S=$(curl -sL -o /dev/null -w '%{url_effective}' https://github.com/k3s-io/k3s/releases/latest | sed 's#.*/##')
IMAGE_TAG=${LATEST_K3S/+/-}  # container image tags use '-' instead of '+'
docker run --rm -d --name k3s-docker --privileged -p 6443:6443 \
  -e K3S_KUBECONFIG_OUTPUT=/output/kubeconfig.yaml \
  -e K3S_KUBECONFIG_MODE=644 \
  -v $(pwd)/k3s-docker:/output \
  rancher/k3s:${IMAGE_TAG} server --disable traefik

# Wait for the cluster, then test access with the generated kubeconfig
export KUBECONFIG=$(pwd)/k3s-docker/kubeconfig.yaml
kubectl wait --for=condition=Ready node --all --timeout=90s
kubectl get nodes

# Tear down the container when finished
docker stop k3s-docker
rm -rf $(pwd)/k3s-docker
```

#### Longer-running local clusters

For persistent local environments, the K3s maintainers recommend using [k3d][4] (a Docker-backed wrapper) or running K3s inside lightweight VMs and using the system install script. These approaches manage networking, storage, and upgrades reliably—especially on macOS or Windows where Docker Desktop lacks required kernel modules.

#### Install on bare metal or VM using the official script

K3s can also be installed as a system service via `https://get.k3s.io`. The script supports both systemd and openrc based systems.

```bash
# Download and run the installation script (defaults to the latest stable release)
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=stable sh -
```

To pin to a specific version instead of the channel:

```bash
LATEST_K3S=$(curl -sL -o /dev/null -w '%{url_effective}' https://github.com/k3s-io/k3s/releases/latest | sed 's#.*/##')
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="$LATEST_K3S" sh -

# Or supply an explicit version string
# curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=v1.34.1+k3s1 sh -
```

After installing with the system service script:

- A k3s service will be configured to start on boot or if the process crashes.
- Additional tools will be installed on the server such as `kubectl` and an uninstall script.
- A kubeconfig file will be created at `/etc/rancher/k3s/k3s.yaml`

> A single-node server installation is a fully-functional Kubernetes cluster, including all the datastore, control-plane, kubelet, and container runtime components necessary to host workload pods. It is not necessary to add additional server or agents nodes, but adding nodes allows for more pods and more server nodes can make the control plane highly available.

## Control Plane Configuration

I will be setting up at least 3 control plane/server nodes to be highly available.

If you have an existing cluster using the default embedded SQLite database, you can convert it to etcd by restarting the original server with the `--cluster-init` flag and then adding more servers, as outlined in the [embedded etcd guide][5]. I will be using a config file on each node so the configuration is reproducible.

### 1. First Control Plane Node (`cp-01`)

**Using Config File**

Create `/etc/rancher/k3s/config.yaml`:

```yaml
write-kubeconfig-mode: '0644'
tls-san:
  - '10.0.0.11'
  - '10.0.0.12'
  - '10.0.0.13'
  - 'k3s.cluster.local'
  - 'k3s-api.example.com' # Optional: external LB FQDN
cluster-init: true # This will allow you to convert a single k3s node to a cluster or create a new cluster
node-taint:
  - 'CriticalAddonsOnly=true:NoExecute'
etcd-expose-metrics: true
disable:
  - traefik # Optional: disable if using external ingress
secrets-encryption: true
kube-controller-manager-arg:
  - 'bind-address=0.0.0.0'
kube-scheduler-arg:
  - 'bind-address=0.0.0.0'
```

Then install as the server role:

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server" sh -
```

**Verify Installation:**

```bash
# Service should start automatically
sudo systemctl status k3s
sudo journalctl -u k3s -f

# Check cluster status
kubectl get nodes
```

### 2. Get Cluster Token

```bash
# Retrieve the cluster token (store securely)
sudo cat /var/lib/rancher/k3s/server/node-token
```

### 3. Additional Control Plane Nodes (`cp-02`, `cp-03`)

**Using Config File**

Create `/etc/rancher/k3s/config.yaml` on `cp-02` and `cp-03`:

```yaml
write-kubeconfig-mode: '0644'
tls-san:
  - '10.0.0.11'
  - '10.0.0.12'
  - '10.0.0.13'
  - 'k3s.cluster.local'
  - 'k3s-api.example.com'
server: https://10.0.0.11:6443 # This needs to match the first server node
token: 'YOUR_CLUSTER_TOKEN_HERE'
node-taint:
  - 'CriticalAddonsOnly=true:NoExecute'
etcd-expose-metrics: true
disable:
  - traefik
secrets-encryption: true
kube-controller-manager-arg:
  - 'bind-address=0.0.0.0'
kube-scheduler-arg:
  - 'bind-address=0.0.0.0'
```

Then install:

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server" sh -
```

### 4. Verify Control Plane

```bash
# Check cluster status
kubectl get nodes
kubectl get pods -A

# Verify etcd readiness from the API server
kubectl get --raw /readyz?verbose | grep etcd
```

## Worker Node Setup

### Configure Worker Nodes

**Using Config File**

Create `/etc/rancher/k3s/config.yaml` on each worker:

```yaml
server: https://10.0.0.11:6443
token: 'YOUR_CLUSTER_TOKEN_HERE'
node-label:
  - 'node-type=worker'
kubelet-arg:
  - 'max-pods=110'
```

Then install:

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="agent" sh -
```

**Verify Worker Joined:**

```bash
# Service starts automatically
sudo systemctl status k3s-agent

# Check from control plane
kubectl get nodes -o wide
```

---

## Install k3s with Ansible

If you are comfortable using the software Ansible to perform the installation tasks over SSH, here is a guide to set up a suitable Ansible playbook. Create the following files:

### ansible.cfg

```ini
[defaults]
inventory = inventories/hosts.yml
interpreter_python = auto_silent
host_key_checking = False
retry_files_enabled = False
timeout = 30

[privilege_escalation]
become = True
become_method = sudo
become_ask_pass = False
```

### inventories/hosts.yml

Make new directories for `inventories`: `mkdir -p inventories/group_vars`

Create `hosts.yml` in the `inventories` directory.

```yaml
all:
  hosts:
    cp-01:
      ansible_host: 10.0.0.11
    cp-02:
      ansible_host: 10.0.0.12
    cp-03:
      ansible_host: 10.0.0.13
    worker-01:
      ansible_host: 10.0.0.21
    worker-02:
      ansible_host: 10.0.0.22
    worker-03:
      ansible_host: 10.0.0.23
    worker-04:
      ansible_host: 10.0.0.24
  children:
    k3s_bootstrap:
      hosts:
        cp-01:
    k3s_servers:
      hosts:
        cp-01:
        cp-02:
        cp-03:
    k3s_agents:
      hosts:
        worker-01:
        worker-02:
        worker-03:
        worker-04:
```

### inventories/group_vars/all.yml

Make `all.yml` in the `group_vars` subdirectory:

```yaml
ansible_user: ubuntu
ansible_ssh_private_key_file: ~/.ssh/ansible.pem
ansible_ssh_common_args: '-o StrictHostKeyChecking=no -o IdentitiesOnly=yes'

# Set to a fixed endpoint (VIP/load balancer) when available.
k3s_registration_address: 10.0.0.11
k3s_api_endpoint: 10.0.0.11

# Use a long random secret and store it in Ansible Vault for real usage.
k3s_token: 'super-secret-value-here'

# Use stable channel by default. Pin version by setting k3s_version.
k3s_channel: stable
# Example pin: v1.33.1+k3s1
k3s_version: ''

k3s_server_extra_args:
  - '--disable=traefik'
```

### playbooks/k3s.yml

Make new directories for `playbooks`: `mkdir -p playbooks`

```yaml
---
- name: Bootstrap first K3s server
  hosts: k3s_bootstrap
  become: true
  tasks:
    - name: Install curl dependency
      ansible.builtin.package:
        name: curl
        state: present

    - name: Install K3s bootstrap server
      ansible.builtin.shell: |
        curl -sfL https://get.k3s.io | sh -
      args:
        executable: /bin/bash
        creates: /etc/systemd/system/k3s.service
      environment:
        INSTALL_K3S_CHANNEL: '{{ k3s_channel }}'
        INSTALL_K3S_VERSION: "{{ k3s_version | default('', true) }}"
        INSTALL_K3S_EXEC: >-
          server
          --cluster-init
          --node-ip {{ ansible_host }}
          --tls-san {{ k3s_api_endpoint }}
          {{ k3s_server_extra_args | join(' ') }}
        K3S_TOKEN: '{{ k3s_token }}'

    - name: Ensure K3s service is started and enabled
      ansible.builtin.service:
        name: k3s
        enabled: true
        state: started

- name: Wait for K3s API endpoint
  hosts: localhost
  connection: local
  gather_facts: false
  become: false
  tasks:
    - name: Wait for port 6443 on registration endpoint
      ansible.builtin.wait_for:
        host: '{{ k3s_registration_address }}'
        port: 6443
        timeout: 300

- name: Join additional control-plane servers
  hosts: k3s_servers:!k3s_bootstrap
  become: true
  tasks:
    - name: Install curl dependency
      ansible.builtin.package:
        name: curl
        state: present

    - name: Install K3s server node
      ansible.builtin.shell: |
        curl -sfL https://get.k3s.io | sh -
      args:
        executable: /bin/bash
        creates: /etc/systemd/system/k3s.service
      environment:
        INSTALL_K3S_CHANNEL: '{{ k3s_channel }}'
        INSTALL_K3S_VERSION: "{{ k3s_version | default('', true) }}"
        INSTALL_K3S_EXEC: >-
          server
          --server https://{{ k3s_registration_address }}:6443
          --node-ip {{ ansible_host }}
          --tls-san {{ k3s_api_endpoint }}
          {{ k3s_server_extra_args | join(' ') }}
        K3S_TOKEN: '{{ k3s_token }}'

    - name: Ensure K3s service is started and enabled
      ansible.builtin.service:
        name: k3s
        enabled: true
        state: started

- name: Join worker nodes
  hosts: k3s_agents
  become: true
  tasks:
    - name: Install curl dependency
      ansible.builtin.package:
        name: curl
        state: present

    - name: Install K3s agent
      ansible.builtin.shell: |
        curl -sfL https://get.k3s.io | sh -
      args:
        executable: /bin/bash
        creates: /etc/systemd/system/k3s-agent.service
      environment:
        INSTALL_K3S_CHANNEL: '{{ k3s_channel }}'
        INSTALL_K3S_VERSION: "{{ k3s_version | default('', true) }}"
        INSTALL_K3S_EXEC: >-
          agent
          --server https://{{ k3s_registration_address }}:6443
          --node-ip {{ ansible_host }}
        K3S_TOKEN: '{{ k3s_token }}'

    - name: Ensure K3s agent service is started and enabled
      ansible.builtin.service:
        name: k3s-agent
        enabled: true
        state: started
```

This Ansible scaffold installs an HA K3s control plane on:

- `cp-01`, `cp-02`, `cp-03`

And joins workers:

- `worker-01`, `worker-02`, `worker-03`, `worker-04`

With the files in place, I recommend creating a virtual environment to execute the ansible playbook.

### 1) Create a uv virtualenv

If you do not have uv, it can be installed with `pip`: `pip install uv`

```bash
cd ansible
uv venv .venv
uv pip install --python .venv/bin/python -r requirements.txt
```

### 2) Set your SSH key/user if needed

Update `inventories/lan-cluster/group_vars/all.yml`:

- `ansible_user`
- `ansible_ssh_private_key_file` (defaults to `~/.ssh/ansible.pem`)
- `ansible_ssh_common_args` (optional)

### 3) Set a secure K3s token

Recommended: keep secrets out of git with Ansible Vault.

```bash
cd ansible
.venv/bin/ansible-vault encrypt_string --name k3s_token 'replace-with-long-random-token'
```

Paste the output into `inventories/lan-cluster/group_vars/all.yml` replacing `k3s_token`.

### 4) (Optional) Set API registration endpoint

Defaults:

- `k3s_registration_address: 10.0.0.11`
- `k3s_api_endpoint: 10.0.0.11`

If you add a VIP/load-balancer, set both vars to that address.

### 5) (Optional) Pin K3s version

By default, `k3s_channel: stable` is used.
To pin a specific release, set `k3s_version` in `group_vars/all.yml`.

### 6) Validate and run

Once all of the configuration is in place, you can validate the syntax, test connectivity to the control plane node, and then install k3s on all the nodes.

```bash
cd ansible
.venv/bin/ansible-playbook --syntax-check playbooks/k3s.yml
.venv/bin/ansible all -m ping --limit cp-01
.venv/bin/ansible-playbook playbooks/k3s.yml --ask-vault-pass
```

If not using ansible vault:

```bash
cd ansible
.venv/bin/ansible-playbook playbooks/k3s.yml
```

### 7) Verify cluster nodes

From `cp-01`:

```bash
sudo kubectl get nodes -o wide
```

---

## Access Configuration

### Setup kubectl Access

The official tool to interact with k8s on the CLI is `kubectl`. You can copy a suitable config file from a control plane node.

On your local machine (laptop/workstation), copy it from `cp-01` into place:

```bash
mkdir -p ~/.kube
ssh <ssh-user>@10.0.0.11 "sudo cat /etc/rancher/k3s/k3s.yaml" > ~/.kube/config
chmod 600 ~/.kube/config

# For remote access, edit server IP
sed -i.bak 's/127.0.0.1/10.0.0.11/g' ~/.kube/config
rm -f ~/.kube/config.bak
```

### Test Cluster Access

```bash
kubectl cluster-info
kubectl get nodes
kubectl get namespaces
```

## Maintenance and Decommissioning

### Retire a Node from the Cluster

K3s treats node departure just like upstream Kubernetes, so you get the same guardrails for draining workloads before you yank compute away. These steps mirror the [official guidance][6] and work for both server and agent nodes.

1. **Cordon the node** so the scheduler stops sending new pods its way:

   ```bash
   kubectl cordon <node-name>
   ```

2. **Drain existing workloads**. Follow the Kubernetes drain guidance to move pods safely, especially if the node hosts DaemonSets or EmptyDir volumes. Expect a short blip while Kubernetes reschedules pods elsewhere (screenshot).

   ```bash
   kubectl drain <node-name> \
     --delete-emptydir-data \
     --ignore-daemonsets \
     --force
   ```

   > Skip `--force` for production workloads unless you are intentionally removing pods that do not support graceful eviction.

3. **Delete the node object** once it is empty. This cleans up the cluster state and prevents stale entries from lingering in `kubectl get nodes` output.

   ```bash
   kubectl delete node <node-name>
   ```

4. **Run the uninstall script on the departing node**. Server nodes install `/usr/local/bin/k3s-uninstall.sh`; agents install `/usr/local/bin/k3s-agent-uninstall.sh`. Both scripts stop K3s, remove the local datastore, and delete the node configuration per the [official uninstall notes][7].

   ```bash
   # On a server node
   sudo /usr/local/bin/k3s-uninstall.sh

   # On a worker/agent node
   sudo /usr/local/bin/k3s-agent-uninstall.sh
   ```

5. **Verify the cluster view** from a remaining control-plane node. The removed machine should no longer appear (screenshot).

   ```bash
   kubectl get nodes -o wide
   ```

### Uninstall K3s from a System

When the entire cluster has served its purpose, lean on the cleanup helpers that ship with every install. They follow the [official uninstall procedure][7] and reverse the changes made by the installation script.

1. **Stop workloads gracefully**: drain or back up any stateful components before uninstalling so you do not lose data.

2. **Run the uninstall script that matches the node role**:

   ```bash
   # Server nodes (embedded etcd, database state, manifests)
   sudo /usr/local/bin/k3s-uninstall.sh

   # Agent nodes (workers only)
   sudo /usr/local/bin/k3s-agent-uninstall.sh
   ```

   Each script stops K3s and deletes the local cluster datastore, Local Storage PV data, node configuration, and installed CLI tools, as noted in the official guidance.

3. **Clear out leftover manifests or data you added manually**. Items in locations such as `/var/lib/rancher/k3s/server/manifests` that you created yourself are not deleted unless they were managed by the script. Archive anything you want to keep before wiping the directory.

4. **Reclaim the host**. Once the script exits, reboot or restart key services (container runtime, kubelet replacements, etc.) if you plan to repurpose the machine for other lab projects.

5. **Optional: remove firewall rules** you opened for the cluster. Tracking them in a dedicated UFW profile makes this step easier the next time you build a cluster.

After the uninstall, `kubectl` on your workstation will still point to the old kubeconfig. Update `~/.kube/config` or remove the context so you do not accidentally target a non-existent cluster.

---

## Next steps

Once you have a cluster online, you are ready to start running container-based software. I recommend using argocd to manage deployment of your applications. Check out [a previous post][8] for an introduction to argocd.

---

_Disclaimer: I used an LLM to help create this post. Opinions expressed are likely from me and not the LLM._

[1]: /posts/kubernetes
[2]: /posts/kubespray
[3]: https://docs.k3s.io/installation/requirements
[4]: https://k3d.io/
[5]: https://docs.k3s.io/datastore/ha-embedded
[6]: https://docs.k3s.io/
[7]: https://docs.k3s.io/installation/uninstall
[8]: /posts/argocd
