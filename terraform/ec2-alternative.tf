# EC2 Alternative Configuration
# Use this instead of ECS Fargate for maximum cost savings
# Saves ~80% compared to Fargate + NAT Gateway + ALB

# EC2 Instance (t3.small)
resource "aws_instance" "app_server" {
  count                  = var.use_ec2_alternative ? 1 : 0
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.ec2_instance_type
  key_name               = var.ec2_key_name
  vpc_security_group_ids = [aws_security_group.ec2_app[0].id]
  subnet_id               = aws_subnet.public[0].id
  user_data               = base64encode(templatefile("${path.module}/ec2/user-data.sh", {
    project_name = var.project_name
  }))

  root_block_device {
    volume_type = "gp3"
    volume_size = var.ec2_volume_size
    encrypted   = true
  }

  tags = {
    Name          = "${var.project_name}-app-server-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Elastic IP for EC2
resource "aws_eip" "app_server" {
  count  = var.use_ec2_alternative ? 1 : 0
  domain = "vpc"
  instance = aws_instance.app_server[0].id

  tags = {
    Name          = "${var.project_name}-app-server-eip-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Security Group for EC2 App Server
resource "aws_security_group" "ec2_app" {
  count       = var.use_ec2_alternative ? 1 : 0
  name        = "${var.project_name}-ec2-app-sg-${var.environment}"
  description = "Security group for EC2 app server"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  ingress {
    description = "Backend API"
    from_port   = var.backend_port
    to_port     = var.backend_port
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name          = "${var.project_name}-ec2-app-sg-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# CloudWatch Log Group for EC2
resource "aws_cloudwatch_log_group" "ec2_app" {
  count             = var.use_ec2_alternative ? 1 : 0
  name              = "/ec2/${var.project_name}-app-server-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name          = "${var.project_name}-ec2-app-logs-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  count       = var.use_ec2_alternative ? 1 : 0
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# IAM Role for EC2 Instance
resource "aws_iam_role" "ec2_app" {
  count = var.use_ec2_alternative ? 1 : 0
  name  = "${var.project_name}-ec2-app-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name          = "${var.project_name}-ec2-app-role-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "ec2_app" {
  count = var.use_ec2_alternative ? 1 : 0
  name  = "${var.project_name}-ec2-app-profile-${var.environment}"
  role  = aws_iam_role.ec2_app[0].name
}

# Attach policies for EC2
resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  count      = var.use_ec2_alternative ? 1 : 0
  role       = aws_iam_role.ec2_app[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ec2_ecr" {
  count      = var.use_ec2_alternative ? 1 : 0
  role       = aws_iam_role.ec2_app[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# Lambda function to start/stop EC2 instance
resource "aws_lambda_function" "ec2_scheduler" {
  count            = var.use_ec2_alternative && var.scheduler_enabled ? 1 : 0
  filename         = data.archive_file.lambda_ec2_zip[0].output_path
  function_name    = "${var.project_name}-ec2-scheduler-${var.environment}"
  role            = aws_iam_role.lambda_ec2_scheduler[0].arn
  handler         = "ec2_scheduler.lambda_handler"
  source_code_hash = data.archive_file.lambda_ec2_zip[0].output_base64sha256
  runtime         = "python3.11"
  timeout         = 300
  memory_size     = 256

  environment {
    variables = {
      EC2_INSTANCE_ID = aws_instance.app_server[0].id
      AWS_REGION      = var.aws_region
    }
  }

  tags = {
    Name          = "${var.project_name}-ec2-scheduler-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# IAM Role for EC2 Scheduler Lambda
resource "aws_iam_role" "lambda_ec2_scheduler" {
  count = var.use_ec2_alternative && var.scheduler_enabled ? 1 : 0
  name  = "${var.project_name}-lambda-ec2-scheduler-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name          = "${var.project_name}-lambda-ec2-scheduler-role-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# IAM Policy for EC2 Scheduler
resource "aws_iam_role_policy" "lambda_ec2_scheduler" {
  count = var.use_ec2_alternative && var.scheduler_enabled ? 1 : 0
  name  = "${var.project_name}-lambda-ec2-scheduler-policy-${var.environment}"
  role  = aws_iam_role.lambda_ec2_scheduler[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:DescribeInstances"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Log Group for EC2 Scheduler Lambda
resource "aws_cloudwatch_log_group" "lambda_ec2_scheduler" {
  count             = var.use_ec2_alternative && var.scheduler_enabled ? 1 : 0
  name              = "/aws/lambda/${var.project_name}-ec2-scheduler-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name          = "${var.project_name}-lambda-ec2-scheduler-logs-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Archive EC2 Scheduler Lambda function code
data "archive_file" "lambda_ec2_zip" {
  count       = var.use_ec2_alternative && var.scheduler_enabled ? 1 : 0
  type        = "zip"
  source_file = "${path.module}/lambda/ec2_scheduler.py"
  output_path = "${path.module}/lambda/ec2_scheduler.zip"
}

# EventBridge Rule - Start EC2 Instance
resource "aws_cloudwatch_event_rule" "start_ec2_instance" {
  count               = var.use_ec2_alternative && var.scheduler_enabled ? 1 : 0
  name                = "${var.project_name}-start-ec2-instance-${var.environment}"
  description         = "Start EC2 instance at 8 AM GMT+1 (7 AM UTC) on weekdays"
  schedule_expression = var.scheduler_weekdays_only ? "cron(0 ${var.start_time_utc} ? * MON-FRI *)" : "cron(0 ${var.start_time_utc} * * ? *)"

  tags = {
    Name          = "${var.project_name}-start-ec2-instance-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# EventBridge Rule - Stop EC2 Instance
resource "aws_cloudwatch_event_rule" "stop_ec2_instance" {
  count               = var.use_ec2_alternative && var.scheduler_enabled ? 1 : 0
  name                = "${var.project_name}-stop-ec2-instance-${var.environment}"
  description         = "Stop EC2 instance at 6 PM GMT+1 (5 PM UTC) on weekdays"
  schedule_expression = var.scheduler_weekdays_only ? "cron(0 ${var.stop_time_utc} ? * MON-FRI *)" : "cron(0 ${var.stop_time_utc} * * ? *)"

  tags = {
    Name          = "${var.project_name}-stop-ec2-instance-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# EventBridge Targets
resource "aws_cloudwatch_event_target" "start_ec2_instance" {
  count     = var.use_ec2_alternative && var.scheduler_enabled ? 1 : 0
  rule      = aws_cloudwatch_event_rule.start_ec2_instance[0].name
  target_id = "StartEC2Instance"
  arn       = aws_lambda_function.ec2_scheduler[0].arn
  input     = jsonencode({ "action" = "start" })
}

resource "aws_cloudwatch_event_target" "stop_ec2_instance" {
  count     = var.use_ec2_alternative && var.scheduler_enabled ? 1 : 0
  rule      = aws_cloudwatch_event_rule.stop_ec2_instance[0].name
  target_id = "StopEC2Instance"
  arn       = aws_lambda_function.ec2_scheduler[0].arn
  input     = jsonencode({ "action" = "stop" })
}

# Lambda Permissions
resource "aws_lambda_permission" "allow_eventbridge_start_ec2" {
  count         = var.use_ec2_alternative && var.scheduler_enabled ? 1 : 0
  statement_id  = "AllowExecutionFromEventBridgeStart"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ec2_scheduler[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start_ec2_instance[0].arn
}

resource "aws_lambda_permission" "allow_eventbridge_stop_ec2" {
  count         = var.use_ec2_alternative && var.scheduler_enabled ? 1 : 0
  statement_id  = "AllowExecutionFromEventBridgeStop"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ec2_scheduler[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop_ec2_instance[0].arn
}

