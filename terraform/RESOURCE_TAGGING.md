# Resource Tagging and Management Guide

All AWS resources created by this Terraform configuration use the prefix **`demo-media01`** for easy management and searching.

## Resource Naming Convention

All resources follow this naming pattern:
```
{demo-media01}-{resource-type}-{environment}
```

Example:
- VPC: `demo-media01-vpc-dev`
- ECS Cluster: `demo-media01-cluster-dev`
- ALB: `demo-media01-alb-dev`
- Backend Service: `demo-media01-backend-dev`

## Tagging Strategy

All resources are tagged with the following tags for easy searching and management:

### Default Tags (Applied to ALL resources)
- **Environment**: `dev` (or staging/prod)
- **Project**: `demo-media01`
- **ResourcePrefix**: `demo-media01` (for easy filtering)
- **ManagedBy**: `Terraform`
- **Purpose**: `Demo-POC`

### Resource-Specific Tags
- **Name**: Full resource name (e.g., `demo-media01-backend-ecr-dev`)
- **Service**: Service name (for ECR repositories: `backend`, `frontend-admin`, `frontend-client`)
- **Type**: Resource type (for subnets: `public`, `private`)

## Searching Resources in AWS Console

### Using Resource Groups

1. **Create a Resource Group**:
   - Go to AWS Resource Groups → Create Resource Group
   - Select "Tag-based"
   - Add tag: `ResourcePrefix` = `demo-media01`
   - Save as "demo-media01-resources"

2. **View All Resources**:
   - Open the resource group
   - See all resources with the `demo-media01` prefix

### Using AWS CLI

**List all resources with demo-media01 prefix:**

```bash
# List all EC2 resources (VPC, subnets, etc.)
aws ec2 describe-tags --filters "Name=tag:ResourcePrefix,Values=demo-media01" --region eu-west-1

# List ECS clusters
aws ecs list-clusters --region eu-west-1 | grep demo-media01

# List ECR repositories
aws ecr describe-repositories --region eu-west-1 | grep demo-media01

# List ECS services
aws ecs list-services --cluster demo-media01-cluster --region eu-west-1

# List Load Balancers
aws elbv2 describe-load-balancers --region eu-west-1 | grep demo-media01

# List Security Groups
aws ec2 describe-security-groups --filters "Name=tag:ResourcePrefix,Values=demo-media01" --region eu-west-1
```

### Using AWS Console Search

1. **Tag Editor**:
   - Go to AWS Resource Groups → Tag Editor
   - Select region: `eu-west-1`
   - Filter by: `ResourcePrefix` = `demo-media01`
   - View all resources

2. **Individual Service Consoles**:
   - Use the search/filter boxes in each service console
   - Search for: `demo-media01`

## Cost Tracking

To track costs for all `demo-media01` resources:

1. **AWS Cost Explorer**:
   - Go to AWS Cost Management → Cost Explorer
   - Create a filter: `Tag: ResourcePrefix` = `demo-media01`
   - View costs by service, time period, etc.

2. **Cost Allocation Tags**:
   - Enable `ResourcePrefix` as a cost allocation tag
   - Go to AWS Cost Management → Cost Allocation Tags
   - Activate `ResourcePrefix` tag

## Resource List

### Networking
- VPC: `demo-media01-vpc-dev`
- Internet Gateway: `demo-media01-igw-dev`
- NAT Gateway: `demo-media01-nat-single-dev` (or `-nat-1-dev`, `-nat-2-dev`)
- Public Subnets: `demo-media01-public-subnet-1-dev`, `demo-media01-public-subnet-2-dev`
- Private Subnets: `demo-media01-private-subnet-1-dev`, `demo-media01-private-subnet-2-dev`
- Route Tables: `demo-media01-public-rt-dev`, `demo-media01-private-rt-1-dev`, `demo-media01-private-rt-2-dev`

### Load Balancing
- ALB: `demo-media01-alb-dev`
- Target Groups:
  - `demo-media01-backend-tg-dev`
  - `demo-media01-frontend-admin-tg-dev`
  - `demo-media01-frontend-client-tg-dev`

### Security
- Security Groups:
  - `demo-media01-alb-sg-dev`
  - `demo-media01-backend-ecs-sg-dev`
  - `demo-media01-frontend-ecs-sg-dev`

### ECS
- Cluster: `demo-media01-cluster-dev`
- Services:
  - `demo-media01-backend-dev`
  - `demo-media01-frontend-admin-dev`
  - `demo-media01-frontend-client-dev`
- Task Definitions:
  - `demo-media01-backend-dev`
  - `demo-media01-frontend-admin-dev`
  - `demo-media01-frontend-client-dev`

### ECR
- Repositories:
  - `demo-media01-backend`
  - `demo-media01-frontend-admin`
  - `demo-media01-frontend-client`

### IAM
- Roles:
  - `demo-media01-ecs-task-execution-role-dev`
  - `demo-media01-ecs-task-role-dev`

### CloudWatch
- Log Groups:
  - `/ecs/demo-media01-backend-dev`
  - `/ecs/demo-media01-frontend-admin-dev`
  - `/ecs/demo-media01-frontend-client-dev`

### Auto Scaling
- Policies:
  - `demo-media01-backend-cpu-scaling-dev`
  - `demo-media01-backend-memory-scaling-dev`
  - `demo-media01-frontend-admin-cpu-scaling-dev`
  - `demo-media01-frontend-client-cpu-scaling-dev`

## Cleanup

To delete all resources with the `demo-media01` prefix:

```bash
# Run Terraform destroy
cd terraform
terraform destroy

# Or manually delete using tags
# (Use with caution - verify resources first)
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=ResourcePrefix,Values=demo-media01 \
  --region eu-west-1
```

## Best Practices

1. **Always use the prefix** when creating new resources
2. **Search by ResourcePrefix tag** for quick resource discovery
3. **Use Resource Groups** for visual management
4. **Enable cost allocation tags** for cost tracking
5. **Document any manual changes** to maintain consistency

