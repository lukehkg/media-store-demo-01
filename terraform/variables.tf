variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Name of the project (used as prefix for all resources)"
  type        = string
  default     = "demo-media01"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["eu-west-1a", "eu-west-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/28", "10.0.2.0/28"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/28", "10.0.20.0/28"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use single NAT Gateway for cost optimization (recommended for demo/POC)"
  type        = bool
  default     = true
}

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
  default     = "demo-media01-cluster"
}

variable "aws_account_id" {
  description = "AWS Account ID for ECR repositories"
  type        = string
  default     = ""
}

variable "backend_image" {
  description = "Docker image for backend service"
  type        = string
  default     = ""
}

variable "frontend_admin_image" {
  description = "Docker image for frontend admin service"
  type        = string
  default     = ""
}

variable "frontend_client_image" {
  description = "Docker image for frontend client service"
  type        = string
  default     = ""
}

variable "backend_cpu" {
  description = "CPU units for backend task (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memory for backend task in MB"
  type        = number
  default     = 1024
}

variable "frontend_cpu" {
  description = "CPU units for frontend task (1024 = 1 vCPU)"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory for frontend task in MB"
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 1
}

variable "frontend_admin_desired_count" {
  description = "Desired number of frontend admin tasks"
  type        = number
  default     = 1
}

variable "frontend_client_desired_count" {
  description = "Desired number of frontend client tasks"
  type        = number
  default     = 1
}

variable "backend_port" {
  description = "Port for backend service"
  type        = number
  default     = 8000
}

variable "frontend_port" {
  description = "Port for frontend services"
  type        = number
  default     = 3000
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 3
}

variable "enable_auto_scaling" {
  description = "Enable auto-scaling for ECS services"
  type        = bool
  default     = true
}

variable "min_capacity" {
  description = "Minimum number of tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks for auto-scaling"
  type        = number
  default     = 3
}

variable "target_cpu_utilization" {
  description = "Target CPU utilization for auto-scaling"
  type        = number
  default     = 70
}

variable "target_memory_utilization" {
  description = "Target memory utilization for auto-scaling"
  type        = number
  default     = 80
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the ALB"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

