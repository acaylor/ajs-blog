---
title: Terraform for homelab
author: aj
date: 2022-05-22
image: /images/terraform_logo.png
categories:
  - Proxmox
  - Virtual Machines
  - Containers
tags:
  - proxmox
  - homelab
  - virtual machine
  - containers
  - terraform
---

Terraform is a tool for orchestrating infrastructure as code with human-readable configuration files. It can be used to create objects in the cloud and in the homelab. Similar to [ansible][1], terraform abstracts various other APIs used to provision virtual machines, containers, or an entire public cloud ecosystem.

![terraform](/images/terraform.png)

Terraform has an active community that contributes "providers" that interface with various resources and services. For example I will be switching my entire lab to using terraform. There are existing providers for the platforms that I use: Amazon Web Services, Docker, Kubernetes, github, proxmox, and likely more that I have yet to find. 

The work-flow for terraform at the most basic level is three stages:

1. Define resources in a configuration file.
2. Use terraform program to create a `plan` which shows what actions terraform will perform. Terraform will either create, update, or destroy resources.
3. Use terraform program to `apply` your plan to the target API. The best part about this is for example you are creating a virtual machine in the cloud, but terraform will make sure to create network configurations before creating the virtual machine. Providers can include dependency logic for resources.

Terraform is now very popular in the software industry and is something that I get paid to write. In this post I will go over all the providers that I use in my homelab. This was a real game changer for managing my homelab. No more installation wizards!!!

---

## Installation

The good news is that terraform is cross-platform and can run as a single binary executable file. You can download the compiled binary and directly run it on linux, macos, and windows systems. There are also package repositories for installing terraform on each of these platforms.

### Manual install

On any platform, you can download the terraform binary and run it in a terminal.

https://www.terraform.io/downloads

### macOS

On macOS, I use [homebrew][2] to install and update software. Terraform can be installed by adding a `tap`.

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

### windows

On windows, I suggest the chocolatey package manager. Check out a [post][3] on setting up windows if you are not familiar with chocolatey.

Install with chocolatey:

`choco install terraform`

### linux

The publishers of terraform have package repositories for the following distributions: Debian/Ubuntu, CentOS/RHEL, and Fedora. I am guilty of distro hopping and at this time I use fedora. Check out the terraform download link above for up to date commands to add terraform repo to your distro.

Install repo on fedora:

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://rpm.releases.hashicorp.com/fedora/hashicorp.repo
sudo dnf -y install terraform
```

Also note that this repo includes other hashicorp tools such as [packer][4].

## Examples

Here are some examples of how I am using terraform demonstrating how to get started.

Verify that terraform works by running this in a terminal:

```
terraform -help
```

### Docker

Terraform can be used to manage docker containers. If you are not familiar with containers, check out [a previous post][5] for the basics and how to get started. My previous posts include lots of applications that are deployed as containers. Those typically have been managed with `docker-compose` templates in `yml` format.

Terraform provides another way to manage containers. The reason to use terraform instead of `docker-compose` could be to unify your infrastructure as code. Rather than have a mess of shell scripts, `.yml` files, or relying on a [gui][6], terraform can deploy containers and provide a source of truth for the state of your infrastructure.

For this first example, we can create a single terraform template file to start a simple web server container. In the file we must reference the *provider* that defines docker related resources.

```tf
terraform {
  required_providers {
    # This is the provider mentioned and recognizes docker resources
    docker = {
      source = "kreuzwerker/docker"
      version = "~> 2.13.0"
    }
  }
}

# Don't need to modify the provider settings
provider "docker" {}

# This is the container image from the public docker hub
resource "docker_image" "nginx" {
  name         = "nginx:latest"
  keep_locally = false
}

# This is the container that we want to run
# note that it references the image defined above, this is a taste of how powerful terraform becomes as you scale out.
resource "docker_container" "nginx" {
  image = docker_image.nginx.latest
  name  = "nginx-tf"
  ports {
    internal = 80
    external = 8000
  }
}

```

That is a very basic example that is equivalent of running:

```bash
docker run -d -p 8000:80 nginx
```

Once the file is created, the `terraform init` command is needed to download the configured docker provider.

```
terraform init
```

You should see 'Terraform has been successfully initialized' in the output.

Terraform can also format your resource files to clean up white space and indentation:

```
terraform fmt
```

Terraform can validate the syntax of the files as well:

```
terraform validate
Success! The configuration is valid
```

And finally we tell terraform to apply the configuration. This command will create resources or verify that they are already running as configured.

```
terraform apply
```

Before terraform makes changes, the user is prompted with a summary of what changes terraform will make or it will inform the user that everything is up to date.

```
Terraform used the selected providers to generate the following execution
plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # docker_container.nginx will be created
  + resource "docker_container" "nginx" {
      + attach           = false
      + bridge           = (known after apply)
      + command          = (known after apply)
      + container_logs   = (known after apply)
      + entrypoint       = (known after apply)
      + env              = (known after apply)
      + exit_code        = (known after apply)
      + gateway          = (known after apply)
      + hostname         = (known after apply)
      + id               = (known after apply)
      + image            = (known after apply)
      + init             = (known after apply)
      + ip_address       = (known after apply)
      + ip_prefix_length = (known after apply)
      + ipc_mode         = (known after apply)
      + log_driver       = "json-file"
      + logs             = false
      + must_run         = true
      + name             = "nginx-tf"
      + network_data     = (known after apply)
      + read_only        = false
      + remove_volumes   = true
      + restart          = "no"
      + rm               = false
      + security_opts    = (known after apply)
      + shm_size         = (known after apply)
      + start            = true
      + stdin_open       = false
      + tty              = false

      + healthcheck {
          + interval     = (known after apply)
          + retries      = (known after apply)
          + start_period = (known after apply)
          + test         = (known after apply)
          + timeout      = (known after apply)
        }

      + labels {
          + label = (known after apply)
          + value = (known after apply)
        }

      + ports {
          + external = 8000
          + internal = 80
          + ip       = "0.0.0.0"
          + protocol = "tcp"
        }
    }

  # docker_image.nginx will be created
  + resource "docker_image" "nginx" {
      + id           = (known after apply)
      + keep_locally = false
      + latest       = (known after apply)
      + name         = "nginx:latest"
      + output       = (known after apply)
      + repo_digest  = (known after apply)
    }

Plan: 2 to add, 0 to change, 0 to destroy.

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.
```

The output should show 'Apply complete!'

Verify the container is running with a `docker` command:

```
docker ps

CONTAINER ID   IMAGE          COMMAND                  CREATED          STATUS          PORTS                  NAMES
2d2df903f238   de2543b9436b   "/docker-entrypoint.…"   48 seconds ago   Up 47 seconds   0.0.0.0:8000->80/tcp   nginx-tf
```

After you apply the terraform configuration, a new file is generated in the working directory called `terraform.tfstate` this is a text file that includes metadata about the resources that you have created. This file is used by terraform to determine if new changes are needed. This file can be inspected in a text editor or by running:

```
terraform show
```

### Proxmox

Now for what excited me most, the proxmox provider. The proxmox provider can be used to create and manage virtual machines and lxc containers on proxmox systems. If you have a cluster of proxmox nodes, terraform can deploy to any of the nodes. If you are not familiar with proxmox and virtual machines, check out [a previous post][7] on how to set it up.

Since I already have resources deployed to proxmox, the `terraform import` function can be used to allow terraform to manage existing resources.

Unlike the docker provider, the proxmox provider needs credentials to access the proxmox API. I recommend using an API token and avoid putting passwords in terraform templates.

In order to better protect credentials, terraform variables can be used to keep credentials out of template files.

#### Create service account for terraform

Log into the proxmox host terminal or GUI and then:

- Create a new `role` for terraform
- Create a new `user` for terraform
- Bind the new user to the new role
- Create an API key and associate it with the new user

```bash
pveum role add TerraformRole -privs "VM.Allocate VM.Clone VM.Config.CDROM VM.Config.CPU VM.Config.Cloudinit VM.Config.Disk VM.Config.HWType VM.Config.Memory VM.Config.Network VM.Config.Options VM.Monitor VM.Audit VM.PowerMgmt Datastore.AllocateSpace Datastore.Audit"
pveum user add tf@pam --password <password>
pveum aclmod / -user tf@pam -role TerraformRole
pveum user token add tf@pam tftoken
```

Here is a terraform file to manage an existing proxmox lxc container.

```tf
terraform {
  required_providers {
    proxmox = {
      source = "telmate/proxmox"
      version = "2.9.6"
    }
  }
}

provider "proxmox" {
  # URL of proxmox API
  pm_api_url = var.proxmox_api_var
  # API token id
  pm_api_token_id = var.proxmox_api_token_var
  # This is the secret value of the api token
  pm_api_token_secret = var.proxmox_api_token_secret_var
}

variable "proxmox_api_var" {
  type = string
  default = "https://proxmox.url:8006"
}
variable "proxmox_api_token_var" {
  type = string
  default = "token"
}
variable "proxmox_api_token_secret_var" {
  type = string
  default = "secret"
}

resource "proxmox_lxc" "foo_lxc" {
  target_node = "pve"
  hostname = "foo"
  cores = 2
  memory = 2048
  onboot = true
  unprivileged = true

  rootfs {
    storage = ""
    size = "32G"
  }

  vmid = 999

}
```

Once the variables have been declared, you can reference them during execution or in a separate file. For example in a separate file:

`vars.tfvars`

```tf
proxmox_api_var = "https://pve.url:8006/api2/json"
proxmox_api_token_var = "token@pam!tokenid"
proxmox_api_token_secret_var = "secret"
```

Environment variables can also be used instead of storing the credentials in a file:

```bash
export PM_API_TOKEN_ID="token@pam!tokenid"
export PM_API_TOKEN_SECRET="secret"
```

Once the terraform template and variables file is ready, initialize the provider:

```
terraform init
```

```
Initializing the backend...

Initializing provider plugins...
- Finding telmate/proxmox versions matching "2.9.6"...
- - Installing telmate/proxmox v2.9.6...
- - Installed telmate/proxmox v2.9.6 (self-signed, key ID A9EBBE091B35AFCE)
-
- Partner and community providers are signed by their developers.
- If you'd like to know more about provider signing, you can read about it here:
- https://www.terraform.io/docs/cli/plugins/signing.html
-
- Terraform has created a lock file .terraform.lock.hcl to record the provider
- selections it made above. Include this file in your version control repository
- so that Terraform can guarantee to make the same selections by default when
- you run "terraform init" in the future.
-
- Terraform has been successfully initialized!
```

#### Import existing lxc container

The example terraform template above was for an existing lxc container. To import it to be managed by terraform, run the following:

```
terraform import proxmox_lxc.foo_lxc node/lxc/id
```

Replace `node` with the name of the proxmox server and replace `id` with the ID number given to the lxc container by the proxmox server.

```
proxmox_lxc.foo_lxc: Importing from ID "node/lxc/id"...
proxmox_lxc.foo_lxc: Import prepared!
  Prepared proxmox_lxc for import
  proxmox_lxc.foo_lxc: Refreshing state... [id=node/lxc/id]

  Import successful!

  The resources that were imported are shown above. These resources are now in
  your Terraform state and will henceforth be managed by Terraform.
```

#### Create a new virtual machine with cloud-init

Proxmox supports cloud-init which makes cloning virtual machines easier. Cloud-init reads configuration data when the virtual machine boots for the first time. Proxmox can pass in enough data to get a working system without you having to step through an installation wizard. It also enables you to deploy many virtual machines at the same time.

Proxmox out of the box can configure the following options with cloud-init:

- User
- Password
- ssh keys
- DNS
- Static IP or DHCP

When using cloud init, the virtual machine will have a hostname that matches the name given to proxmox as well.

Previously I have used [packer][7] to create virtual machine templates but debian and ubuntu linux publish ready to use vm templates that are already set up with cloud-init. Let's download an ubuntu template and make a small tweak to enable the qemu-guest-agent which will allow terraform to identify networking information when using DHCP to assign an IP address.

##### Download ubuntu cloud image

Log into the proxmox host. If you have a cluster of proxmox nodes, I recommend using shared storage so they can all utilize the template easily. If you have a shared directory mounted, head there, otherwise going to `/tmp` is a good option.

```bash
cd /tmp
wget https://cloud-images.ubuntu.com/focal/current/focal-server-cloudimg-amd64.img
```

This will download the latest image for ubuntu 20.04 (focal) into the current directory.

Now install a package on the proxmox host to tweak this image to support the qemu guest agent:

```bash
apt-get install libguestfs-tools

virt-customize -a focal-server-cloudimg-amd64.img --install qemu-guest-agent
```

Now we can import this image into proxmox as a vm template:

Create a vm template using id 999 or another unique number to your proxmox:

```bash
#qm create <UNIQUE_ID> --name <TEMPLATE_NAME> --memory <MEMORY_IN_MB> --net0 <NETWORK_ADAPTER_TYPE,bridge=<PROXMOX_NETWORK_BRIDGE>
qm create 999 --name focal-template --memory 2048 --net0 virtio,bridge=vmbr0
```

Import the cloud-init image as the new template's boot disk. Make sure to replace `local-lvm` with your proxmox storage if you are not using the default storage.

```bash
qm importdisk 999 focal-server-cloudimg-amd64.img local-lvm

qm set 999 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-999-disk-0

qm set 999 --ide local-lvm:cloudinit

qm set 999 --boot c --bootdisk scsi0

qm set 999 --serial0 socket --vga serial0

qm template 999
```

Now this template is ready to be used by terraform.

##### Deploy a virtual machine with terraform

Use the same terraform template as earlier in this post but replace `proxmox_lxc` block with a new block:

```tf
variable "proxmox_host" {
  type = string
  default = "pve"
}
variable "template_name" {
  type = string
  default = "focal-template"
}
variable "ssh_key" {
  type = string
  default = "ssh-rsa-pub-key-here"
}

output "vm_ip" {
  value = proxmox_vm_qemu.tf_tests.*.default_ipv4_address
}

resource "proxmox_vm_qemu" "tf_tests" {
    count = 1
    name = "tf-${count.index + 1}"
    target_node = var.proxmox_host
    clone = var.template_name
    agent = 1
    os_type = "cloud-init"
    cores = 2
    sockets = 1
    cpu = "host"
    memory = 4096
    scsihw = "virtio-scsi-pci"
    bootdisk = "scsi0"

    disk {
        slot = 0
        size = "16G"
        type = "scsi"
        storage = "local-lvm"
        iothread = 1
    }

    network {
        model = "virtio"
        bridge = "vmbr0"
    }

    lifecycle {
        ignore_changes = [
            network,
        ]
    }

    ipconfig0 = "ip=192.168.1.21${count.index + 1}/24,gw=192.168.1.1"

    sshkeys = <<EOF
    ${var.ssh_key}
    EOF
}
```

A couple things to note:

- `count` makes it possible to deploy multiple vms in parallel. With the `count.index`, we can add a suffix to the vm hostname and give each vm a static IP address.
- Make sure to define a public ssh key for the variable `ssh_key` or there will be no way to access the new virtual machine(s). Alternatively, define a password for the default user, `ubuntu`, if using the focal template: `cipassword = "password"`.
- `ipconfig0` in this example will set a static IP address and make sure the `gw=` matches the IP of your router/gateway. To use dhcp, replace the string with:

`ipconfig=dhcp`

##### Deploy the template

Initialize the provider with `terraform init`.

Deploy the template with `terraform apply`:

```bash
terraform apply

Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # proxmox_vm_qemu.tf_tests[0] will be created
  + resource "proxmox_vm_qemu" "tf_tests" {
...
...

Plan: 1 to add, 0 to change, 0 to destroy.

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes
```

Once you enter 'yes', terraform will create the vm. When it completes you should see:

```
proxmox_vm_qemu.tf_tests[0]: Creating...

proxmox_vm_qemu.tf_tests[0]: Still creating... [10s elapsed]

proxmox_vm_qemu.tf_tests[0]: Still creating... [20s elapsed]

proxmox_vm_qemu.tf_tests[0]: Still creating... [30s elapsed]

proxmox_vm_qemu.tf_tests[0]: Still creating... [40s elapsed]

proxmox_vm_qemu.tf_tests[0]: Still creating... [50s elapsed]
...
...

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

Outputs:

vm_ip = [
  "192.168.1.211",
]
```

Now the virtual machine should be remotely accesible and if you cannot login with the hostname, use the IP in the output.

## Next steps

Additional configuration options are included with the providers, check out the documentation:

- https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs
- https://registry.terraform.io/providers/Telmate/proxmox/latest/docs

Terraform has made it easier for me to create vms to test new software and also makes it easy to clean up after testing is complete.

## Clean up

Any resources deployed with terraform can be removed with the command:

```
terraform destroy
```

 [1]: /posts/ansible/
 [2]: https://brew.sh
 [3]: /posts/setting-up-windows/
 [4]: /posts/creating-linux-virtual-machine-templates-with-packer/
 [5]: /posts/containers/
 [6]: /posts/portainer/
 [6]: /posts/proxmox-installation/
 [7]: /posts/packer/
