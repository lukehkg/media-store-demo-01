# CI/CD Setup Guide for GitHub Actions to AWS ECS

This guide explains how to set up CI/CD pipeline from GitHub to AWS ECS using GitHub Actions.

## Prerequisites

1. AWS Account with appropriate permissions
2. GitHub repository with your code
3. Terraform infrastructure deployed (ECS cluster, ECR repositories)

## Step 1: Create AWS IAM User for GitHub Actions

Create an IAM user with permissions to push to ECR and update ECS services:

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

Save the Access Key ID and Secret Access Key - you'll need them for GitHub Secrets.

## Step 2: Configure GitHub Secrets and Variables

### Required Secrets (Settings → Secrets and variables → Actions → Secrets)

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following **secrets** (encrypted, not visible in logs):

1. **AWS_ACCESS_KEY_ID**: Access key ID from Step 1
2. **AWS_SECRET_ACCESS_KEY**: Secret access key from Step 1
3. **AWS_ACCOUNT_ID**: Your AWS Account ID (12-digit number)

### Optional Variables (Settings → Secrets and variables → Actions → Variables)

You can set these as **variables** (visible in logs, can be overridden):

1. **AWS_REGION**: `eu-west-1` (default if not set)
2. **ECS_CLUSTER**: `demo-media01-cluster` (default if not set)
3. **ECS_SERVICE_BACKEND**: `demo-media01-backend-dev` (default if not set)
4. **ECS_SERVICE_FRONTEND_ADMIN**: `demo-media01-frontend-admin-dev` (default if not set)
5. **ECS_SERVICE_FRONTEND_CLIENT**: `demo-media01-frontend-client-dev` (default if not set)
6. **ECR_REPOSITORY_BACKEND**: `demo-media01-backend` (default if not set)
7. **ECR_REPOSITORY_FRONTEND_ADMIN**: `demo-media01-frontend-admin` (default if not set)
8. **ECR_REPOSITORY_FRONTEND_CLIENT**: `demo-media01-frontend-client` (default if not set)

**Note**: The workflow uses `vars.*` for variables and `secrets.*` for secrets. Variables have defaults, so you only need to set them if you want to override the defaults.

## Step 3: Verify GitHub Actions Workflow

The workflow file is located at `.github/workflows/deploy-ecs.yml`

The workflow is already configured to:
- Use GitHub secrets for AWS credentials
- Use GitHub variables (with defaults) for ECS/ECR configuration
- Build and push Docker images to ECR
- Update ECS task definitions with new image URIs
- Deploy to ECS services and wait for stabilization

**No changes needed** unless you want to override the default values by setting GitHub variables.

## Step 4: Verify ECR Repositories

After running `terraform apply`, verify ECR repositories were created:

```bash
aws ecr describe-repositories --region eu-west-1
```

You should see:
- `demo-media01-backend`
- `demo-media01-frontend-admin`
- `demo-media01-frontend-client`

## Step 5: Test the Pipeline

1. Make a change to your code
2. Commit and push to `main` or `develop` branch
3. Go to GitHub → Actions tab
4. Watch the workflow run

The workflow will:
1. **Build Docker images** for each service (backend, frontend-admin, frontend-client)
2. **Push images to ECR** with commit SHA tag and `latest` tag
3. **Update ECS task definitions** with new image URIs
4. **Register new task definition** revision
5. **Deploy to ECS services** using the new task definition
6. **Wait for services to stabilize** before completing

Each job runs in parallel and includes:
- ECR authentication
- Docker build and push
- Task definition update
- ECS service deployment
- Deployment status verification

## Manual Deployment Commands

If you need to deploy manually:

### Build and Push Backend
```bash
# Login to ECR
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.eu-west-1.amazonaws.com

# Build and push
cd backend
docker build -t demo-media01-backend:latest .
docker tag demo-media01-backend:latest <ACCOUNT_ID>.dkr.ecr.eu-west-1.amazonaws.com/demo-media01-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.eu-west-1.amazonaws.com/demo-media01-backend:latest

# Update ECS service
aws ecs update-service \
  --cluster demo-media01-cluster \
  --service demo-media01-backend-dev \
  --force-new-deployment \
  --region eu-west-1
```

## Troubleshooting

### ECR Push Fails
- Verify AWS credentials are correct
- Check IAM user has `AmazonEC2ContainerRegistryPowerUser` policy
- Verify ECR repositories exist

### ECS Deployment Fails
- Check ECS service exists: `aws ecs describe-services --cluster <cluster> --services <service>`
- Verify task definition references correct image URL
- Check CloudWatch logs for errors

### GitHub Actions Workflow Fails
- Check GitHub Secrets are set correctly
- Verify AWS region matches your infrastructure
- Check workflow logs for specific error messages

## Cost Optimization Tips

1. **Use single NAT Gateway** (already configured in Terraform)
2. **Reduce task counts** for demo/POC (set to 1)
3. **Lower max capacity** for auto-scaling (set to 3)
4. **Shorter log retention** (3 days instead of 7)
5. **ECR lifecycle policies** keep only last 10 images (already configured)

## Next Steps

- Set up branch-based deployments (dev/staging/prod)
- Add approval gates for production deployments
- Configure Slack/email notifications
- Add automated testing before deployment
- Set up rollback procedures

