# EC2 Alternative Cost Analysis

Comparison between current ECS Fargate setup vs EC2 t3.small alternative.

## Current Architecture (ECS Fargate)

- **ECS Fargate**: 3 services running on Fargate
- **NAT Gateway**: Single NAT Gateway for private subnet internet access
- **Application Load Balancer**: ALB for routing and load balancing
- **VPC**: Custom VPC with public/private subnets

## Alternative Architecture (EC2 t3.small)

- **EC2 t3.small**: Single instance running all services via Docker Compose
- **No NAT Gateway**: EC2 in public subnet (or use VPC endpoints)
- **No ALB**: Use EC2 public IP or Route53 + Elastic IP
- **VPC**: Simplified VPC (public subnet only, or minimal setup)

## Cost Comparison (Monthly)

### Current Setup (with Scheduler)

| Component | Monthly Cost |
|-----------|--------------|
| ECS Fargate (216.5 hrs) | $10.69 |
| NAT Gateway | $33.30 |
| ALB | $19.34 |
| ECR Storage | $1.50 |
| CloudWatch Logs | $0.50 |
| Data Transfer | $4.51 |
| Lambda (Scheduler) | $0.00 |
| **TOTAL** | **$69.84** |

### EC2 t3.small Alternative (with Scheduler)

**EC2 t3.small Pricing (eu-west-1):**
- Instance: $0.0208 per hour
- EBS Storage: $0.10 per GB/month (30 GB recommended)
- Data Transfer: Same as current

**With Scheduler (216.5 hours/month):**
- EC2 Instance: $0.0208 × 216.5 = **$4.50/month**
- EBS Storage (30 GB): 30 × $0.10 = **$3.00/month**
- Data Transfer: **$4.51/month** (same)
- CloudWatch Logs: **$0.50/month** (same)
- ECR Storage: **$1.50/month** (same, or use Docker Hub)
- **No NAT Gateway**: **$0.00** (saves $33.30)
- **No ALB**: **$0.00** (saves $19.34)
- **TOTAL**: **$14.01/month**

**Without Scheduler (730 hours/month, 24/7):**
- EC2 Instance: $0.0208 × 730 = **$15.18/month**
- EBS Storage: **$3.00/month**
- Data Transfer: **$4.51/month**
- CloudWatch Logs: **$0.50/month**
- ECR Storage: **$1.50/month**
- **TOTAL**: **$24.69/month**

## Cost Savings

### With Scheduler
- **Current**: $69.84/month
- **EC2 Alternative**: $14.01/month
- **Savings**: **$55.83/month (80% reduction)**
- **Annual Savings**: **$669.96/year**

### Without Scheduler (24/7)
- **Current**: $95.19/month
- **EC2 Alternative**: $24.69/month
- **Savings**: **$70.50/month (74% reduction)**
- **Annual Savings**: **$846.00/year**

## EC2 t3.small Specifications

- **vCPUs**: 2
- **Memory**: 2 GB RAM
- **Network Performance**: Up to 5 Gbps
- **EBS Bandwidth**: Up to 2,085 Mbps
- **Storage**: EBS only (no instance store)

## Architecture Considerations

### Advantages of EC2 Approach

1. **Massive Cost Savings**: 74-80% reduction in monthly costs
2. **Simpler Architecture**: No NAT Gateway, no ALB needed
3. **Full Control**: Direct access to the instance
4. **Easier Debugging**: SSH access, direct log access
5. **Docker Compose**: Can run all services on one instance
6. **No Cold Starts**: Services always available when instance is running

### Disadvantages of EC2 Approach

1. **Single Point of Failure**: One instance = no high availability
2. **Manual Scaling**: Must manually resize instance or add more
3. **Maintenance Overhead**: OS updates, security patches, monitoring
4. **Limited Resources**: t3.small may be tight for 3 services
5. **No Auto-Scaling**: Can't automatically scale based on load
6. **No Load Balancing**: Single instance handles all traffic
7. **Security**: Public subnet exposure (mitigated with security groups)
8. **Backup Management**: Must manage EBS snapshots manually

## Recommended EC2 Configuration

### Option 1: Single t3.small (Minimal Cost)
- **Instance**: t3.small (2 vCPU, 2 GB RAM)
- **Storage**: 30 GB gp3 EBS
- **Network**: Public subnet with Elastic IP
- **Cost**: ~$14/month (with scheduler)

### Option 2: t3.medium (More Resources)
- **Instance**: t3.medium (2 vCPU, 4 GB RAM)
- **Storage**: 30 GB gp3 EBS
- **Cost**: ~$28/month (with scheduler)
- **Better for**: More resource-intensive workloads

### Option 3: Two t3.small (High Availability)
- **Instances**: 2 × t3.small
- **Load Balancer**: Application Load Balancer (adds $19.34/month)
- **Cost**: ~$47/month (with scheduler)
- **Better for**: Production with HA requirements

## Migration Path

### Step 1: Create EC2 Instance
```bash
# Launch t3.small in eu-west-1
# Use Amazon Linux 2023 or Ubuntu 22.04
# Security group: Allow HTTP (80), HTTPS (443), SSH (22)
```

### Step 2: Install Docker & Docker Compose
```bash
# Install Docker
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 3: Deploy Services
```bash
# Clone repository
git clone https://github.com/lukehkg/media-store-demo-01.git
cd media-store-demo-01

# Use docker-compose.yml
docker-compose up -d
```

### Step 4: Set Up Scheduler
- Use AWS Systems Manager (SSM) to start/stop instance
- Or use Lambda to start/stop EC2 instance
- Schedule: Same as current (8 AM - 6 PM GMT+1)

## Cost Breakdown: EC2 vs Fargate

### EC2 t3.small (with scheduler)
- **Compute**: $4.50/month (216.5 hours)
- **Storage**: $3.00/month (30 GB EBS)
- **Networking**: $0.00 (no NAT, no ALB)
- **Other**: $6.51/month (logs, ECR, data transfer)
- **Total**: **$14.01/month**

### ECS Fargate (with scheduler)
- **Compute**: $10.69/month (216.5 hours)
- **NAT Gateway**: $33.30/month (always on)
- **ALB**: $19.34/month (always on)
- **Other**: $6.51/month
- **Total**: **$69.84/month**

## Recommendations

### Use EC2 t3.small if:
- ✅ **Budget is primary concern** (80% cost savings)
- ✅ **Demo/POC environment** (not production)
- ✅ **Low to moderate traffic** (< 1000 requests/day)
- ✅ **Single region deployment** (no multi-region needed)
- ✅ **Simple architecture** (all services on one instance)
- ✅ **You can accept downtime** (single instance)

### Keep ECS Fargate if:
- ✅ **High availability required** (production)
- ✅ **Auto-scaling needed** (variable traffic)
- ✅ **Multi-AZ deployment** (disaster recovery)
- ✅ **Service isolation** (separate containers)
- ✅ **Managed service** (less maintenance)
- ✅ **Compliance requirements** (private subnets)

## Hybrid Approach (Best of Both)

Consider a **hybrid approach** for maximum savings:

1. **Development/Staging**: Use EC2 t3.small ($14/month)
2. **Production**: Use ECS Fargate with scheduler ($70/month)
3. **Total**: $84/month vs $210/month (without scheduler)

## Terraform for EC2 Alternative

Would you like me to create Terraform configuration for:
- EC2 t3.small instance
- Security groups
- Elastic IP
- Systems Manager for scheduling
- CloudWatch monitoring

This would provide the same cost savings while maintaining infrastructure-as-code.

## Conclusion

**For demo/POC**: EC2 t3.small saves **$55.83/month (80%)** and is recommended.

**For production**: ECS Fargate provides better reliability and scalability, worth the extra cost.

**Best approach**: Use EC2 for dev/staging, Fargate for production.

