# AWS Monthly Cost Analysis

Detailed cost breakdown for running all container services on AWS ECS Fargate in **eu-west-1 (London)** region.

## Resource Configuration Summary

### ECS Fargate Services
- **Backend**: 1 task × 0.5 vCPU (512) × 1024 MB memory
- **Frontend Admin**: 1 task × 0.25 vCPU (256) × 512 MB memory  
- **Frontend Client**: 1 task × 0.25 vCPU (256) × 512 MB memory

### Infrastructure
- **Single NAT Gateway** (cost-optimized)
- **Application Load Balancer** (ALB)
- **ECR Repositories**: 3 repositories with lifecycle policies
- **CloudWatch Logs**: 3-day retention
- **VPC**: Free (only data transfer costs)

## Detailed Cost Breakdown (Monthly)

### 1. ECS Fargate Compute Costs

**Pricing (eu-west-1):**
- vCPU: $0.04048 per vCPU-hour
- Memory: $0.004445 per GB-hour

#### Backend Service
- **vCPU**: 0.5 vCPU × 730 hours/month × $0.04048 = **$14.78/month**
- **Memory**: 1 GB × 730 hours/month × $0.004445 = **$3.24/month**
- **Subtotal**: **$18.02/month**

#### Frontend Admin Service
- **vCPU**: 0.25 vCPU × 730 hours/month × $0.04048 = **$7.39/month**
- **Memory**: 0.5 GB × 730 hours/month × $0.004445 = **$1.62/month**
- **Subtotal**: **$9.01/month**

#### Frontend Client Service
- **vCPU**: 0.25 vCPU × 730 hours/month × $0.04048 = **$7.39/month**
- **Memory**: 0.5 GB × 730 hours/month × $0.004445 = **$1.62/month**
- **Subtotal**: **$9.01/month**

**Total ECS Fargate**: **$36.04/month**

### 2. NAT Gateway

**Pricing (eu-west-1):**
- NAT Gateway: $0.045 per hour
- Data processing: $0.045 per GB

**Cost:**
- **Gateway**: $0.045 × 730 hours = **$32.85/month**
- **Data processing**: Estimated 10 GB/month × $0.045 = **$0.45/month**

**Total NAT Gateway**: **$33.30/month**

### 3. Application Load Balancer (ALB)

**Pricing (eu-west-1):**
- ALB: $0.0225 per hour
- LCU (Load Balancer Capacity Unit): $0.008 per LCU-hour

**Cost:**
- **ALB**: $0.0225 × 730 hours = **$16.43/month**
- **LCU**: Estimated 0.5 LCU average × 730 hours × $0.008 = **$2.92/month**

**Total ALB**: **$19.35/month**

### 4. Amazon ECR (Container Registry)

**Pricing:**
- Storage: $0.10 per GB/month
- Data transfer: Free (within same region)

**Assumptions:**
- 3 repositories
- Average image size: 500 MB per image
- 10 images per repository (lifecycle policy)
- Total storage: 3 repos × 10 images × 0.5 GB = 15 GB

**Cost:**
- **Storage**: 15 GB × $0.10 = **$1.50/month**

**Total ECR**: **$1.50/month**

### 5. CloudWatch Logs

**Pricing:**
- Ingestion: $0.50 per GB ingested
- Storage: $0.03 per GB/month

**Assumptions:**
- 3 services logging
- Estimated 1 GB logs ingested per month total
- 3-day retention
- Average storage: 0.5 GB

**Cost:**
- **Ingestion**: 1 GB × $0.50 = **$0.50/month**
- **Storage**: 0.5 GB × $0.03 = **$0.02/month**

**Total CloudWatch Logs**: **$0.52/month**

### 6. Data Transfer

**Pricing (eu-west-1):**
- Out to Internet: First 1 GB free, then $0.09 per GB
- Inter-AZ: $0.01 per GB

**Assumptions:**
- Estimated 50 GB outbound per month (demo/POC usage)
- Estimated 10 GB inter-AZ per month

**Cost:**
- **Outbound**: (50 GB - 1 GB free) × $0.09 = **$4.41/month**
- **Inter-AZ**: 10 GB × $0.01 = **$0.10/month**

**Total Data Transfer**: **$4.51/month**

### 7. VPC and Networking (Free)

- VPC: **Free**
- Internet Gateway: **Free**
- Subnets: **Free**
- Route Tables: **Free**
- Security Groups: **Free**
- Elastic IP (for NAT): **Free** (when attached to NAT Gateway)

**Total VPC**: **$0.00/month**

### 8. ECS Service Costs (Free)

- ECS Cluster: **Free**
- Task Definitions: **Free**
- Service Management: **Free**

**Total ECS Service**: **$0.00/month**

### 9. IAM and Other Services (Free)

- IAM Roles: **Free**
- CloudWatch Metrics: **Free** (basic metrics)
- ECS Container Insights: **Free** (basic)

**Total**: **$0.00/month**

## Monthly Cost Summary

| Service | Monthly Cost |
|---------|--------------|
| **ECS Fargate Compute** | $36.04 |
| **NAT Gateway** | $33.30 |
| **Application Load Balancer** | $19.35 |
| **ECR Storage** | $1.50 |
| **CloudWatch Logs** | $0.52 |
| **Data Transfer** | $4.51 |
| **VPC & Networking** | $0.00 |
| **Other Services** | $0.00 |
| **TOTAL** | **$95.22/month** |

## Cost Breakdown by Category

- **Compute (ECS Fargate)**: 37.9% ($36.04)
- **Networking (NAT + ALB)**: 55.3% ($52.65)
- **Storage (ECR)**: 1.6% ($1.50)
- **Monitoring (CloudWatch)**: 0.5% ($0.52)
- **Data Transfer**: 4.7% ($4.51)

## Cost Optimization Scenarios

### Scenario 1: Minimal Usage (Current Configuration)
**Total**: **~$95/month**

### Scenario 2: Reduced Usage (Lower Data Transfer)
- Reduce data transfer to 20 GB/month: **~$87/month**
- Savings: **$8/month**

### Scenario 3: Development Hours Only (8 hours/day)
- ECS Fargate: $36.04 × (8/24) = **$12.01/month**
- NAT Gateway: Still $33.30/month (always on)
- ALB: Still $19.35/month (always on)
- **Total**: **~$66/month**
- Savings: **$29/month**

### Scenario 4: Auto-Scaling Peak Usage
If auto-scaling triggers to max capacity (3 tasks per service):
- Backend: 3 tasks × $18.02 = $54.06
- Frontend Admin: 3 tasks × $9.01 = $27.03
- Frontend Client: 3 tasks × $9.01 = $27.03
- **ECS Total**: $108.12/month
- **Total Infrastructure**: **~$167/month**

## Cost Comparison: Single vs Multiple NAT Gateways

- **Single NAT Gateway** (current): $33.30/month
- **Multiple NAT Gateways** (2 AZs): $66.60/month
- **Savings**: $33.30/month ✅

## Annual Cost Estimate

- **Monthly**: $95.22
- **Annual**: $95.22 × 12 = **$1,142.64/year**

## Cost Monitoring Tips

1. **Use AWS Cost Explorer**:
   - Filter by tag: `ResourcePrefix = demo-media01`
   - Set up monthly budgets
   - Enable cost anomaly detection

2. **Monitor Key Metrics**:
   - ECS Fargate vCPU-hours
   - NAT Gateway data processing
   - ALB LCU usage
   - Data transfer volumes

3. **Set Up Billing Alerts**:
   - Alert at 50% of budget: $47.61
   - Alert at 80% of budget: $76.18
   - Alert at 100% of budget: $95.22

## Cost Reduction Strategies

### Immediate Savings
1. ✅ **Single NAT Gateway** (already implemented) - Saves $33/month
2. ✅ **Smaller task sizes** (already optimized) - Minimal cost
3. ✅ **3-day log retention** (already optimized) - Saves ~$2/month

### Additional Savings Options
1. **Use Spot Fargate** (if available): Up to 70% savings on compute
2. **Reserved Capacity**: Not applicable for Fargate
3. **Reduce ALB LCU**: Optimize application to reduce LCU usage
4. **Schedule scaling**: Scale down during off-hours
5. **Use CloudFront**: Reduce ALB data transfer costs

### Not Recommended for Demo/POC
- ❌ Multiple NAT Gateways (adds $33/month)
- ❌ Longer log retention (adds cost)
- ❌ Larger task sizes (unnecessary for demo)

## Notes

- **Pricing is approximate** and based on AWS public pricing as of 2024
- **Actual costs may vary** based on:
  - Actual usage patterns
  - Data transfer volumes
  - Auto-scaling behavior
  - Regional pricing changes
- **Free tier** may apply for new AWS accounts (first 12 months)
- **Data transfer** costs are highly variable and depend on usage

## References

- [ECS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [NAT Gateway Pricing](https://aws.amazon.com/vpc/pricing/)
- [Application Load Balancer Pricing](https://aws.amazon.com/elasticloadbalancing/pricing/)
- [ECR Pricing](https://aws.amazon.com/ecr/pricing/)
- [CloudWatch Logs Pricing](https://aws.amazon.com/cloudwatch/pricing/)

