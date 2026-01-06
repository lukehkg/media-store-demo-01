# AWS ECS Deployment Guide

## Overview

This project is configured for deployment to AWS ECS using Fargate with separated frontend services for independent scaling.

## Architecture

```
┌─────────────────────────────────────────┐
│         Application Load Balancer        │
│  (Routes: admin.*, *.domain, /api/*)   │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼────┐
│Admin  │ │Client │ │Backend │
│ECS    │ │ECS    │ │ECS     │
│(1-3)  │ │(2-20) │ │(2-10)  │
└───────┘ └───────┘ └────────┘
```

## Services

### 1. Backend Service
- **Task Definition**: `backend-task-definition.json`
- **Service**: `photo-portal-backend`
- **Scaling**: 2-10 tasks (CPU-based)
- **Resources**: 512 CPU, 1024 MB memory

### 2. Frontend Admin Service
- **Task Definition**: `frontend-admin-task-definition.json`
- **Service**: `photo-portal-frontend-admin`
- **Scaling**: 1-3 tasks (CPU-based)
- **Resources**: 256 CPU, 512 MB memory
- **Low traffic** - minimal scaling

### 3. Frontend Client Service
- **Task Definition**: `frontend-client-task-definition.json`
- **Service**: `photo-portal-frontend-client`
- **Scaling**: 2-20 tasks (CPU + Request-based)
- **Resources**: 512 CPU, 1024 MB memory
- **High traffic** - aggressive scaling

## Files

- `backend-task-definition.json` - Backend ECS task definition
- `frontend-admin-task-definition.json` - Admin frontend task definition
- `frontend-client-task-definition.json` - Client frontend task definition
- `ecs-services.json` - ECS service configurations
- `auto-scaling.json` - Auto-scaling policies
- `deploy.sh` - Manual deployment script
- `alb-rules.md` - ALB routing configuration

## CI/CD

GitHub Actions workflows in `.github/workflows/`:
- `deploy-backend.yml` - Deploys backend on backend changes
- `deploy-frontend-admin.yml` - Deploys admin frontend on admin changes
- `deploy-frontend-client.yml` - Deploys client frontend on client changes

## Setup Steps

1. **Create ECR Repositories**:
   ```bash
   aws ecr create-repository --repository-name photo-portal-backend
   aws ecr create-repository --repository-name photo-portal-frontend-admin
   aws ecr create-repository --repository-name photo-portal-frontend-client
   ```

2. **Create ECS Cluster**:
   ```bash
   aws ecs create-cluster --cluster-name photo-portal-cluster
   ```

3. **Register Task Definitions**:
   ```bash
   aws ecs register-task-definition --cli-input-json file://ecs/backend-task-definition.json
   aws ecs register-task-definition --cli-input-json file://ecs/frontend-admin-task-definition.json
   aws ecs register-task-definition --cli-input-json file://ecs/frontend-client-task-definition.json
   ```

4. **Create Services**:
   ```bash
   aws ecs create-service --cli-input-json file://ecs/ecs-services.json
   ```

5. **Configure Auto-Scaling**:
   ```bash
   aws application-autoscaling register-scalable-target --cli-input-json file://ecs/auto-scaling.json
   ```

6. **Configure ALB**:
   - Follow instructions in `alb-rules.md`

## Deployment

### Manual Deployment
```bash
./ecs/deploy.sh backend    # Deploy backend only
./ecs/deploy.sh admin      # Deploy admin frontend only
./ecs/deploy.sh client     # Deploy client frontend only
./ecs/deploy.sh all        # Deploy all services
```

### CI/CD Deployment
- Push to `main` branch triggers automatic deployment
- Only changed services are deployed (path-based triggers)
- Shared lib changes trigger both frontend deployments

## Scaling

### Independent Scaling
- **Admin**: Scales 1-3 tasks (low traffic)
- **Client**: Scales 2-20 tasks (high traffic)
- **Backend**: Scales 2-10 tasks (API load)

### Auto-Scaling Triggers
- CPU utilization > 70%
- Request count per target > 2000 (client only)
- Scale-out cooldown: 60 seconds
- Scale-in cooldown: 300 seconds

## Benefits

✅ **Independent Scaling**: Scale admin and client separately
✅ **Cost Optimization**: Admin uses fewer resources
✅ **Security Isolation**: Separate services for admin and client
✅ **Independent Deployment**: Deploy one without affecting others
✅ **Fargate**: No server management required

