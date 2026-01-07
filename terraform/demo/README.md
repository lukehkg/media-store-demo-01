# Demo Deployment - ECS with EC2 Spot Instances

This Terraform configuration deploys a cost-optimized demo/POC environment using **AWS ECS with EC2 Spot instances** (t3.small) for hosting three services with auto-scaling and CI/CD support.

## Architecture

- **ECS Cluster** with EC2 Spot instances (t3.small) in public subnets
- **3 ECS Services**: Backend, Frontend Admin, Frontend Client
- **ECR Repositories** (3) for Docker images with lifecycle policies
- **Application Load Balancer** (ALB) for load balancing and routing
- **No NAT Gateway** - EC2 instances in public subnets (saves ~$33/month)
- **Auto-scaling** for both EC2 instances and ECS services
- **CloudWatch Logs** with 3-day retention
- **VPC** with public subnets only across 2 AZs

## Cost Savings

**Monthly Cost Estimate: ~$20-30**
- EC2 Spot Instances (t3.small): $2-4 (up to 90% savings vs on-demand)
- Application Load Balancer: $19.34
- EBS Storage: $3.00 (30 GB per instance)
- ECR Storage: $1.50
- CloudWatch Logs: $0.50
- Data Transfer: $4.51
- **Total: ~$20-30/month** (saves ~$33/month without NAT Gateway)

**Savings vs On-Demand EC2:** Up to 90% reduction  
**Savings vs ECS Fargate:** ~70% reduction  
**Savings vs Production Setup:** ~80% reduction  
**Savings vs Private Subnet Setup:** ~$33/month (no NAT Gateway)

## Features

- ✅ **ECS Cluster** with EC2 instances (not Fargate)
- ✅ **ECR Repositories** for CI/CD deployments
- ✅ **Auto-scaling** for EC2 instances (1-3 instances)
- ✅ **Auto-scaling** for ECS services (1-3 tasks per service)
- ✅ **Spot Instances** for maximum cost savings (up to 90%)
- ✅ **Public Subnets Only** - no NAT Gateway needed (saves ~$33/month)
- ✅ **ALB** for load balancing
- ✅ **Multi-AZ** deployment
- ✅ **CI/CD Ready** (GitHub Actions compatible)

## Prerequisites

1. **EC2 Key Pair** - Create in AWS Console:
   ```bash
   aws ec2 create-key-pair --key-name demo-media01-key --query 'KeyMaterial' --output text > demo-media01-key.pem
   chmod 400 demo-media01-key.pem
   ```

2. **AWS CLI** configured with credentials

3. **Terraform** >= 1.0 installed

4. **Docker images** built and pushed to ECR (or use CI/CD)

## Quick Start

1. **Copy example variables:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Update terraform.tfvars:**
   - Set `aws_account_id` (your 12-digit AWS Account ID)
   - Set `ec2_key_name` (your EC2 key pair name) - **REQUIRED**
   - Optionally adjust Spot configuration:
     - `on_demand_percentage` (default: 0 = all Spot instances)
     - `spot_max_price_per_hour` (default: empty = on-demand price as max)

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

## Auto-Scaling Configuration

### EC2 Instance Auto-Scaling
- **Min Capacity**: 1 instance
- **Max Capacity**: 3 instances
- **Desired Capacity**: 1 instance
- **Scaling**: Based on ECS cluster CPU reservation
- **Instance Type**: t3.small (Spot instances)

### ECS Service Auto-Scaling
- **Min Capacity**: 1 task per service
- **Max Capacity**: 3 tasks per service
- **Target CPU**: 70%
- **Target Memory**: 80%

## Spot Instance Configuration

**Default Settings:**
- **On-Demand Percentage**: 0% (all Spot instances)
- **Spot Max Price**: On-demand price (maximum)
- **Instance Type**: t3.small
- **Interruption**: Terminate with 2-minute notice

**Customizing:**
```hcl
on_demand_percentage = 20  # 20% on-demand, 80% Spot
spot_max_price_per_hour = "0.01"  # Maximum $0.01/hour
```

## CI/CD Setup

See `.github/workflows/deploy-ecs.yml` for GitHub Actions CI/CD pipeline.

### GitHub Environment Configuration

Configure the **DEMO** environment in GitHub with the following secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ACCOUNT_ID`

### CI/CD Pipeline Flow

The workflow will:
1. Build Docker images
2. Push to ECR
3. Update ECS task definitions
4. Deploy to ECS services

### Deployment Screenshots

**GitHub Actions CI/CD Pipeline:**

![CI/CD Progress 1](../../docs/aws-CICD-progress-01.jpg)
*GitHub Actions CI/CD pipeline - Build and push stages*

![CI/CD Progress 2](../../docs/aws-CICD-progress-02.jpg)
*GitHub Actions CI/CD pipeline - Deployment stages*

**Terraform Infrastructure Deployment:**

![Terraform Deployment 1](../../docs/cap-Terraform-deploy-01.jpg)
*Terraform deployment progress - Infrastructure provisioning*

![Terraform Deployment 2](../../docs/cap-Terraform-deploy-02.jpg)
*Terraform deployment completion - Resources created successfully*

## Outputs

After deployment, run `terraform output` to see:
- ALB DNS name
- Application URL
- ECS cluster and service names
- ECR repository URLs
- Auto-scaling group information
- EC2 instance configuration
- GitHub secrets configuration guide

## Notes

- **Spot Instances**: Up to 90% cost savings, but can be interrupted
- **Public Subnets**: EC2 instances in public subnets (no NAT Gateway needed)
- **Auto-scaling**: Automatically scales EC2 instances and ECS tasks
- **High Availability**: Multi-AZ deployment
- **CI/CD Ready**: ECR integration for automated deployments
- **Cost Optimized**: No NAT Gateway (~$33/month savings), Spot instances, shorter log retention

## Troubleshooting

**EC2 instances not joining cluster:**
- Check IAM role has ECS instance policy attached
- Verify security group allows outbound traffic
- Check user-data script executed correctly

**Tasks not starting:**
- Check ECR images exist and are accessible
- Verify task definitions reference correct image URIs
- Check CloudWatch logs for errors

**Spot interruptions:**
- Normal behavior - Auto Scaling Group automatically replaces instances
- ECS tasks automatically reschedule to available instances

**High costs:**
- Verify instances are using Spot (check Auto Scaling Group)
- Review NAT Gateway usage (single NAT is cost-optimized)
- Check auto-scaling isn't scaling too high
