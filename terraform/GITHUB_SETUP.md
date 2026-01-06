# GitHub Actions Setup Guide

This guide explains how to configure GitHub Actions for automated CI/CD deployments to AWS ECS.

## Overview

The GitHub Actions workflow (`.github/workflows/deploy-ecs.yml`) automatically:
1. Builds Docker images when code is pushed
2. Pushes images to Amazon ECR
3. Updates ECS task definitions with new image URIs
4. Deploys to ECS services
5. Waits for deployments to stabilize

## Required GitHub Secrets

These are **encrypted** and not visible in workflow logs.

### How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_ACCOUNT_ID` | Your AWS Account ID (12 digits) | `123456789012` |

## Optional GitHub Variables

These are **visible** in workflow logs and can be overridden. Defaults are provided.

### How to Add Variables

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **Variables** tab → **New repository variable**
4. Add variables if you want to override defaults:

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

**Note**: You don't need to set these variables unless you want to override the defaults.

## Getting Values from Terraform

After running `terraform apply`, you can get the values for GitHub variables:

```bash
# Get ECS cluster name
terraform output ecs_cluster_name

# Get ECS service names
terraform output backend_service_name
terraform output frontend_admin_service_name
terraform output frontend_client_service_name

# Get ECR repository names (from repository URLs)
terraform output backend_ecr_repository_url
terraform output frontend_admin_ecr_repository_url
terraform output frontend_client_ecr_repository_url

# Get AWS Account ID (from terraform.tfvars)
# Or from AWS CLI:
aws sts get-caller-identity --query Account --output text
```

## Workflow Triggers

The workflow runs automatically on:
- **Push to `main` branch**
- **Push to `develop` branch**
- **Manual trigger** (workflow_dispatch)

## Workflow Steps

For each service (backend, frontend-admin, frontend-client):

1. **Checkout code** - Gets the latest code
2. **Configure AWS credentials** - Sets up AWS CLI with secrets
3. **Login to ECR** - Authenticates with Amazon ECR
4. **Build and push image** - Builds Docker image and pushes to ECR
5. **Update task definition** - Gets current task definition and updates image URI
6. **Register task definition** - Creates new revision with updated image
7. **Deploy to ECS** - Updates ECS service with new task definition
8. **Wait for stabilization** - Waits until deployment is stable

## Troubleshooting

### Workflow Fails at ECR Login

**Error**: `Unable to locate credentials`

**Solution**: 
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets are set correctly
- Check IAM user has `AmazonEC2ContainerRegistryPowerUser` policy

### Workflow Fails at ECS Deploy

**Error**: `Service not found` or `Cluster not found`

**Solution**:
- Verify `ECS_CLUSTER` variable matches your cluster name
- Verify `ECS_SERVICE_*` variables match your service names
- Check AWS region is correct

### Workflow Fails at Task Definition Update

**Error**: `Task definition not found`

**Solution**:
- Ensure ECS services exist (run `terraform apply` first)
- Verify service names match Terraform outputs

### Images Not Updating

**Issue**: ECS service doesn't use new image

**Solution**:
- Check task definition is being updated correctly
- Verify `--force-new-deployment` flag is used
- Check CloudWatch logs for ECS service errors

## Testing the Workflow

1. **Make a small change** to your code (e.g., add a comment)
2. **Commit and push**:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```
3. **Check GitHub Actions**:
   - Go to **Actions** tab in GitHub
   - Watch the workflow run
   - Check logs for any errors

## Manual Deployment

You can also trigger the workflow manually:

1. Go to **Actions** tab
2. Select **Deploy to AWS ECS** workflow
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## Security Best Practices

1. **Use IAM roles** instead of access keys when possible (for GitHub-hosted runners, use OIDC)
2. **Rotate access keys** regularly
3. **Use least privilege** IAM policies
4. **Enable MFA** for IAM user
5. **Monitor CloudTrail** for API calls from GitHub Actions

## Next Steps

- Set up branch-based deployments (dev/staging/prod)
- Add approval gates for production
- Configure Slack/email notifications
- Add automated testing before deployment
- Set up rollback procedures

