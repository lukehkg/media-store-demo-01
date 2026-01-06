terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: Configure backend for remote state
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "ecs-fargate/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment   = var.environment
      Project       = var.project_name
      ResourcePrefix = var.project_name
      ManagedBy     = "Terraform"
      Purpose       = "Demo-POC"
    }
  }
}

