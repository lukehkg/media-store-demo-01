#!/bin/bash

# Deployment script for ECS services with separated frontends
# Usage: ./deploy.sh [backend|admin|client|all]

set -e

AWS_REGION=${AWS_REGION:-us-east-1}
ECR_REPO=${ECR_REPO:-YOUR_ECR_REPO}
CLUSTER_NAME=${CLUSTER_NAME:-photo-portal-cluster}
SERVICE_NAME_BACKEND=${SERVICE_NAME_BACKEND:-photo-portal-backend}
SERVICE_NAME_ADMIN=${SERVICE_NAME_ADMIN:-photo-portal-frontend-admin}
SERVICE_NAME_CLIENT=${SERVICE_NAME_CLIENT:-photo-portal-frontend-client}

deploy_backend() {
    echo "Building and deploying backend..."
    
    # Build Docker image
    cd backend
    docker build -t ${ECR_REPO}/photo-portal-backend:latest .
    
    # Login to ECR
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}
    
    # Push to ECR
    docker push ${ECR_REPO}/photo-portal-backend:latest
    
    # Update ECS service
    aws ecs update-service \
        --cluster ${CLUSTER_NAME} \
        --service ${SERVICE_NAME_BACKEND} \
        --force-new-deployment \
        --region ${AWS_REGION}
    
    cd ..
    echo "Backend deployment initiated"
}

deploy_admin() {
    echo "Building and deploying frontend-admin..."
    
    # Build Docker image
    cd frontend-admin
    docker build -t ${ECR_REPO}/photo-portal-frontend-admin:latest .
    
    # Login to ECR
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}
    
    # Push to ECR
    docker push ${ECR_REPO}/photo-portal-frontend-admin:latest
    
    # Update ECS service
    aws ecs update-service \
        --cluster ${CLUSTER_NAME} \
        --service ${SERVICE_NAME_ADMIN} \
        --force-new-deployment \
        --region ${AWS_REGION}
    
    cd ..
    echo "Frontend-admin deployment initiated"
}

deploy_client() {
    echo "Building and deploying frontend-client..."
    
    # Build Docker image
    cd frontend-client
    docker build -t ${ECR_REPO}/photo-portal-frontend-client:latest .
    
    # Login to ECR
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}
    
    # Push to ECR
    docker push ${ECR_REPO}/photo-portal-frontend-client:latest
    
    # Update ECS service
    aws ecs update-service \
        --cluster ${CLUSTER_NAME} \
        --service ${SERVICE_NAME_CLIENT} \
        --force-new-deployment \
        --region ${AWS_REGION}
    
    cd ..
    echo "Frontend-client deployment initiated"
}

case "$1" in
    backend)
        deploy_backend
        ;;
    admin)
        deploy_admin
        ;;
    client)
        deploy_client
        ;;
    all)
        deploy_backend
        deploy_admin
        deploy_client
        ;;
    *)
        echo "Usage: $0 [backend|admin|client|all]"
        exit 1
        ;;
esac
