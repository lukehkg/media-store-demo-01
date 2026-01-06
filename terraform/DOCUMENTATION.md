# Terraform Infrastructure Documentation

Complete documentation for AWS infrastructure deployment using Terraform.

---

## Table of Contents

1. [Overview](#overview)
2. [Two Deployment Configurations](#two-deployment-configurations)
3. [Production: ECS Fargate](#production-ecs-fargate)
4. [Demo: EC2 t3.small](#demo-ec2-t3small)
5. [Cost Comparison](#cost-comparison)
6. [CI/CD Setup](#cicd-setup)
7. [GitHub Actions Configuration](#github-actions-configuration)
8. [Resource Tagging](#resource-tagging)
9. [Scheduler Configuration](#scheduler-configuration)
10. [Quick Reference](#quick-reference)

---

## Overview

This repository contains **two completely separate Terraform configurations** for deploying containerized applications on AWS:

- **Production**: ECS Fargate with ALB, NAT Gateway, auto-scaling (24/7 operation)
- **Demo**: EC2 t3.small with Lambda scheduler (business hours only, 80% cost savings)

Both configurations are independent, self-contained, and ready to deploy.

---

## Two Deployment Configurations

### Directory Structure

```
terraform/
│
├── 📁 production/          ← Production: ECS Fargate (11 files)
│   ├── versions.tf
│   ├── variables.tf
│   ├── vpc.tf              (VPC with public/private subnets, NAT Gateway)
│   ├── security.tf         (Security groups for ALB and ECS)
│   ├── alb.tf              (Application Load Balancer)
│   ├── ecr.tf              (ECR repositories)
│   ├── ecs.tf              (ECS cluster, task definitions, services)
│   ├── autoscaling.tf      (Auto-scaling policies)
│   ├── outputs.tf
│   ├── terraform.tfvars.example
│   └── README.md
│
└── 📁 demo/                ← Demo: EC2 t3.small (8 files + 2 folders)
    ├── versions.tf
    ├── variables.tf
    ├── vpc.tf              (VPC with public subnet only, no NAT)
    ├── ec2.tf              (EC2 instance, Elastic IP, IAM)
    ├── lambda.tf           (Lambda scheduler for start/stop)
    ├── outputs.tf
    ├── terraform.tfvars.example
    ├── README.md
    ├── ec2/
    │   └── user-data.sh    (EC2 bootstrap script)
    └── lambda/
        └── ec2_scheduler.py (Lambda function code)
```

### Quick Comparison

| Feature | Production | Demo |
|---------|-----------|------|
| **Folder** | `terraform/production/` | `terraform/demo/` |
| **Compute** | ECS Fargate | EC2 t3.small |
| **Scheduler** | ❌ None (24/7) | ✅ Lambda (business hours) |
| **NAT Gateway** | ✅ Yes ($33/month) | ❌ No ($0) |
| **ALB** | ✅ Yes ($19/month) | ❌ No ($0) |
| **High Availability** | ✅ Multi-AZ | ❌ Single instance |
| **Auto-scaling** | ✅ Yes (1-5 tasks) | ❌ Manual only |
| **Cost** | $95/month | $14/month |
| **Use Case** | Production | Demo/POC |

---

## Production: ECS Fargate

### Architecture

- **ECS Fargate Cluster** with 3 services:
  - Backend API service
  - Frontend Admin service
  - Frontend Client service
- **Application Load Balancer** (ALB) for load balancing and routing
- **NAT Gateway** (single, cost-optimized) for private subnet internet access
- **ECR Repositories** (3) for Docker images with lifecycle policies
- **Auto-scaling** based on CPU and memory utilization (1-5 tasks)
- **CloudWatch Logs** with 7-day retention
- **VPC** with public and private subnets across 2 AZs

### Deployment Steps

1. **Navigate to production folder:**
   ```bash
   cd terraform/production
   ```

2. **Copy and configure variables:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values:
   # - aws_account_id (REQUIRED)
   # - aws_region (default: eu-west-1)
   # - project_name (default: demo-media01)
   # - environment (default: prod)
   ```

3. **Initialize Terraform:**
   ```bash
   terraform init
   ```

4. **Review deployment plan:**
   ```bash
   terraform plan
   ```

5. **Deploy infrastructure:**
   ```bash
   terraform apply
   ```

6. **View outputs:**
   ```bash
   terraform output
   ```

### Monthly Cost Breakdown

| Component | Cost |
|-----------|------|
| ECS Fargate Compute (24/7) | $36.04 |
| NAT Gateway | $33.30 |
| Application Load Balancer | $19.34 |
| ECR Storage (15 GB) | $1.50 |
| CloudWatch Logs | $0.50 |
| Data Transfer | $4.51 |
| **TOTAL** | **$95.19/month** |

### Key Features

- ✅ High availability (multi-AZ)
- ✅ Auto-scaling (1-5 tasks per service)
- ✅ Service isolation
- ✅ Managed service (no EC2 management)
- ✅ 24/7 operation
- ✅ CI/CD ready (GitHub Actions)

---

## Demo: EC2 t3.small

### Architecture

- **EC2 t3.small** instance (2 vCPU, 2 GB RAM)
- **Elastic IP** for static public IP address
- **Lambda Scheduler** to automatically start/stop instance
- **VPC** with public subnet only (no NAT Gateway needed)
- **CloudWatch Logs** with 3-day retention
- **No ALB** - direct access via Elastic IP

### Prerequisites

1. **EC2 Key Pair** (REQUIRED):
   ```bash
   aws ec2 create-key-pair --key-name demo-media01-key --query 'KeyMaterial' --output text > demo-media01-key.pem
   chmod 400 demo-media01-key.pem
   ```

2. **AWS CLI** configured with credentials

3. **Terraform** >= 1.0 installed

### Deployment Steps

1. **Navigate to demo folder:**
   ```bash
   cd terraform/demo
   ```

2. **Copy and configure variables:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values:
   # - aws_account_id (REQUIRED)
   # - ec2_key_name (REQUIRED - your EC2 key pair name)
   # - aws_region (default: eu-west-1)
   ```

3. **Initialize Terraform:**
   ```bash
   terraform init
   ```

4. **Review deployment plan:**
   ```bash
   terraform plan
   ```

5. **Deploy infrastructure:**
   ```bash
   terraform apply
   ```

6. **SSH to instance and deploy services:**
   ```bash
   # Get Elastic IP from outputs
   terraform output ec2_public_ip
   
   # SSH to instance
   ssh -i ~/.ssh/your-key.pem ec2-user@<elastic-ip>
   
   # On EC2 instance, deploy services
   cd /opt/demo-media01
   git clone https://github.com/your-repo/media-store-demo.git .
   docker-compose up -d
   ```

### Monthly Cost Breakdown (with Scheduler)

| Component | Cost |
|-----------|------|
| EC2 Instance (216.5 hrs/month) | $4.50 |
| EBS Storage (30 GB) | $3.00 |
| ECR Storage (15 GB) | $1.50 |
| CloudWatch Logs | $0.50 |
| Data Transfer | $4.51 |
| Lambda Scheduler | $0.00 (Free Tier) |
| **TOTAL** | **$14.01/month** |

**Savings vs Production:** $55.83/month (80% reduction)

### Scheduler Configuration

The Lambda scheduler automatically:
- **Starts** EC2 instance at 8 AM GMT+1 (7 AM UTC) on weekdays
- **Stops** EC2 instance at 6 PM GMT+1 (5 PM UTC) on weekdays
- **Weekends**: Instance remains stopped

**Running Hours:** ~216.5 hours/month (business hours only)

**Manual Control:**
```bash
# Start instance
aws lambda invoke --function-name demo-media01-ec2-scheduler-demo \
  --payload '{"action":"start"}' response.json

# Stop instance
aws lambda invoke --function-name demo-media01-ec2-scheduler-demo \
  --payload '{"action":"stop"}' response.json
```

### Key Features

- ✅ 80% cost savings vs production
- ✅ Lambda scheduler for automatic on/off
- ✅ Direct SSH access
- ✅ Full control over instance
- ✅ No NAT Gateway (saves $33/month)
- ✅ No ALB (saves $19/month)

### Limitations

- ❌ Single point of failure (single instance)
- ❌ No auto-scaling (manual scaling only)
- ❌ Manual maintenance required
- ❌ Limited resources (2 vCPU, 2 GB RAM)

---

## Cost Comparison

### Monthly Cost Comparison

| Architecture | Monthly Cost | Annual Cost | Savings |
|--------------|--------------|-------------|---------|
| **Production (ECS Fargate)** | **$95.19** | **$1,142.28** | Baseline |
| **Demo (EC2 t3.small)** | **$14.01** | **$168.12** | **$55.83/month (80%)** |

### Detailed Cost Breakdown

#### Production (ECS Fargate) - 24/7

| Component | Cost |
|-----------|------|
| ECS Fargate Compute | $36.04 |
| NAT Gateway | $33.30 |
| ALB | $19.34 |
| ECR Storage | $1.50 |
| CloudWatch Logs | $0.50 |
| Data Transfer | $4.51 |
| **TOTAL** | **$95.19** |

#### Demo (EC2) - With Scheduler

| Component | Cost |
|-----------|------|
| EC2 Instance (216.5 hrs) | $4.50 |
| EBS Storage | $3.00 |
| ECR Storage | $1.50 |
| CloudWatch Logs | $0.50 |
| Data Transfer | $4.51 |
| Lambda Scheduler | $0.00 |
| **TOTAL** | **$14.01** |

**What's NOT included in Demo (saves $52.64):**
- ❌ NAT Gateway: $0 (saves $33.30)
- ❌ ALB: $0 (saves $19.34)

### Cost Savings Analysis

**With Scheduler (Business Hours Only):**
- **Demo**: $14.01/month
- **Production**: $95.19/month
- **Savings**: **$81.18/month (85% reduction)**
- **Annual Savings**: **$974.16/year**

**Without Scheduler (24/7):**
- **Demo**: $24.69/month
- **Production**: $95.19/month
- **Savings**: **$70.50/month (74% reduction)**
- **Annual Savings**: **$846.00/year**

---

## CI/CD Setup

### Overview

GitHub Actions workflow (`.github/workflows/deploy-ecs.yml`) automatically:
1. Builds Docker images when code is pushed
2. Pushes images to Amazon ECR
3. Updates ECS task definitions with new image URIs
4. Deploys to ECS services
5. Waits for deployments to stabilize

### Prerequisites

1. **AWS Account** with appropriate permissions
2. **GitHub repository** with your code
3. **Terraform infrastructure deployed** (ECS cluster, ECR repositories)

### Step 1: Create AWS IAM User for GitHub Actions

```bash
# Create IAM user
aws iam create-user --user-name github-actions-deploy

# Attach policies
aws iam attach-user-policy \
  --user-name github-actions-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

aws iam attach-user-policy \
  --user-name github-actions-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

# Create access keys
aws iam create-access-key --user-name github-actions-deploy
```

**Save the Access Key ID and Secret Access Key** - you'll need them for GitHub Secrets.

### Step 2: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### Required Secrets (Encrypted)

| Secret Name | Description | Example |
|------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_ACCOUNT_ID` | Your AWS Account ID (12 digits) | `123456789012` |

#### Optional Variables (Visible in logs)

| Variable Name | Default Value | Description |
|--------------|---------------|-------------|
| `AWS_REGION` | `eu-west-1` | AWS region for resources |
| `ECS_CLUSTER` | `demo-media01-cluster` | ECS cluster name |
| `ECS_SERVICE_BACKEND` | `demo-media01-backend-dev` | Backend service name |
| `ECS_SERVICE_FRONTEND_ADMIN` | `demo-media01-frontend-admin-dev` | Frontend admin service name |
| `ECS_SERVICE_FRONTEND_CLIENT` | `demo-media01-frontend-client-dev` | Frontend client service name |
| `ECR_REPOSITORY_BACKEND` | `demo-media01-backend` | Backend ECR repository name |
| `ECR_REPOSITORY_FRONTEND_ADMIN` | `demo-media01-frontend-admin` | Frontend admin ECR repository name |
| `ECR_REPOSITORY_FRONTEND_CLIENT` | `demo-media01-frontend-client` | Frontend client ECR repository name |

### Step 3: Workflow Triggers

The workflow runs automatically on:
- **Push to `main` branch**
- **Push to `develop` branch**
- **Manual trigger** (workflow_dispatch)

### Step 4: Verify Deployment

After pushing code, check GitHub Actions:
1. Go to **Actions** tab in GitHub
2. Select the workflow run
3. Check build and deployment logs
4. Verify services are updated in AWS ECS Console

---

## GitHub Actions Configuration

### Workflow File Location

`.github/workflows/deploy-ecs.yml`

### Workflow Steps

1. **Checkout code**
2. **Configure AWS credentials** (using GitHub secrets)
3. **Login to Amazon ECR**
4. **Build Docker images** (for each service)
5. **Push images to ECR** (tagged with commit SHA and `latest`)
6. **Update ECS task definitions** with new image URIs
7. **Register new task definition revisions**
8. **Update ECS services** with new task definitions
9. **Wait for service stabilization**

### Environment Variables

The workflow uses these environment variables (set in workflow file):

```yaml
AWS_REGION: eu-west-1
ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.eu-west-1.amazonaws.com
ECS_CLUSTER: demo-media01-cluster
ECS_SERVICE_BACKEND: demo-media01-backend-dev
ECS_SERVICE_FRONTEND_ADMIN: demo-media01-frontend-admin-dev
ECS_SERVICE_FRONTEND_CLIENT: demo-media01-frontend-client-dev
ECR_REPOSITORY_BACKEND: demo-media01-backend
ECR_REPOSITORY_FRONTEND_ADMIN: demo-media01-frontend-admin
ECR_REPOSITORY_FRONTEND_CLIENT: demo-media01-frontend-client
```

### Troubleshooting

**Common Issues:**

1. **Authentication Error:**
   - Verify GitHub secrets are set correctly
   - Check IAM user has required permissions

2. **ECR Push Failed:**
   - Verify ECR repositories exist
   - Check IAM user has `AmazonEC2ContainerRegistryPowerUser` policy

3. **ECS Update Failed:**
   - Verify ECS cluster and services exist
   - Check IAM user has `AmazonECS_FullAccess` policy

4. **Task Definition Update Failed:**
   - Verify task definition exists
   - Check JSON format is correct

---

## Resource Tagging

### Naming Convention

All AWS resources follow this naming pattern:
```
{demo-media01}-{resource-type}-{environment}
```

**Examples:**
- VPC: `demo-media01-vpc-prod`
- ECS Cluster: `demo-media01-cluster-prod`
- ALB: `demo-media01-alb-prod`
- Backend Service: `demo-media01-backend-prod`
- EC2 Instance: `demo-media01-app-server-demo`

### Default Tags

All resources are automatically tagged with:

| Tag Key | Value | Description |
|---------|-------|-------------|
| `Environment` | `prod` or `demo` | Environment name |
| `Project` | `demo-media01` | Project name |
| `ResourcePrefix` | `demo-media01` | For easy filtering |
| `ManagedBy` | `Terraform` | Infrastructure tool |
| `Purpose` | `Production` or `Demo-POC` | Purpose of resources |

### Resource-Specific Tags

Additional tags for specific resources:

- **Name**: Full resource name (e.g., `demo-media01-backend-ecr-prod`)
- **Service**: Service name (for ECR: `backend`, `frontend-admin`, `frontend-client`)
- **Type**: Resource type (for subnets: `public`, `private`)

### Searching Resources

**Using AWS Console:**
1. Go to **AWS Resource Groups** → **Create Resource Group**
2. Select **Tag-based**
3. Add tag: `ResourcePrefix` = `demo-media01`
4. Save as "demo-media01-resources"

**Using AWS CLI:**
```bash
# List all resources with demo-media01 prefix
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=ResourcePrefix,Values=demo-media01 \
  --region eu-west-1
```

**Using Terraform:**
```bash
# List all resources
terraform state list

# Show specific resource
terraform state show aws_ecs_cluster.main
```

---

## Scheduler Configuration

### Overview

The Lambda scheduler automatically starts and stops EC2 instances (demo configuration) to optimize costs.

### Schedule Details

**Default Schedule (GMT+1 / London Time):**
- **Start**: 8:00 AM GMT+1 (7:00 AM UTC) - Monday to Friday
- **Stop**: 6:00 PM GMT+1 (5:00 PM UTC) - Monday to Friday
- **Weekends**: Instance remains stopped

**Time Zone Notes:**
- **GMT+1 (BST)**: March-October (British Summer Time)
- **GMT**: November-February (Greenwich Mean Time)
- The cron schedule uses UTC, which automatically adjusts for BST/GMT

### Cost Savings

With the scheduler enabled:
- **Running Hours**: ~216.5 hours/month (business hours only)
- **Without Scheduler**: 730 hours/month (24/7)
- **Savings**: ~85% reduction in EC2 compute costs

**Example Monthly Savings:**
- EC2: $15.18 → $4.50 (saves $10.68/month)
- Total Infrastructure: $24.69 → $14.01 (saves $10.68/month)

### Configuration Variables

In `terraform/demo/terraform.tfvars`:

```hcl
scheduler_enabled      = true              # Enable/disable scheduler
start_time_utc         = "7"                # Start hour in UTC (7 AM UTC = 8 AM GMT+1)
stop_time_utc          = "17"               # Stop hour in UTC (5 PM UTC = 6 PM GMT+1)
scheduler_weekdays_only = true             # Only schedule weekdays
```

### Customizing Schedule

**Example: 9 AM - 7 PM (GMT+1)**
```hcl
start_time_utc = "8"   # 8 AM UTC = 9 AM GMT+1
stop_time_utc  = "18"  # 6 PM UTC = 7 PM GMT+1
```

**Example: Every Day (including weekends)**
```hcl
scheduler_weekdays_only = false
```

### Manual Control

**Start Instance:**
```bash
aws lambda invoke \
  --function-name demo-media01-ec2-scheduler-demo \
  --payload '{"action":"start"}' \
  response.json
```

**Stop Instance:**
```bash
aws lambda invoke \
  --function-name demo-media01-ec2-scheduler-demo \
  --payload '{"action":"stop"}' \
  response.json
```

**Check Instance Status:**
```bash
aws ec2 describe-instances \
  --instance-ids <instance-id> \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text
```

### Monitoring

**CloudWatch Logs:**
- Log Group: `/aws/lambda/demo-media01-ec2-scheduler-demo`
- View logs in AWS Console or CLI:
  ```bash
  aws logs tail /aws/lambda/demo-media01-ec2-scheduler-demo --follow
  ```

**EventBridge Rules:**
- Start Rule: `demo-media01-start-ec2-instance-demo`
- Stop Rule: `demo-media01-stop-ec2-instance-demo`

---

## Quick Reference

### Deployment Commands

**Production:**
```bash
cd terraform/production
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars
terraform init
terraform plan
terraform apply
terraform output
```

**Demo:**
```bash
cd terraform/demo
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars (set ec2_key_name)
terraform init
terraform plan
terraform apply
terraform output
```

### Common Terraform Commands

```bash
# Initialize
terraform init

# Format code
terraform fmt

# Validate configuration
terraform validate

# Plan changes
terraform plan

# Apply changes
terraform apply

# Apply with auto-approve
terraform apply -auto-approve

# Destroy infrastructure
terraform destroy

# View outputs
terraform output

# View state
terraform state list
terraform state show <resource>
```

### AWS CLI Commands

**ECR:**
```bash
# Login to ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.eu-west-1.amazonaws.com

# List repositories
aws ecr describe-repositories --region eu-west-1

# List images
aws ecr list-images --repository-name demo-media01-backend --region eu-west-1
```

**ECS:**
```bash
# List clusters
aws ecs list-clusters --region eu-west-1

# List services
aws ecs list-services --cluster demo-media01-cluster --region eu-west-1

# Describe service
aws ecs describe-services \
  --cluster demo-media01-cluster \
  --services demo-media01-backend-prod \
  --region eu-west-1

# Update service
aws ecs update-service \
  --cluster demo-media01-cluster \
  --service demo-media01-backend-prod \
  --force-new-deployment \
  --region eu-west-1
```

**EC2:**
```bash
# List instances
aws ec2 describe-instances --region eu-west-1

# Start instance
aws ec2 start-instances --instance-ids <instance-id> --region eu-west-1

# Stop instance
aws ec2 stop-instances --instance-ids <instance-id> --region eu-west-1
```

### Useful Outputs

**Production:**
- `alb_dns_name` - Application Load Balancer DNS
- `application_url` - Full application URL
- `ecs_cluster_name` - ECS cluster name
- `backend_ecr_repository_url` - Backend ECR repository URL
- `github_secrets_guide` - GitHub secrets configuration

**Demo:**
- `ec2_public_ip` - EC2 instance public IP
- `ec2_application_url` - Application URL
- `ec2_ssh_command` - SSH command to connect
- `scheduler_schedule` - Scheduler configuration
- `monthly_cost_estimate` - Estimated monthly cost

---

## Decision Matrix

### Use Production (`production/`) if:
- ✅ Production environment
- ✅ High availability required
- ✅ Auto-scaling needed
- ✅ Multi-AZ deployment
- ✅ Service isolation required
- ✅ 24/7 operation
- ✅ Managed service preferred

### Use Demo (`demo/`) if:
- ✅ Demo/POC environment
- ✅ Budget is primary concern
- ✅ Low to moderate traffic
- ✅ Single instance acceptable
- ✅ Business hours only (with scheduler)
- ✅ Direct SSH access needed
- ✅ Full control over instance

---

## Support and Troubleshooting

### Common Issues

1. **Terraform State Lock:**
   ```bash
   # If state is locked, check for stale locks
   terraform force-unlock <lock-id>
   ```

2. **Provider Authentication:**
   ```bash
   # Verify AWS credentials
   aws sts get-caller-identity
   ```

3. **Resource Already Exists:**
   ```bash
   # Import existing resource
   terraform import aws_ecs_cluster.main <cluster-arn>
   ```

4. **EC2 Key Pair Not Found:**
   ```bash
   # List available key pairs
   aws ec2 describe-key-pairs --region eu-west-1
   ```

### Getting Help

- **Terraform Documentation**: https://www.terraform.io/docs
- **AWS Documentation**: https://docs.aws.amazon.com
- **GitHub Issues**: Check repository issues for known problems

---

## Version History

- **v1.0** - Initial release with two separate configurations
  - Production: ECS Fargate (no scheduler)
  - Demo: EC2 t3.small (with scheduler)

---

**Last Updated:** 2024-01-06  
**Maintained By:** Terraform Infrastructure Team

