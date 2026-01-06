# Lambda function to start/stop ECS services
resource "aws_lambda_function" "ecs_scheduler" {
  count            = var.scheduler_enabled ? 1 : 0
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project_name}-ecs-scheduler-${var.environment}"
  role            = aws_iam_role.lambda_scheduler[0].arn
  handler         = "ecs_scheduler.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "python3.11"
  timeout         = 300
  memory_size     = 256

  environment {
    variables = {
      ECS_CLUSTER                = aws_ecs_cluster.main.name
      ECS_SERVICE_BACKEND        = aws_ecs_service.backend.name
      ECS_SERVICE_FRONTEND_ADMIN = aws_ecs_service.frontend_admin.name
      ECS_SERVICE_FRONTEND_CLIENT = aws_ecs_service.frontend_client.name
      AWS_REGION                 = var.aws_region
      BACKEND_DESIRED_COUNT      = var.backend_desired_count
      FRONTEND_ADMIN_DESIRED_COUNT = var.frontend_admin_desired_count
      FRONTEND_CLIENT_DESIRED_COUNT = var.frontend_client_desired_count
    }
  }

  tags = {
    Name          = "${var.project_name}-ecs-scheduler-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_scheduler" {
  count = var.scheduler_enabled ? 1 : 0
  name  = "${var.project_name}-lambda-scheduler-role-${var.environment}"

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
    Name          = "${var.project_name}-lambda-scheduler-role-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# IAM Policy for Lambda to manage ECS services
resource "aws_iam_role_policy" "lambda_scheduler" {
  count = var.scheduler_enabled ? 1 : 0
  name  = "${var.project_name}-lambda-scheduler-policy-${var.environment}"
  role  = aws_iam_role.lambda_scheduler[0].id

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
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:ListServices"
        ]
        Resource = [
          aws_ecs_service.backend.id,
          aws_ecs_service.frontend_admin.id,
          aws_ecs_service.frontend_client.id,
          "${aws_ecs_cluster.main.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeClusters"
        ]
        Resource = aws_ecs_cluster.main.arn
      }
    ]
  })
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_scheduler" {
  count             = var.scheduler_enabled ? 1 : 0
  name              = "/aws/lambda/${var.project_name}-ecs-scheduler-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name          = "${var.project_name}-lambda-scheduler-logs-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Archive Lambda function code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/ecs_scheduler.py"
  output_path = "${path.module}/lambda/ecs_scheduler.zip"
}

# EventBridge Rule - Start ECS Services (Monday-Friday, 8 AM GMT+1 / 7 AM UTC)
resource "aws_cloudwatch_event_rule" "start_ecs_services" {
  count               = var.scheduler_enabled ? 1 : 0
  name                = "${var.project_name}-start-ecs-services-${var.environment}"
  description         = "Start ECS services at 8 AM GMT+1 (7 AM UTC) on weekdays"
  schedule_expression = var.scheduler_weekdays_only ? "cron(0 ${var.start_time_utc} ? * MON-FRI *)" : "cron(0 ${var.start_time_utc} * * ? *)"

  tags = {
    Name          = "${var.project_name}-start-ecs-services-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# EventBridge Rule - Stop ECS Services (Monday-Friday, 6 PM GMT+1 / 5 PM UTC)
resource "aws_cloudwatch_event_rule" "stop_ecs_services" {
  count               = var.scheduler_enabled ? 1 : 0
  name                = "${var.project_name}-stop-ecs-services-${var.environment}"
  description         = "Stop ECS services at 6 PM GMT+1 (5 PM UTC) on weekdays"
  schedule_expression = var.scheduler_weekdays_only ? "cron(0 ${var.stop_time_utc} ? * MON-FRI *)" : "cron(0 ${var.stop_time_utc} * * ? *)"

  tags = {
    Name          = "${var.project_name}-stop-ecs-services-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# EventBridge Target - Start Services
resource "aws_cloudwatch_event_target" "start_ecs_services" {
  count     = var.scheduler_enabled ? 1 : 0
  rule      = aws_cloudwatch_event_rule.start_ecs_services[0].name
  target_id = "StartECSServices"
  arn       = aws_lambda_function.ecs_scheduler.arn
  input     = jsonencode({ "action" = "start" })
}

# EventBridge Target - Stop Services
resource "aws_cloudwatch_event_target" "stop_ecs_services" {
  count     = var.scheduler_enabled ? 1 : 0
  rule      = aws_cloudwatch_event_rule.stop_ecs_services[0].name
  target_id = "StopECSServices"
  arn       = aws_lambda_function.ecs_scheduler.arn
  input     = jsonencode({ "action" = "stop" })
}

# Lambda Permission for EventBridge to invoke Lambda
resource "aws_lambda_permission" "allow_eventbridge_start" {
  count         = var.scheduler_enabled ? 1 : 0
  statement_id  = "AllowExecutionFromEventBridgeStart"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ecs_scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start_ecs_services[0].arn
}

resource "aws_lambda_permission" "allow_eventbridge_stop" {
  count         = var.scheduler_enabled ? 1 : 0
  statement_id  = "AllowExecutionFromEventBridgeStop"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ecs_scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop_ecs_services[0].arn
}


