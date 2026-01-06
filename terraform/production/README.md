# Production Deployment - ECS Fargate

This Terraform configuration deploys a production-ready AWS ECS Fargate infrastructure **without Lambda scheduler** (services run 24/7).

## Architecture

- **ECS Fargate Cluster** with 3 services (Backend, Frontend Admin, Frontend Client)
- **Application Load Balancer** (ALB) for load balancing
- **NAT Gateway** (single, cost-optimized)
- **ECR Repositories** for Docker images
- **Auto-scaling** based on CPU and memory
- **CloudWatch Logs** with 7-day retention
- **VPC** with public and private subnets

## Quick Start

1. **Copy example variables:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Update terraform.tfvars** with your AWS Account ID and configuration

3. **Initialize Terraform:**
   ```bash
   terraform init
   ```

4. **Plan deployment:**
   ```bash
   terraform plan
   ```

5. **Deploy:**
   ```bash
   terraform apply
   ```

## Monthly Cost Estimate

- **ECS Fargate**: ~$36/month (24/7)
- **NAT Gateway**: ~$33/month
- **ALB**: ~$19/month
- **ECR Storage**: ~$1.50/month
- **CloudWatch Logs**: ~$0.50/month
- **Data Transfer**: ~$4.50/month
- **Total**: ~$95/month

## CI/CD Setup

See `.github/workflows/deploy-ecs.yml` for GitHub Actions CI/CD pipeline.

Configure GitHub Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ACCOUNT_ID`

## Outputs

After deployment, run `terraform output` to see:
- ALB DNS name
- ECR repository URLs
- ECS cluster and service names
- GitHub secrets configuration guide

