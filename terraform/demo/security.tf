# Security Group for ALB
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg-${var.environment}"
  description = "Security group for Application Load Balancer"
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

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name          = "${var.project_name}-alb-sg-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Security Group for Backend ECS Tasks
resource "aws_security_group" "backend_ecs" {
  name        = "${var.project_name}-backend-ecs-sg-${var.environment}"
  description = "Security group for backend ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Backend port from ALB"
    from_port       = var.backend_port
    to_port         = var.backend_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name          = "${var.project_name}-backend-ecs-sg-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Security Group for Frontend ECS Tasks
resource "aws_security_group" "frontend_ecs" {
  name        = "${var.project_name}-frontend-ecs-sg-${var.environment}"
  description = "Security group for frontend ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Frontend port from ALB"
    from_port       = var.frontend_port
    to_port         = var.frontend_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name          = "${var.project_name}-frontend-ecs-sg-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

