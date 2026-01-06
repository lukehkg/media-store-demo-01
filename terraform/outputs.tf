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

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "backend_target_group_arn" {
  description = "ARN of the backend target group"
  value       = aws_lb_target_group.backend.arn
}

output "frontend_admin_target_group_arn" {
  description = "ARN of the frontend admin target group"
  value       = aws_lb_target_group.frontend_admin.arn
}

output "frontend_client_target_group_arn" {
  description = "ARN of the frontend client target group"
  value       = aws_lb_target_group.frontend_client.arn
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

output "backend_log_group_name" {
  description = "Name of the CloudWatch log group for backend"
  value       = aws_cloudwatch_log_group.backend.name
}

output "frontend_admin_log_group_name" {
  description = "Name of the CloudWatch log group for frontend admin"
  value       = aws_cloudwatch_log_group.frontend_admin.name
}

output "frontend_client_log_group_name" {
  description = "Name of the CloudWatch log group for frontend client"
  value       = aws_cloudwatch_log_group.frontend_client.name
}

output "application_url" {
  description = "URL of the application"
  value       = var.certificate_arn != "" ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}"
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

output "lambda_scheduler_function_name" {
  description = "Name of the Lambda scheduler function"
  value       = var.scheduler_enabled ? aws_lambda_function.ecs_scheduler[0].function_name : null
}

output "lambda_scheduler_function_arn" {
  description = "ARN of the Lambda scheduler function"
  value       = var.scheduler_enabled ? aws_lambda_function.ecs_scheduler[0].arn : null
}

output "scheduler_schedule" {
  description = "Scheduler schedule information"
  value = var.scheduler_enabled ? {
    enabled        = true
    start_time_utc = var.start_time_utc
    stop_time_utc  = var.stop_time_utc
    weekdays_only  = var.scheduler_weekdays_only
    start_rule_arn = aws_cloudwatch_event_rule.start_ecs_services[0].arn
    stop_rule_arn  = aws_cloudwatch_event_rule.stop_ecs_services[0].arn
  } : {
    enabled = false
  }
}

