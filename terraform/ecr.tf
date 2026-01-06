# ECR Repository for Backend
resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name          = "${var.project_name}-backend-ecr-${var.environment}"
    Service       = "backend"
    ResourcePrefix = var.project_name
  }
}

# ECR Repository for Frontend Admin
resource "aws_ecr_repository" "frontend_admin" {
  name                 = "${var.project_name}-frontend-admin"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name          = "${var.project_name}-frontend-admin-ecr-${var.environment}"
    Service       = "frontend-admin"
    ResourcePrefix = var.project_name
  }
}

# ECR Repository for Frontend Client
resource "aws_ecr_repository" "frontend_client" {
  name                 = "${var.project_name}-frontend-client"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name          = "${var.project_name}-frontend-client-ecr-${var.environment}"
    Service       = "frontend-client"
    ResourcePrefix = var.project_name
  }
}

# ECR Lifecycle Policy - Keep only last 10 images to save storage costs
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "frontend_admin" {
  repository = aws_ecr_repository.frontend_admin.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "frontend_client" {
  repository = aws_ecr_repository.frontend_client.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

