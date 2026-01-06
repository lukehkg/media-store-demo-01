# Terraform Deployment Configurations

This directory contains **TWO completely separate and independent Terraform configurations**:

## 📁 Directory Structure

```
terraform/
│
├── 📁 production/          ← Production: ECS Fargate (24/7, no scheduler)
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
└── 📁 demo/                ← Demo: EC2 t3.small (with scheduler)
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

## 🚀 Production Deployment (`production/`)

**Purpose:** Production environment with high availability

**Architecture:**
- ✅ ECS Fargate Cluster
- ✅ Application Load Balancer (ALB)
- ✅ NAT Gateway (single, cost-optimized)
- ✅ Auto-scaling (1-5 tasks)
- ✅ Multi-AZ deployment
- ❌ **No Lambda scheduler** (runs 24/7)

**Monthly Cost:** ~$95/month

**Quick Start:**
```bash
cd terraform/production
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your AWS Account ID
terraform init
terraform plan
terraform apply
```

## 💰 Demo Deployment (`demo/`)

**Purpose:** Demo/POC environment, maximum cost savings

**Architecture:**
- ✅ EC2 t3.small instance
- ✅ Elastic IP
- ✅ Lambda scheduler (8 AM - 6 PM GMT+1, Mon-Fri)
- ✅ VPC with public subnet only
- ❌ **No NAT Gateway** (saves $33/month)
- ❌ **No ALB** (saves $19/month)

**Monthly Cost:** ~$14/month (80% savings vs production)

**Quick Start:**
```bash
cd terraform/demo
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars - REQUIRED: Set ec2_key_name
terraform init
terraform plan
terraform apply
```

## 📊 Comparison

| Feature | Production | Demo |
|---------|-----------|------|
| **Compute** | ECS Fargate | EC2 t3.small |
| **Scheduler** | ❌ None (24/7) | ✅ Lambda (business hours) |
| **NAT Gateway** | ✅ Yes ($33/month) | ❌ No ($0) |
| **ALB** | ✅ Yes ($19/month) | ❌ No ($0) |
| **Cost** | $95/month | $14/month |
| **High Availability** | ✅ Yes | ❌ Single instance |
| **Auto-scaling** | ✅ Yes | ❌ Manual only |

## 🎯 Which One to Use?

### Use Production (`production/`) if:
- ✅ Production environment
- ✅ High availability required
- ✅ Auto-scaling needed
- ✅ Multi-AZ deployment
- ✅ Service isolation required
- ✅ 24/7 operation

### Use Demo (`demo/`) if:
- ✅ Demo/POC environment
- ✅ Budget is primary concern
- ✅ Low to moderate traffic
- ✅ Can accept single instance
- ✅ Business hours only (with scheduler)

## 📚 Documentation

- **Production:** See `production/README.md`
- **Demo:** See `demo/README.md`
- **Structure:** See `STRUCTURE.md`
- **Deployment Guide:** See `DEPLOYMENT_GUIDE.md`

## ⚠️ Important Notes

- **Each folder is completely independent** - don't mix files
- **Old files in root `terraform/`** are documentation/reference only
- **Use ONLY files inside `production/` or `demo/` folders**
- **Each configuration is self-contained** and ready to deploy

## 🔧 Common Commands

**View outputs:**
```bash
terraform output
```

**Destroy infrastructure:**
```bash
terraform destroy
```

**Update configuration:**
```bash
# Edit terraform.tfvars
terraform plan
terraform apply
```
