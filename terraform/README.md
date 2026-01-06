# Terraform Deployment Configurations

This directory contains **two separate Terraform configurations** for different deployment scenarios:

## 📁 Directory Structure

```
terraform/
├── production/     # ECS Fargate (Production) - No Lambda scheduler
└── demo/          # EC2 t3.small (Demo/POC) - With Lambda scheduler
```

## 🚀 Production Deployment (`production/`)

**Use Case:** Production environment with high availability

**Architecture:**
- ECS Fargate Cluster
- Application Load Balancer (ALB)
- NAT Gateway (single, cost-optimized)
- Auto-scaling (1-5 tasks)
- **No Lambda scheduler** (runs 24/7)

**Monthly Cost:** ~$95/month

**Quick Start:**
```bash
cd production
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform plan
terraform apply
```

## 💰 Demo Deployment (`demo/`)

**Use Case:** Demo/POC environment, maximum cost savings

**Architecture:**
- EC2 t3.small instance
- Elastic IP
- Lambda scheduler (8 AM - 6 PM GMT+1, Mon-Fri)
- **No NAT Gateway** (saves $33/month)
- **No ALB** (saves $19/month)

**Monthly Cost:** ~$14/month (80% savings vs production)

**Quick Start:**
```bash
cd demo
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars - REQUIRED: Set ec2_key_name
terraform init
terraform plan
terraform apply
```

## 📊 Cost Comparison

| Component | Production (Fargate) | Demo (EC2) |
|-----------|---------------------|------------|
| Compute | $36/month | $4.50/month |
| NAT Gateway | $33/month | $0 |
| ALB | $19/month | $0 |
| EBS Storage | $0 | $3/month |
| Other | $7/month | $6.50/month |
| **Total** | **$95/month** | **$14/month** |

## 🎯 Which One to Use?

### Use Production (`production/`) if:
- ✅ Production environment
- ✅ High availability required
- ✅ Auto-scaling needed
- ✅ Multi-AZ deployment
- ✅ Service isolation required
- ✅ 24/7 operation

### Use Demo (`demo/`) if:
- ✅ Demo/POC environment
- ✅ Budget is primary concern
- ✅ Low to moderate traffic
- ✅ Can accept single instance
- ✅ Business hours only (with scheduler)

## 📚 Documentation

- **Production:** See `production/README.md`
- **Demo:** See `demo/README.md`

## 🔧 Common Commands

**View outputs:**
```bash
terraform output
```

**Destroy infrastructure:**
```bash
terraform destroy
```

**Update configuration:**
```bash
# Edit terraform.tfvars
terraform plan
terraform apply
```
