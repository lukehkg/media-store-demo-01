# Demo Deployment - EC2 t3.small with Scheduler

This Terraform configuration deploys a cost-optimized demo/POC environment using **EC2 t3.small** with **Lambda scheduler** to automatically start/stop the instance during business hours.

## Architecture

- **EC2 t3.small** instance running all services via Docker Compose
- **Elastic IP** for static public IP
- **Lambda Scheduler** to start/stop instance (8 AM - 6 PM GMT+1, Mon-Fri)
- **VPC** with public subnet only (no NAT Gateway needed)
- **CloudWatch Logs** with 3-day retention
- **No ALB** - direct access via Elastic IP

## Cost Savings

**Monthly Cost (with scheduler): ~$14**
- EC2 Instance: $4.50 (216.5 hours/month)
- EBS Storage: $3.00 (30 GB)
- ECR Storage: $1.50
- CloudWatch Logs: $0.50
- Data Transfer: $4.51
- Lambda Scheduler: $0.00 (Free Tier)
- **Total: $14.01/month**

**Savings vs ECS Fargate: 80% reduction ($55.83/month)**

## Prerequisites

1. **EC2 Key Pair** - Create in AWS Console:
   ```bash
   aws ec2 create-key-pair --key-name demo-media01-key --query 'KeyMaterial' --output text > demo-media01-key.pem
   chmod 400 demo-media01-key.pem
   ```

2. **AWS CLI** configured with credentials

3. **Terraform** >= 1.0 installed

## Quick Start

1. **Copy example variables:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Update terraform.tfvars:**
   - Set `aws_account_id`
   - Set `ec2_key_name` (your EC2 key pair name)

3. **Initialize Terraform:**
   ```bash
   terraform init
   ```

4. **Plan deployment:**
   ```bash
   terraform plan
   ```

5. **Deploy:**
   ```bash
   terraform apply
   ```

6. **After deployment, SSH to instance:**
   ```bash
   ssh -i ~/.ssh/your-key.pem ec2-user@<elastic-ip>
   ```

7. **Deploy services on EC2:**
   ```bash
   cd /opt/demo-media01
   # Clone your repository
   git clone https://github.com/your-repo/media-store-demo.git .
   # Use docker-compose to run services
   docker-compose up -d
   ```

## Scheduler

The Lambda scheduler automatically:
- **Starts** EC2 instance at 8 AM GMT+1 (7 AM UTC) on weekdays
- **Stops** EC2 instance at 6 PM GMT+1 (5 PM UTC) on weekdays
- **Weekends**: Instance remains stopped

### Manual Control

**Start instance:**
```bash
aws lambda invoke --function-name demo-media01-ec2-scheduler-demo --payload '{"action":"start"}' response.json
```

**Stop instance:**
```bash
aws lambda invoke --function-name demo-media01-ec2-scheduler-demo --payload '{"action":"stop"}' response.json
```

## Outputs

After deployment, run `terraform output` to see:
- EC2 instance ID
- Public IP (Elastic IP)
- Application URL
- SSH command
- Scheduler information

## Notes

- **Single instance** = single point of failure (acceptable for demo/POC)
- **No auto-scaling** - manual scaling only
- **Direct SSH access** - full control over the instance
- **No NAT Gateway** - saves $33/month
- **No ALB** - saves $19/month

