# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}-backend-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name          = "${var.project_name}-backend-logs-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

resource "aws_cloudwatch_log_group" "frontend_admin" {
  name              = "/ecs/${var.project_name}-frontend-admin-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name          = "${var.project_name}-frontend-admin-logs-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

resource "aws_cloudwatch_log_group" "frontend_client" {
  name              = "/ecs/${var.project_name}-frontend-client-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name          = "${var.project_name}-frontend-client-logs-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = var.ecs_cluster_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name          = "${var.project_name}-cluster-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name          = "${var.project_name}-ecs-task-execution-role-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Task (for tasks that need additional permissions)
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name          = "${var.project_name}-ecs-task-role-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# ECS Task Definition - Backend (with PostgreSQL container)
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend-${var.environment}"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = var.backend_cpu + 512  # Add CPU for PostgreSQL container (512 = 0.5 vCPU)
  memory                   = var.backend_memory + 1024  # Add memory for PostgreSQL container (1GB)
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "postgres"
      image = "postgres:15-alpine"
      
      essential = true

      # Resource limits for PostgreSQL
      cpu    = 256  # 0.25 vCPU
      memory = 512  # 512 MB

      environment = [
        {
          name  = "POSTGRES_USER"
          value = var.database_user
        },
        {
          name  = "POSTGRES_PASSWORD"
          value = var.database_password
        },
        {
          name  = "POSTGRES_DB"
          value = var.database_name
        }
      ]

      # No port mappings needed - backend connects via localhost in bridge network mode
      # Port mappings removed to avoid conflicts when multiple tasks run on same EC2 instance

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "postgres"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "pg_isready -U ${var.database_user} -d ${var.database_name} || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 5
        startPeriod = 60  # Increased to allow PostgreSQL to fully initialize
      }
    },
    {
      name  = "backend"
      image = var.backend_image != "" ? var.backend_image : "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${aws_ecr_repository.backend.name}:latest"

      essential = true

      # Resource limits for backend
      cpu    = var.backend_cpu
      memory = var.backend_memory

      dependsOn = [
        {
          containerName = "postgres"
          condition     = "HEALTHY"
        }
      ]

      portMappings = [
        {
          containerPort = var.backend_port
          hostPort      = var.backend_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.database_user}:${var.database_password}@localhost:5432/${var.database_name}"
        },
        {
          name  = "SECRET_KEY"
          value = var.secret_key
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.backend_port}/health || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 5
        startPeriod = 120  # Increased to allow database initialization with retries
      }
    }
  ])

  tags = {
    Name          = "${var.project_name}-backend-task-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# ECS Task Definition - Frontend Admin
resource "aws_ecs_task_definition" "frontend_admin" {
  family                   = "${var.project_name}-frontend-admin-${var.environment}"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "frontend-admin"
      image = var.frontend_admin_image != "" ? var.frontend_admin_image : "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${aws_ecr_repository.frontend_admin.name}:latest"

      portMappings = [
        {
          containerPort = var.frontend_port
          hostPort      = var.frontend_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "NEXT_PUBLIC_API_URL"
          value = "http://${aws_lb.main.dns_name}"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend_admin.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.frontend_port}/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name          = "${var.project_name}-frontend-admin-task-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# ECS Task Definition - Frontend Client
resource "aws_ecs_task_definition" "frontend_client" {
  family                   = "${var.project_name}-frontend-client-${var.environment}"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "frontend-client"
      image = var.frontend_client_image != "" ? var.frontend_client_image : "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${aws_ecr_repository.frontend_client.name}:latest"

      portMappings = [
        {
          containerPort = var.frontend_port
          hostPort      = var.frontend_port + 1
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "NEXT_PUBLIC_API_URL"
          value = "http://${aws_lb.main.dns_name}"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend_client.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.frontend_port}/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name          = "${var.project_name}-frontend-client-task-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# ECS Service - Backend
resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "EC2"

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = var.backend_port
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_task_execution,
    aws_autoscaling_group.ecs_instances
  ]

  tags = {
    Name          = "${var.project_name}-backend-service-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# ECS Service - Frontend Admin
resource "aws_ecs_service" "frontend_admin" {
  name            = "${var.project_name}-frontend-admin-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend_admin.arn
  desired_count   = var.frontend_admin_desired_count
  launch_type     = "EC2"

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend_admin.arn
    container_name   = "frontend-admin"
    container_port   = var.frontend_port
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_task_execution,
    aws_autoscaling_group.ecs_instances
  ]

  tags = {
    Name          = "${var.project_name}-frontend-admin-service-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# ECS Service - Frontend Client
resource "aws_ecs_service" "frontend_client" {
  name            = "${var.project_name}-frontend-client-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend_client.arn
  desired_count   = var.frontend_client_desired_count
  launch_type     = "EC2"

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend_client.arn
    container_name   = "frontend-client"
    container_port   = var.frontend_port
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_task_execution,
    aws_autoscaling_group.ecs_instances
  ]

  tags = {
    Name          = "${var.project_name}-frontend-client-service-${var.environment}"
    ResourcePrefix = var.project_name
  }
}
