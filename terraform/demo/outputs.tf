output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "application_url" {
  description = "URL of the application"
  value       = var.certificate_arn != "" ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}"
}

output "backend_service_name" {
  description = "Name of the backend ECS service"
  value       = aws_ecs_service.backend.name
}

output "frontend_admin_service_name" {
  description = "Name of the frontend admin ECS service"
  value       = aws_ecs_service.frontend_admin.name
}

output "frontend_client_service_name" {
  description = "Name of the frontend client ECS service"
  value       = aws_ecs_service.frontend_client.name
}

output "backend_ecr_repository_url" {
  description = "URL of the backend ECR repository"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_admin_ecr_repository_url" {
  description = "URL of the frontend admin ECR repository"
  value       = aws_ecr_repository.frontend_admin.repository_url
}

output "frontend_client_ecr_repository_url" {
  description = "URL of the frontend client ECR repository"
  value       = aws_ecr_repository.frontend_client.repository_url
}

output "ecr_login_command" {
  description = "AWS CLI command to login to ECR"
  value       = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

output "autoscaling_group_name" {
  description = "Name of the Auto Scaling Group for ECS instances"
  value       = aws_autoscaling_group.ecs_instances.name
}

output "ec2_instance_info" {
  description = "Information about EC2 instances in ECS cluster"
  value = {
    instance_type        = var.ec2_instance_type
    min_capacity         = var.min_capacity
    max_capacity         = var.max_capacity
    desired_capacity     = var.desired_capacity
    on_demand_percentage = var.on_demand_percentage
    spot_percentage      = 100 - var.on_demand_percentage
    spot_max_price       = var.spot_max_price_per_hour != "" ? var.spot_max_price_per_hour : "on-demand price"
    note                 = "EC2 instances run ECS tasks with auto-scaling"
  }
}

output "github_secrets_guide" {
  description = "GitHub Secrets to configure for CI/CD"
  value = <<-EOT
    Required GitHub Secrets:
    - AWS_ACCESS_KEY_ID: AWS IAM user access key
    - AWS_SECRET_ACCESS_KEY: AWS IAM user secret key
    - AWS_ACCOUNT_ID: ${var.aws_account_id}
    
    Optional GitHub Variables (can be set as repository variables):
    - AWS_REGION: ${var.aws_region}
    - ECS_CLUSTER: ${aws_ecs_cluster.main.name}
    - ECS_SERVICE_BACKEND: ${aws_ecs_service.backend.name}
    - ECS_SERVICE_FRONTEND_ADMIN: ${aws_ecs_service.frontend_admin.name}
    - ECS_SERVICE_FRONTEND_CLIENT: ${aws_ecs_service.frontend_client.name}
    - ECR_REPOSITORY_BACKEND: ${aws_ecr_repository.backend.name}
    - ECR_REPOSITORY_FRONTEND_ADMIN: ${aws_ecr_repository.frontend_admin.name}
    - ECR_REPOSITORY_FRONTEND_CLIENT: ${aws_ecr_repository.frontend_client.name}
  EOT
}
