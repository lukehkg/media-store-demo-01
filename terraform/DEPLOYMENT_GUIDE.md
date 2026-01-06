# Terraform Deployment Guide

## 📁 Two Separate Configurations

This repository contains **TWO completely separate Terraform configurations**:

### 1. `terraform/production/` - ECS Fargate (Production)
- **Location:** `terraform/production/`
- **Type:** AWS ECS Fargate
- **Scheduler:** ❌ None (runs 24/7)
- **Cost:** ~$95/month
- **Use for:** Production environments

### 2. `terraform/demo/` - EC2 t3.small (Demo/POC)
- **Location:** `terraform/demo/`
- **Type:** EC2 instance with Docker
- **Scheduler:** ✅ Lambda (8 AM - 6 PM GMT+1, Mon-Fri)
- **Cost:** ~$14/month
- **Use for:** Demo/POC environments

## 🚀 How to Deploy

### Production (ECS Fargate)

```bash
cd terraform/production
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your AWS Account ID
terraform init
terraform plan
terraform apply
```

### Demo (EC2)

```bash
cd terraform/demo
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars - REQUIRED: Set ec2_key_name
terraform init
terraform plan
terraform apply
```

## ⚠️ Important Notes

- **Each folder is completely independent**
- **Do NOT mix files between folders**
- **Old files in `terraform/` root are for reference only**
- **Use ONLY the files inside `production/` or `demo/` folders**

## 📊 Quick Comparison

| Feature | Production | Demo |
|---------|-----------|------|
| **Folder** | `terraform/production/` | `terraform/demo/` |
| **Compute** | ECS Fargate | EC2 t3.small |
| **Scheduler** | None (24/7) | Lambda (business hours) |
| **Cost** | $95/month | $14/month |
| **Files** | 9 .tf files | 5 .tf files |

## 🔍 Verify Structure

To see the two folders:
```bash
ls terraform/
# You should see: production/ and demo/
```

To see production files:
```bash
ls terraform/production/
```

To see demo files:
```bash
ls terraform/demo/
```

