---
title: Setting Up AWS Resources with Terraform
author: aj
date: 2025-10-15

image: /images/terraform_logo.png
categories:
  - Cloud
tags:
  - cloud
  - terraform
  - AWS
  - infrastructure as code
---

If you’ve never used Terraform before, think of it as infrastructure as code. A way to define cloud resources (like servers, storage, and networks) in configuration files instead of clicking through a web console. Once you define your infrastructure, Terraform can automatically create, update, and destroy those resources in a predictable, repeatable way. Check out a [a previous post][1] for more of a general introduction to using Terraform.

Terraform works by using providers, which are plugins that let it talk to different platforms such as AWS, Azure, Google Cloud, or even on-prem tools like VMware. In this post, we’ll focus on AWS to show a practical example of defining some foundational resources.

## Overview

I have used Terraform for over 5 years now in my job and in my homelab. Here is an example of how I have set up some resources to work with AWS and use Terraform.

I have a repo that sets up the most basic resources I need:
-	A VPC, which is a private network in the cloud.
-	An S3 bucket for storing Terraform state (Terraform’s way of tracking what resources it manages).
-	Another S3 bucket for general use.
-	Route53 resources to manage DNS records.

There are cloud providers that are cheaper for storage and DNS, but I continue to use AWS since it’s what I use professionally and I want to stay consistent with my daily workflow.


## Example Setup

Before diving into the code, here’s what you’ll need:
-	Terraform installed
-	AWS CLI installed and configured

Terraform will use your AWS CLI credentials to authenticate with AWS. If you haven’t already configured it, you can run:

`aws configure`

and enter your AWS access key, secret key, and preferred region.

Amazon has official documentation that should have the most up-to-date method for installing the AWS CLI:
[https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html][1]

For Terraform itself, I use tfenv, a simple version manager that lets you install and switch between Terraform versions easily:
[https://github.com/tfutils/tfenv][2]


### main.tf

The main file defines core infrastructure and reusable tags for every resource. Tags are metadata labels you can apply to AWS resources.

```hcl
locals {
  standard_tags = {
    managed_by = "terraform"
    repo       = "terraform-aws-private"
  }
}

resource "aws_vpc" "main" {
  cidr_block = "172.0.0.0/16" # replace with your desired network block

  tags = local.standard_tags
}
```

Here, we’re creating a VPC (Virtual Private Cloud). Think of it as your own private section of AWS’s network where your EC2 instances, databases, and services can live securely.


### dns.tf

This file sets up a Route53 hosted zone and a simple TXT record (used here for Google site verification).

```hcl
resource "aws_route53_zone" "example" {
  name = "example.com"

  tags = merge(
    local.standard_tags,
    {
      component = "dns-zone"
    },
  )
}

resource "aws_route53_record" "googleVerification" {
  zone_id = aws_route53_zone.example.zone_id
  name    = "example.com"
  type    = "TXT"
  ttl     = "300"
  records = ["google-site-verification=foo"]
}
```

With these definitions, Terraform will create a DNS zone in AWS and automatically add your verification record.

### s3.tf

Here we define S3 buckets, which are object storage containers. You can use them to store static files, backups, logs, or even your Terraform state.

```hcl
# S3 bucket to host Terraform state for downstream projects.
resource "aws_s3_bucket" "terraform_state" {
  bucket = "example-terraform-state"

  tags = merge(
    local.standard_tags,
    {
      project   = "homelab"
      component = "terraform-state"
    },
  )
}
```

One of the most important buckets you’ll create is for Terraform state. This lets multiple users or systems share infrastructure state without conflicts.

### versions.tf

This file locks in your provider configuration and required versions. Terraform uses this to ensure consistent behavior across environments.

```hcl
provider "aws" {
  region = "us-east-1" # replace with your region
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

}
```

This tells Terraform:
-	Use the AWS provider from HashiCorp.
-	Require version 6.0 or newer (but not breaking changes from future major versions).
-	Work in the us-east-1 region.


## Next Steps

Once this Terraform is applied, you’ll have the groundwork for a reusable AWS environment. The next logical step is to store your Terraform state remotely.

By default, Terraform stores state locally in a `terraform.tfstate` file. That’s fine for experimentation, but for real environments you want a remote backend — typically S3 with state locking.


### Example backend.tf

Here’s how to define your backend in Terraform:

```hcl
terraform {
  # Update these values with your remote state bucket/table before running terraform init.
  backend "s3" {
    bucket         = "example-terraform-state"
    key            = "example-directory/terraform.tfstate"
    region         = "us-east-1" # match the s3 bucket location
  }
}
```

When you initialize Terraform (terraform init), it will set up your backend and start using the remote state automatically.

## Summary

By structuring your Terraform setup like this, you’re establishing a solid foundation for all future projects:
-	A network layer (VPC) for isolation and organization.
-	DNS management (Route53) to centralize domain control.
-	S3 storage for both project data and Terraform state.
-	Consistent provider configuration for reliability and reproducibility.

From here, you can start layering on more advanced resources like EC2 instances, security groups, RDS databases, or even entire Kubernetes clusters.

_New disclaimer I am adding: I used an LLM to help create this post but afterwards I spent more than an hour editing it to the final form._

 [1]: /posts/terraform/
 [2]: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
 [3]: https://github.com/tfutils/tfenv
