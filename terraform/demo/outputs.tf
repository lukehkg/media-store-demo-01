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

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app_server.id
}

output "ec2_public_ip" {
  description = "EC2 instance public IP (Elastic IP)"
  value       = aws_eip.app_server.public_ip
}

output "ec2_application_url" {
  description = "Application URL for EC2 instance"
  value       = "http://${aws_eip.app_server.public_ip}"
}

output "ec2_ssh_command" {
  description = "SSH command to connect to EC2 instance"
  value       = "ssh -i ~/.ssh/${var.ec2_key_name}.pem ec2-user@${aws_eip.app_server.public_ip}"
}

output "scheduler_lambda_name" {
  description = "Name of the Lambda scheduler function"
  value       = var.scheduler_enabled ? aws_lambda_function.ec2_scheduler[0].function_name : null
}

output "scheduler_schedule" {
  description = "Scheduler schedule information"
  value = var.scheduler_enabled ? {
    enabled        = true
    start_time_utc = var.start_time_utc
    stop_time_utc  = var.stop_time_utc
    weekdays_only  = var.scheduler_weekdays_only
    start_rule_arn = aws_cloudwatch_event_rule.start_ec2_instance[0].arn
    stop_rule_arn  = aws_cloudwatch_event_rule.stop_ec2_instance[0].arn
  } : {
    enabled = false
  }
}

output "monthly_cost_estimate" {
  description = "Estimated monthly cost (with scheduler)"
  value       = "~$14/month (EC2: $4.50, EBS: $3.00, Other: $6.50)"
}

