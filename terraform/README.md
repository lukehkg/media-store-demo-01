# Terraform Configuration for AWS ECS Fargate (Cost-Optimized for Demo/POC)

This Terraform configuration deploys a complete AWS ECS Fargate infrastructure for the Media Store Demo application, optimized for cost-effective demo and proof-of-concept deployments in **eu-west-1 (London)** region.

## Architecture Overview

- **Region**: eu-west-1 (London) - Cost-optimized for demo/POC
- **VPC**: Custom VPC with public and private subnets (smaller CIDR blocks for cost savings)
- **Networking**: Internet Gateway, **Single NAT Gateway** (cost optimization), Route Tables
- **Load Balancer**: Application Load Balancer (ALB) with target groups
- **ECS Cluster**: Fargate cluster running three services:
  - Backend API service
  - Frontend Admin service
  - Frontend Client service
- **ECR Repositories**: Three ECR repositories for Docker images with lifecycle policies
- **Auto Scaling**: Automatic scaling based on CPU and memory utilization (max 3 tasks)
- **Security**: Security groups for ALB and ECS tasks
- **Logging**: CloudWatch Log Groups with 3-day retention (cost optimization)
- **CI/CD**: GitHub Actions workflow for automated deployments

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **Docker images** pushed to Amazon ECR (or Docker Hub)

## File Structure

```
terraform/
├── versions.tf          # Provider and Terraform version requirements
├── variables.tf         # Input variables
├── vpc.tf              # VPC, subnets, IGW, NAT gateways (single NAT for cost)
├── security.tf         # Security groups
├── alb.tf              # Application Load Balancer
├── ecr.tf              # ECR repositories with lifecycle policies
├── ecs.tf              # ECS cluster, task definitions, services
├── autoscaling.tf      # Auto-scaling policies
├── outputs.tf          # Output values
├── terraform.tfvars.example  # Example variable values (eu-west-1)
├── CICD_SETUP.md       # CI/CD setup guide for GitHub Actions
└── README.md           # This file

.github/
└── workflows/
    └── deploy-ecs.yml   # GitHub Actions workflow for CI/CD
```

## Quick Start

1. **Copy the example variables file:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`** with your specific values:
   - Set `aws_account_id` to your AWS Account ID
   - Update Docker image URLs (leave empty to use ECR repositories)
   - Adjust resource sizes (CPU, memory) - defaults are optimized for cost
   - Configure auto-scaling parameters (max_capacity defaults to 3)
   - Add SSL certificate ARN if using HTTPS

3. **Initialize Terraform:**
   ```bash
   cd terraform
   terraform init
   ```

4. **Review the plan:**
   ```bash
   terraform plan
   ```

5. **Apply the configuration:**
   ```bash
   terraform apply
   ```

6. **Get the application URL:**
   ```bash
   terraform output application_url
   ```

## Configuration Details

### VPC Configuration (Cost-Optimized)

- **CIDR**: 10.0.0.0/16 (configurable)
- **Public Subnets**: For ALB (2 subnets, /28 CIDR = 16 IPs each)
- **Private Subnets**: For ECS tasks (2 subnets, /28 CIDR = 16 IPs each)
- **NAT Gateway**: **Single NAT Gateway** (saves ~$32/month vs multiple NATs)

### ECS Services

#### Backend Service
- **Port**: 8000
- **CPU**: 512 (0.5 vCPU)
- **Memory**: 1024 MB
- **Health Check**: `/health` endpoint
- **Desired Count**: 2 (configurable)

#### Frontend Admin Service
- **Port**: 3000
- **CPU**: 256 (0.25 vCPU)
- **Memory**: 512 MB
- **Health Check**: `/` endpoint
- **Desired Count**: 1 (configurable)

#### Frontend Client Service
- **Port**: 3000
- **CPU**: 256 (0.25 vCPU)
- **Memory**: 512 MB
- **Health Check**: `/` endpoint
- **Desired Count**: 1 (configurable)

### Load Balancer Routing

- **Default**: Routes to backend service
- **/admin***: Routes to frontend admin service
- **/client***: Routes to frontend client service

### Auto Scaling (Cost-Optimized)

Auto-scaling is enabled by default with:
- **Min Capacity**: 1 task
- **Max Capacity**: 3 tasks (reduced from 10 for cost savings)
- **Target CPU**: 70%
- **Target Memory**: 80%

### ECR Repositories

Three ECR repositories are created automatically:
- `media-store-demo-backend`
- `media-store-demo-frontend-admin`
- `media-store-demo-frontend-client`

Each repository has:
- Image scanning enabled
- Lifecycle policy (keeps last 10 images)
- Encryption enabled

## Important Variables

### Required Variables

- `backend_image`: Docker image URL for backend service
- `frontend_admin_image`: Docker image URL for frontend admin service
- `frontend_client_image`: Docker image URL for frontend client service

### Optional Variables

- `certificate_arn`: ACM certificate ARN for HTTPS (if not provided, HTTP only)
- `domain_name`: Domain name for the application
- `enable_auto_scaling`: Enable/disable auto-scaling (default: true)
- `log_retention_days`: CloudWatch log retention (default: 7 days)

## Outputs

After applying, you'll get:
- VPC and subnet IDs
- ECS cluster name and ID
- ALB DNS name and ARN
- Target group ARNs
- Service names
- CloudWatch log group names
- Application URL

## Cost Considerations (Optimized for Demo/POC)

**Estimated Monthly Costs (eu-west-1, London):**
- **Single NAT Gateway**: ~$32/month (saves $32 vs multiple NATs)
- **ALB**: ~$16/month + data transfer
- **ECS Fargate**: ~$15-30/month (1 task per service, minimal usage)
- **CloudWatch Logs**: ~$1-5/month (3-day retention)
- **ECR Storage**: ~$1-3/month (lifecycle policy keeps only 10 images)
- **Data Transfer**: Variable based on usage

**Total Estimated**: ~$65-90/month for demo/POC usage

**Cost Optimizations Applied:**
- ✅ Single NAT Gateway (saves ~$32/month)
- ✅ Smaller subnet CIDR blocks (/28 instead of /24)
- ✅ Reduced task counts (1 per service)
- ✅ Lower max auto-scaling capacity (3 instead of 10)
- ✅ Shorter log retention (3 days instead of 7)
- ✅ ECR lifecycle policies (keeps only 10 images)

## Security Best Practices

1. **Update Security Groups**: Restrict `allowed_cidr_blocks` to specific IP ranges
2. **Use HTTPS**: Provide `certificate_arn` for SSL/TLS
3. **Private Subnets**: ECS tasks run in private subnets (already configured)
4. **IAM Roles**: Review and restrict IAM permissions as needed
5. **Secrets Management**: Use AWS Secrets Manager or Parameter Store for sensitive data

## Troubleshooting

### ECS Tasks Not Starting
- Check CloudWatch logs: `aws logs tail /ecs/media-store-demo-backend-dev --follow`
- Verify Docker image URLs are correct
- Check security group rules
- Verify task execution role has ECR permissions

### ALB Health Checks Failing
- Verify health check paths exist in your applications
- Check security groups allow traffic from ALB to tasks
- Review task logs for application errors

### High Costs
- Review NAT Gateway usage (consider single NAT Gateway)
- Check auto-scaling metrics
- Review CloudWatch log retention settings

## Cleanup

To destroy all resources:
```bash
terraform destroy
```

**Warning**: This will delete all resources created by Terraform, including the VPC, ECS cluster, and all services.

## CI/CD Setup

This configuration includes GitHub Actions workflow for automated deployments. See `CICD_SETUP.md` for detailed setup instructions.

**Quick Setup:**
1. Create AWS IAM user for GitHub Actions
2. Add AWS credentials to GitHub Secrets
3. Push code to trigger automatic build and deployment

The workflow will:
- Build Docker images
- Push to ECR
- Update ECS services automatically

## Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [ECS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [ECR Pricing](https://aws.amazon.com/ecr/pricing/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

