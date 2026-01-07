# Demo Deployment - ECS Fargate with Spot Instances

This Terraform configuration deploys a cost-optimized demo/POC environment using **AWS ECS Fargate with Spot instances** for up to **70% cost savings** compared to regular Fargate.

## Architecture

- **ECS Fargate Cluster** with Spot capacity provider (70% savings)
- **3 ECS Services**: Backend, Frontend Admin, Frontend Client
- **Application Load Balancer** (ALB) for load balancing and routing
- **NAT Gateway** (single, cost-optimized) for private subnet internet access
- **ECR Repositories** (3) for Docker images with lifecycle policies
- **Auto-scaling** based on CPU and memory utilization (1-3 tasks)
- **CloudWatch Logs** with 3-day retention
- **VPC** with public and private subnets across 2 AZs

## Spot Instance Configuration

**Capacity Provider Strategy:**
- **Fargate Spot**: Weight 4, Base 0 (preferred for cost savings)
- **Fargate**: Weight 1, Base 1 (fallback for availability)

**Result:** Tasks prefer Spot instances (70% savings) with automatic fallback to regular Fargate if Spot capacity is unavailable.

## Cost Savings

**Monthly Cost Estimate (with Spot):**
- ECS Fargate Spot Compute: ~$10.80 (70% savings vs regular Fargate)
- NAT Gateway: $33.30
- Application Load Balancer: $19.34
- ECR Storage: $1.50
- CloudWatch Logs: $0.50
- Data Transfer: $4.51
- **Total: ~$70/month**

**Savings vs Regular Fargate:** ~$25/month (26% reduction)
**Savings vs Production Setup:** ~$25/month (26% reduction)

## Prerequisites

1. **AWS CLI** configured with credentials
2. **Terraform** >= 1.0 installed
3. **Docker images** built and pushed to ECR (or use CI/CD)

## Quick Start

1. **Copy example variables:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Update terraform.tfvars:**
   - Set `aws_account_id` (your 12-digit AWS Account ID)
   - Optionally adjust Spot configuration:
     - `spot_weight` (default: 4) - Higher = more Spot instances
     - `spot_base_capacity` (default: 0) - Minimum tasks on Spot
     - `fargate_weight` (default: 1) - Fallback weight
     - `fargate_base_capacity` (default: 1) - Minimum tasks on regular Fargate

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

6. **Push Docker images to ECR:**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region eu-west-1 | \
     docker login --username AWS --password-stdin \
     <account-id>.dkr.ecr.eu-west-1.amazonaws.com

   # Build and push images
   docker build -t <account-id>.dkr.ecr.eu-west-1.amazonaws.com/demo-media01-backend:latest ./backend
   docker push <account-id>.dkr.ecr.eu-west-1.amazonaws.com/demo-media01-backend:latest
   # Repeat for frontend-admin and frontend-client
   ```

7. **Access application:**
   ```bash
   terraform output application_url
   ```

## Spot Instance Behavior

**How Spot Works:**
- AWS automatically places tasks on Spot capacity when available
- If Spot capacity is unavailable, tasks automatically use regular Fargate
- Spot instances can be interrupted with 2-minute notice (rare for Fargate Spot)
- ECS automatically replaces interrupted tasks

**Best Practices:**
- Use `fargate_base_capacity = 1` to ensure at least one task on regular Fargate
- Set `spot_weight` higher than `fargate_weight` to prefer Spot
- Monitor CloudWatch metrics for Spot interruption rates

## Auto-Scaling

Auto-scaling is enabled by default:
- **Min Capacity**: 1 task per service
- **Max Capacity**: 3 tasks per service
- **Target CPU**: 70%
- **Target Memory**: 80%

Tasks scale based on CPU and memory utilization. Spot instances scale automatically with the same policies.

## Outputs

After deployment, run `terraform output` to see:
- ALB DNS name
- Application URL
- ECS cluster and service names
- ECR repository URLs
- Spot capacity provider configuration
- GitHub secrets configuration guide

## CI/CD Setup

See `.github/workflows/deploy-ecs.yml` for GitHub Actions CI/CD pipeline.

Configure GitHub Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ACCOUNT_ID`

## Notes

- **Spot Instances**: Up to 70% cost savings, but can be interrupted (rare)
- **Auto-scaling**: Automatically scales based on CPU/memory
- **High Availability**: Multi-AZ deployment
- **Managed Service**: No EC2 management required
- **Cost Optimized**: Single NAT Gateway, shorter log retention

## Troubleshooting

**Tasks not starting:**
- Check ECR images exist and are accessible
- Verify task definitions reference correct image URIs
- Check CloudWatch logs for errors

**Spot interruptions:**
- Normal behavior - ECS automatically replaces interrupted tasks
- If frequent, increase `fargate_base_capacity` or `fargate_weight`

**High costs:**
- Verify tasks are using Spot (check CloudWatch metrics)
- Review NAT Gateway usage (single NAT is cost-optimized)
- Check auto-scaling isn't scaling too high
