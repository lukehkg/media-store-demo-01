# EC2 Instance (t3.small) - Cost-optimized for demo/POC
resource "aws_instance" "app_server" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.ec2_instance_type
  key_name               = var.ec2_key_name
  vpc_security_group_ids = [aws_security_group.ec2_app.id]
  subnet_id              = aws_subnet.public[0].id
  iam_instance_profile   = aws_iam_instance_profile.ec2_app.name
  user_data              = base64encode(templatefile("${path.module}/ec2/user-data.sh", {
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
  domain   = "vpc"
  instance = aws_instance.app_server.id

  tags = {
    Name          = "${var.project_name}-app-server-eip-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Security Group for EC2 App Server
resource "aws_security_group" "ec2_app" {
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
  name              = "/ec2/${var.project_name}-app-server-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name          = "${var.project_name}-ec2-app-logs-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
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
  name = "${var.project_name}-ec2-app-role-${var.environment}"

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
  name = "${var.project_name}-ec2-app-profile-${var.environment}"
  role = aws_iam_role.ec2_app.name
}

# Attach policies for EC2
resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2_app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ec2_ecr" {
  role       = aws_iam_role.ec2_app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

