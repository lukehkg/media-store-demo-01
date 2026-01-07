# Terraform Deployment Steps

## Prerequisites
- AWS CLI configured with credentials
- Terraform >= 1.0 installed
- `terraform.tfvars` file created (copy from `terraform.tfvars.example`)

## First Time Deployment

```bash
# 1. Navigate to terraform directory
cd terraform/demo

# 2. Initialize Terraform (downloads providers)
terraform init

# 3. Review what will be created
terraform plan

# 4. Apply changes (creates all resources)
terraform apply
```

## Updating Existing Infrastructure

After making changes to Terraform files (like updating ECS task definitions):

```bash
# 1. Navigate to terraform directory
cd terraform/demo

# 2. Initialize (if needed - usually only needed first time or after provider updates)
terraform init

# 3. Review changes (IMPORTANT - always check what will change!)
terraform plan

# 4. Review the plan output carefully:
#    - Check for any unexpected deletions
#    - Verify new resources match expectations
#    - Look for "forces replacement" warnings

# 5. Apply changes (updates existing resources)
terraform apply

# 6. Confirm when prompted (type 'yes')
```

## Common Commands

### View Current State
```bash
terraform show
```

### List Resources
```bash
terraform state list
```

### Refresh State (sync with AWS)
```bash
terraform refresh
```

### Plan with Specific Variables
```bash
terraform plan -var="project_name=dev02" -var="environment=env02"
```

### Apply with Auto-approve (skip confirmation)
```bash
terraform apply -auto-approve
```

### Destroy All Resources (CAREFUL!)
```bash
terraform destroy
```

## After Making Changes to ECS Task Definitions

When you update `ecs.tf` (like we just did for PostgreSQL connection fixes):

1. **Navigate to terraform directory:**
   ```bash
   cd terraform/demo
   ```

2. **Review changes:**
   ```bash
   terraform plan
   ```
   
   You should see:
   - `aws_ecs_task_definition.backend` will be replaced (because task definition changes)
   - ECS service will be updated to use new task definition

3. **Apply changes:**
   ```bash
   terraform apply
   ```

4. **Monitor deployment:**
   - Check AWS ECS Console for service updates
   - Monitor CloudWatch logs for container startup
   - Verify health checks pass

## Troubleshooting

### If Terraform State is Out of Sync
```bash
# Refresh state from AWS
terraform refresh

# Then plan again
terraform plan
```

### If You Get "Resource Already Exists" Error
```bash
# Import existing resource
terraform import aws_resource_type.resource_name resource_id

# Example:
terraform import aws_ecs_cluster.main dev02-cluster
```

### If You Need to Update Specific Resource Only
```bash
# Target specific resource
terraform apply -target=aws_ecs_task_definition.backend
```

## Important Notes

⚠️ **Always run `terraform plan` before `terraform apply`** to see what will change!

⚠️ **Task definition changes force replacement** - ECS will create new task definition and update service

⚠️ **No downtime** - ECS will do rolling update (start new tasks before stopping old ones)

⚠️ **Check your `terraform.tfvars`** - Make sure variables match your actual AWS resources:
   - `project_name` should match your ECR/ECS naming
   - `ecs_cluster_name` should match your cluster name
   - `ec2_key_name` should match your EC2 key pair name

