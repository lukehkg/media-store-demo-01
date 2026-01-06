# Auto Scaling Target for Backend Service
resource "aws_appautoscaling_target" "backend" {
  count              = var.enable_auto_scaling ? 1 : 0
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - CPU for Backend
resource "aws_appautoscaling_policy" "backend_cpu" {
  count              = var.enable_auto_scaling ? 1 : 0
  name               = "${var.project_name}-backend-cpu-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend[0].resource_id
  scalable_dimension = aws_appautoscaling_target.backend[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.target_cpu_utilization
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Policy - Memory for Backend
resource "aws_appautoscaling_policy" "backend_memory" {
  count              = var.enable_auto_scaling ? 1 : 0
  name               = "${var.project_name}-backend-memory-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend[0].resource_id
  scalable_dimension = aws_appautoscaling_target.backend[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.target_memory_utilization
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Target for Frontend Admin Service
resource "aws_appautoscaling_target" "frontend_admin" {
  count              = var.enable_auto_scaling ? 1 : 0
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.frontend_admin.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - CPU for Frontend Admin
resource "aws_appautoscaling_policy" "frontend_admin_cpu" {
  count              = var.enable_auto_scaling ? 1 : 0
  name               = "${var.project_name}-frontend-admin-cpu-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.frontend_admin[0].resource_id
  scalable_dimension = aws_appautoscaling_target.frontend_admin[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.frontend_admin[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.target_cpu_utilization
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Target for Frontend Client Service
resource "aws_appautoscaling_target" "frontend_client" {
  count              = var.enable_auto_scaling ? 1 : 0
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.frontend_client.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - CPU for Frontend Client
resource "aws_appautoscaling_policy" "frontend_client_cpu" {
  count              = var.enable_auto_scaling ? 1 : 0
  name               = "${var.project_name}-frontend-client-cpu-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.frontend_client[0].resource_id
  scalable_dimension = aws_appautoscaling_target.frontend_client[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.frontend_client[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.target_cpu_utilization
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

