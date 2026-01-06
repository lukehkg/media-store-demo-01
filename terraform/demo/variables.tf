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
  default     = "demo"
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

variable "ec2_instance_type" {
  description = "EC2 instance type (default: t3.small for cost optimization)"
  type        = string
  default     = "t3.small"
}

variable "ec2_key_name" {
  description = "EC2 Key Pair name for SSH access (REQUIRED)"
  type        = string
  default     = ""
}

variable "ec2_volume_size" {
  description = "EBS volume size in GB for EC2 instance"
  type        = number
  default     = 30
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

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the EC2 instance"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "scheduler_enabled" {
  description = "Enable EC2 instance scheduler to start/stop instance"
  type        = bool
  default     = true
}

variable "start_time_utc" {
  description = "Start time in UTC (cron format hour). Default 7 AM UTC = 8 AM GMT+1"
  type        = string
  default     = "7"
}

variable "stop_time_utc" {
  description = "Stop time in UTC (cron format hour). Default 5 PM UTC = 6 PM GMT+1"
  type        = string
  default     = "17"
}

variable "scheduler_weekdays_only" {
  description = "Schedule only on weekdays (Monday-Friday)"
  type        = bool
  default     = true
}

variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
  default     = ""
}

