# ECS Service Scheduler Setup Guide

This guide explains the Lambda-based scheduler that automatically starts and stops ECS services to optimize costs.

## Overview

The scheduler uses:
- **AWS Lambda** function to start/stop ECS services
- **EventBridge (CloudWatch Events)** for scheduling
- **Cron expressions** for precise timing

## Schedule Configuration

### Default Schedule (GMT+1 / London Time)
- **Start**: 8:00 AM GMT+1 (7:00 AM UTC) - Monday to Friday
- **Stop**: 6:00 PM GMT+1 (5:00 PM UTC) - Monday to Friday
- **Weekends**: Services remain stopped

### Time Zone Notes
- **GMT+1 (BST)**: March-October (British Summer Time)
- **GMT**: November-February (Greenwich Mean Time)
- The cron schedule uses UTC, which automatically adjusts for BST/GMT

## Cost Savings

With the scheduler enabled:
- **Running Hours**: ~108 hours/month (business hours only)
- **Without Scheduler**: 730 hours/month (24/7)
- **Savings**: ~85% reduction in ECS Fargate compute costs

**Example Monthly Savings:**
- ECS Fargate: $36.04 → $5.33 (saves $30.71/month)
- Total Infrastructure: $95 → ~$70 (saves ~$25/month)

## Configuration

### Terraform Variables

```hcl
scheduler_enabled = true              # Enable/disable scheduler
start_time_utc = 7                    # Start hour in UTC (7 AM UTC = 8 AM GMT+1)
stop_time_utc = 17                    # Stop hour in UTC (5 PM UTC = 6 PM GMT+1)
scheduler_weekdays_only = true        # Only schedule weekdays
```

### Customizing Schedule

**Example: 9 AM - 7 PM (GMT+1)**
```hcl
start_time_utc = 8   # 8 AM UTC = 9 AM GMT+1
stop_time_utc = 18   # 6 PM UTC = 7 PM GMT+1
```

**Example: Every Day (Including Weekends)**
```hcl
scheduler_weekdays_only = false
```

**Example: Disable Scheduler**
```hcl
scheduler_enabled = false
```

## Lambda Function

### Function Details
- **Runtime**: Python 3.11
- **Memory**: 256 MB
- **Timeout**: 5 minutes
- **Handler**: `ecs_scheduler.lambda_handler`

### What It Does

1. **Start Action**:
   - Sets desired count to configured values (default: 1 per service)
   - Starts all three services: backend, frontend-admin, frontend-client

2. **Stop Action**:
   - Sets desired count to 0 for all services
   - Stops all running tasks

### Lambda Code Location
- Source: `terraform/lambda/ecs_scheduler.py`
- Packaged: `terraform/lambda/ecs_scheduler.zip` (auto-generated)

## EventBridge Rules

### Start Rule
- **Name**: `demo-media01-start-ecs-services-dev`
- **Schedule**: `cron(0 7 ? * MON-FRI *)`
- **Target**: Lambda function with `{"action": "start"}`

### Stop Rule
- **Name**: `demo-media01-stop-ecs-services-dev`
- **Schedule**: `cron(0 17 ? * MON-FRI *)`
- **Target**: Lambda function with `{"action": "stop"}`

## IAM Permissions

The Lambda function needs permissions to:
- Update ECS service desired count
- Describe ECS services and clusters
- Write CloudWatch logs

These are automatically configured by Terraform.

## Manual Testing

### Test Start Services
```bash
aws lambda invoke \
  --function-name demo-media01-ecs-scheduler-dev \
  --payload '{"action": "start"}' \
  --region eu-west-1 \
  response.json

cat response.json
```

### Test Stop Services
```bash
aws lambda invoke \
  --function-name demo-media01-ecs-scheduler-dev \
  --payload '{"action": "stop"}' \
  --region eu-west-1 \
  response.json

cat response.json
```

## Monitoring

### CloudWatch Logs
- **Log Group**: `/aws/lambda/demo-media01-ecs-scheduler-dev`
- View logs to see scheduler execution history

### CloudWatch Metrics
- Lambda invocations
- Lambda errors
- Lambda duration

### ECS Service Events
Check ECS service events in the AWS Console to see when services start/stop.

## Troubleshooting

### Services Not Starting
1. Check Lambda logs in CloudWatch
2. Verify IAM permissions
3. Check ECS service names match configuration
4. Verify EventBridge rules are enabled

### Services Not Stopping
1. Check Lambda execution logs
2. Verify cron schedule is correct
3. Check EventBridge rule status

### Lambda Errors
- Check CloudWatch Logs for error messages
- Verify ECS cluster and service names
- Check IAM role permissions

## Cost Impact

### Lambda Costs
- **Invocations**: ~43/month (within free tier of 1M requests)
- **Compute**: ~0.1 GB-seconds/month (within free tier of 400K GB-seconds)
- **Cost**: **$0/month** (within AWS Free Tier)

### ECS Fargate Savings
- **Without scheduler**: $36.04/month (730 hours)
- **With scheduler**: ~$5.33/month (108 hours)
- **Savings**: **$30.71/month** (85% reduction)

### Total Infrastructure Savings
- **Monthly**: ~$25-30 savings
- **Annual**: ~$300-360 savings

## Best Practices

1. **Test scheduler** before enabling in production
2. **Monitor logs** for the first few days
3. **Set up CloudWatch alarms** for Lambda errors
4. **Document schedule changes** for team awareness
5. **Consider time zones** when scheduling

## Disabling the Scheduler

To disable the scheduler:

```hcl
scheduler_enabled = false
```

Then run:
```bash
terraform apply
```

This will:
- Delete EventBridge rules
- Delete Lambda function
- Keep ECS services running (manual management required)

## Additional Resources

- [EventBridge Schedule Expressions](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html)
- [Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [ECS Service Management](https://docs.aws.amazon.com/ecs/latest/developerguide/service-management.html)

