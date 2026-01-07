# Data source for Amazon Linux 2023 AMI
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

# IAM Role for ECS EC2 Instances
resource "aws_iam_role" "ecs_instance" {
  name = "${var.project_name}-ecs-instance-role-${var.environment}"

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
    Name          = "${var.project_name}-ecs-instance-role-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Attach ECS Instance policy
resource "aws_iam_role_policy_attachment" "ecs_instance" {
  role       = aws_iam_role.ecs_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

# IAM Instance Profile for ECS instances
resource "aws_iam_instance_profile" "ecs_instance" {
  name = "${var.project_name}-ecs-instance-profile-${var.environment}"
  role = aws_iam_role.ecs_instance.name
}

# Launch Template for ECS EC2 Spot Instances
resource "aws_launch_template" "ecs_instances" {
  name_prefix   = "${var.project_name}-ecs-${var.environment}-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.ec2_instance_type
  key_name      = var.ec2_key_name

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance.name
  }

  vpc_security_group_ids = [aws_security_group.ecs_instances.id]

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.main.name} >> /etc/ecs/ecs.config
    echo ECS_ENABLE_SPOT_INSTANCE_DRAINING=true >> /etc/ecs/ecs.config
    echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config
  EOF
  )

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_type           = "gp3"
      volume_size           = var.ec2_volume_size
      encrypted             = true
      delete_on_termination = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name          = "${var.project_name}-ecs-instance-${var.environment}"
      ResourcePrefix = var.project_name
    }
  }

  tag_specifications {
    resource_type = "volume"
    tags = {
      Name          = "${var.project_name}-ecs-instance-volume-${var.environment}"
      ResourcePrefix = var.project_name
    }
  }

  tags = {
    Name          = "${var.project_name}-ecs-launch-template-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Auto Scaling Group for ECS EC2 Instances (with Spot instances)
resource "aws_autoscaling_group" "ecs_instances" {
  name                = "${var.project_name}-ecs-asg-${var.environment}"
  vpc_zone_identifier = aws_subnet.private[*].id
  min_size            = var.min_capacity
  max_size            = var.max_capacity
  desired_capacity    = var.desired_capacity

  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.ecs_instances.id
        version            = "$Latest"
      }

      override {
        instance_type     = var.ec2_instance_type
        weighted_capacity = "1"
      }
    }

    instances_distribution {
      on_demand_percentage_above_base_capacity = var.on_demand_percentage
      spot_instance_pools                      = 2
      spot_max_price                          = var.spot_max_price_per_hour != "" ? var.spot_max_price_per_hour : null
    }
  }

  health_check_type         = "EC2"
  health_check_grace_period = 300

  tag {
    key                 = "Name"
    value               = "${var.project_name}-ecs-instance-${var.environment}"
    propagate_at_launch = true
  }

  tag {
    key                 = "ResourcePrefix"
    value               = var.project_name
    propagate_at_launch = true
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = "true"
    propagate_at_launch = true
  }

  depends_on = [aws_nat_gateway.main]
}

# Auto Scaling Policy - Scale based on ECS cluster CPU reservation
resource "aws_autoscaling_policy" "ecs_scale_up" {
  name                   = "${var.project_name}-ecs-scale-up-${var.environment}"
  autoscaling_group_name = aws_autoscaling_group.ecs_instances.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 1
  cooldown               = 300
}

resource "aws_autoscaling_policy" "ecs_scale_down" {
  name                   = "${var.project_name}-ecs-scale-down-${var.environment}"
  autoscaling_group_name = aws_autoscaling_group.ecs_instances.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
  cooldown               = 300
}

# CloudWatch Alarm - High CPU Reservation
resource "aws_cloudwatch_metric_alarm" "ecs_high_cpu" {
  count               = var.enable_auto_scaling ? 1 : 0
  alarm_name          = "${var.project_name}-ecs-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUReservation"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Scale up when CPU reservation is high"
  alarm_actions       = [aws_autoscaling_policy.ecs_scale_up.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = {
    Name          = "${var.project_name}-ecs-high-cpu-alarm-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# CloudWatch Alarm - Low CPU Reservation
resource "aws_cloudwatch_metric_alarm" "ecs_low_cpu" {
  count               = var.enable_auto_scaling ? 1 : 0
  alarm_name          = "${var.project_name}-ecs-low-cpu-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUReservation"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 20
  alarm_description   = "Scale down when CPU reservation is low"
  alarm_actions       = [aws_autoscaling_policy.ecs_scale_down.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = {
    Name          = "${var.project_name}-ecs-low-cpu-alarm-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

