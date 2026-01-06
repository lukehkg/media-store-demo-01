# Terraform Folder Structure

## ✅ Two Separate Deployment Folders

You have **TWO completely separate Terraform configurations**:

```
terraform/
│
├── 📁 production/          ← USE THIS for Production (ECS Fargate)
│   ├── versions.tf
│   ├── variables.tf
│   ├── vpc.tf
│   ├── security.tf
│   ├── alb.tf
│   ├── ecr.tf
│   ├── ecs.tf
│   ├── autoscaling.tf
│   ├── outputs.tf
│   ├── terraform.tfvars.example
│   └── README.md
│
└── 📁 demo/                ← USE THIS for Demo (EC2 t3.small)
    ├── versions.tf
    ├── variables.tf
    ├── vpc.tf
    ├── ec2.tf
    ├── lambda.tf
    ├── outputs.tf
    ├── terraform.tfvars.example
    ├── README.md
    ├── ec2/
    │   └── user-data.sh
    └── lambda/
        └── ec2_scheduler.py
```

## 🎯 Which Folder to Use?

### For Production (ECS Fargate):
```bash
cd terraform/production
terraform init
terraform plan
terraform apply
```

### For Demo (EC2):
```bash
cd terraform/demo
terraform init
terraform plan
terraform apply
```

## ⚠️ Important

- **`terraform/production/`** = ECS Fargate (no scheduler, 24/7)
- **`terraform/demo/`** = EC2 t3.small (with scheduler, business hours)
- **Old files in root `terraform/`** = Legacy/reference files (ignore these)
- **Each folder is independent** - don't mix files between them

## 📊 Quick Reference

| Folder | Type | Scheduler | Cost |
|--------|------|-----------|------|
| `production/` | ECS Fargate | ❌ None | $95/month |
| `demo/` | EC2 t3.small | ✅ Lambda | $14/month |

