# Terraform Infrastructure as Code

This directory contains Terraform configurations for deploying the Media Store application to AWS.

## 📁 Directory Structure

```
terraform/
├── demo/          # Demo/POC environment (cost-optimized with EC2 Spot)
├── production/    # Production environment (ECS Fargate)
└── README.md      # This file
```

## 🎯 Environments

### Demo Environment (`terraform/demo/`)
- **Purpose**: Cost-optimized demo/POC environment
- **Architecture**: ECS with EC2 Spot instances (t3.small)
- **Cost**: ~$20-30/month
- **Features**: Auto-scaling, CI/CD ready, public subnets only
- **Documentation**: [demo/README.md](demo/README.md)

### Production Environment (`terraform/production/`)
- **Purpose**: Production-ready deployment
- **Architecture**: ECS Fargate with private subnets
- **Features**: High availability, NAT Gateway, ALB
- **Documentation**: [production/README.md](production/README.md)

## 🚀 Quick Start

1. **Choose your environment** (demo or production)
2. **Navigate to the environment directory**:
   ```bash
   cd terraform/demo  # or terraform/production
   ```
3. **Follow the README.md** in that directory for specific instructions

## 📸 Deployment Screenshots

### Terraform Infrastructure Deployment

![Terraform Deployment 1](../docs/cap-Terraform-deploy-01.jpg)
*Terraform deployment progress - Infrastructure provisioning*

![Terraform Deployment 2](../docs/cap-Terraform-deploy-02.jpg)
*Terraform deployment completion - Resources created successfully*

### GitHub Actions CI/CD Pipeline

![CI/CD Progress 1](../docs/aws-CICD-progress-01.jpg)
*GitHub Actions CI/CD pipeline - Build and push stages*

![CI/CD Progress 2](../docs/aws-CICD-progress-02.jpg)
*GitHub Actions CI/CD pipeline - Deployment stages*

## 🔧 Prerequisites

- **Terraform** >= 1.0
- **AWS CLI** configured
- **AWS Account** with appropriate permissions
- **EC2 Key Pair** (for demo environment)

## 📝 Configuration

Each environment has its own:
- `variables.tf` - Input variables
- `terraform.tfvars.example` - Example configuration
- `README.md` - Environment-specific documentation

## 🔐 Security

- All sensitive values should be stored in:
  - GitHub Environment secrets (for CI/CD)
  - `terraform.tfvars` (local, not committed to git)
- Never commit:
  - AWS credentials
  - Private keys
  - Sensitive configuration values

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
