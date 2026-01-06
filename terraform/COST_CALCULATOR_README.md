# AWS Cost Calculator Script

Python script to calculate AWS monthly costs based on Terraform configuration and scheduler settings.

## Features

- Calculates costs for all AWS services (ECS Fargate, NAT Gateway, ALB, ECR, CloudWatch, Data Transfer, Lambda)
- Accounts for scheduler on/off times
- Compares costs with and without scheduler
- Supports custom configuration files
- Generates detailed cost breakdowns

## Usage

### Basic Usage (Default Configuration)

```bash
cd terraform
python3 calculate_costs.py
```

### With Custom Configuration

```bash
python3 calculate_costs.py config.json
```

### Save Results to JSON

```bash
python3 calculate_costs.py config.json costs.json
```

## Configuration File Format

Create a JSON file (see `config.example.json`):

```json
{
  "region": "eu-west-1",
  "scheduler_enabled": true,
  "start_time_utc": 7,
  "stop_time_utc": 17,
  "weekdays_only": true,
  "services": {
    "backend": {
      "cpu": 512,
      "memory": 1024,
      "desired_count": 1
    },
    "frontend_admin": {
      "cpu": 256,
      "memory": 512,
      "desired_count": 1
    },
    "frontend_client": {
      "cpu": 256,
      "memory": 512,
      "desired_count": 1
    }
  },
  "nat_gateway": {
    "enabled": true,
    "single": true,
    "data_processing_gb": 10
  },
  "alb": {
    "enabled": true,
    "average_lcu": 0.5
  },
  "ecr": {
    "repositories": 3,
    "images_per_repo": 10,
    "avg_image_size_gb": 0.5
  },
  "cloudwatch_logs": {
    "ingestion_gb_per_month": 1,
    "retention_days": 3
  },
  "data_transfer": {
    "outbound_gb": 50,
    "inter_az_gb": 10
  }
}
```

## Example Output

```
======================================================================
AWS MONTHLY COST ANALYSIS
======================================================================

Scheduler Enabled: True
Running Hours/Month: 108.3 hours
  (Business hours: Mon-Fri, 8 AM - 6 PM GMT+1)

----------------------------------------------------------------------
COST BREAKDOWN
----------------------------------------------------------------------

ECS Fargate Compute: $5.33
  - backend: $2.67 (108.3 hrs)
  - frontend_admin: $1.33 (108.3 hrs)
  - frontend_client: $1.33 (108.3 hrs)

NAT Gateway: $33.30
  - gateway: $32.85
  - data_processing: $0.45

Application Load Balancer: $19.35
  - base: $16.43
  - lcu: $2.92

ECR Storage: $1.50
  - Storage: 15.0 GB

CloudWatch Logs: $0.52
  - ingestion: $0.50
  - storage: $0.02

Data Transfer: $4.51
  - outbound: $4.41
  - inter_az: $0.10

Lambda (Scheduler): $0.00
  - Within AWS Free Tier
  - Invocations/month: 43

======================================================================
TOTAL MONTHLY COST: $70.51
TOTAL ANNUAL COST:  $846.12
======================================================================

Cost with scheduler: $70.51/month
Cost without scheduler (24/7): $95.22/month
Monthly Savings: $24.71 (26.0%)
Annual Savings: $296.52
```

## Cost Components

### ECS Fargate
- Calculated based on vCPU-hours and GB-hours
- Accounts for scheduler on/off times
- Multiplied by desired count

### NAT Gateway
- Always on (24/7)
- Base cost + data processing

### Application Load Balancer
- Always on (24/7)
- Base cost + LCU charges

### ECR Storage
- Based on number of repositories, images, and average size

### CloudWatch Logs
- Ingestion costs + storage costs
- Storage calculated based on retention period

### Data Transfer
- Outbound (first 1 GB free)
- Inter-AZ transfer

### Lambda
- Usually within free tier for scheduler usage
- Calculated based on invocations and compute time

## Updating Pricing

To update AWS pricing, edit the `PRICING` dictionary in `calculate_costs.py`:

```python
PRICING = {
    'ecs_fargate': {
        'vcpu_per_hour': 0.04048,  # Update with current pricing
        'memory_per_gb_hour': 0.004445
    },
    # ... other services
}
```

## Requirements

- Python 3.6+
- No external dependencies (uses only standard library)

## Integration with Terraform

The script can be used to:
1. Estimate costs before deployment
2. Compare different configurations
3. Validate cost optimizations
4. Generate cost reports for stakeholders

## Notes

- Pricing is based on AWS public pricing (eu-west-1)
- Actual costs may vary based on actual usage
- Data transfer costs are estimates
- Lambda costs are usually $0 (within free tier)

