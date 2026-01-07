# ECS Task Definition - Two Container Architecture

## Overview

The backend ECS service runs **two containers in a single task**:
1. **PostgreSQL container** (`postgres`) - Database server
2. **Backend container** (`backend`) - FastAPI application

## Why Two Containers in One Task?

### Benefits:
1. **Simplified Deployment** - Both containers deploy together as one unit
2. **Local Communication** - Containers can communicate via `localhost` (same network namespace)
3. **Cost Efficient** - No need for separate RDS database (~$15-30/month savings)
4. **Easier Management** - One task definition manages both services
5. **Perfect for Demos/POCs** - Simple setup without external database dependencies

### Trade-offs:
- **Not Production-Ready** - Database and app in same task (no high availability)
- **Single Point of Failure** - If task fails, both database and app go down
- **No Database Persistence** - Data lost if task is replaced (unless using EFS volumes)

## How It Works

### 1. Task Definition Structure

```terraform
resource "aws_ecs_task_definition" "backend" {
  # Task-level resources (shared between containers)
  cpu    = 1024  # 1 vCPU total (512 for backend + 512 for postgres)
  memory = 2048  # 2 GB total (1024 for backend + 1024 for postgres)
  
  container_definitions = [
    # Container 1: PostgreSQL
    {
      name  = "postgres"
      image = "postgres:15-alpine"
      cpu   = 512
      memory = 1024
    },
    # Container 2: Backend
    {
      name  = "backend"
      image = "your-backend-image"
      cpu   = 512
      memory = 1024
      dependsOn = [
        {
          containerName = "postgres"
          condition     = "START"  # Backend waits for postgres to start
        }
      ]
    }
  ]
}
```

### 2. Container Communication

**Bridge Network Mode:**
- Both containers run in the same Docker bridge network
- They share the same network namespace
- Can communicate via `localhost` or container name

**Connection Flow:**
```
Backend Container                    PostgreSQL Container
     |                                      |
     |  (localhost:5432)                   |
     |------------------------------------->|
     |   Connection Request                |
     |<-------------------------------------|
     |   Connection Accepted               |
     |                                      |
```

### 3. Startup Sequence

1. **Task Starts** → ECS creates a new task
2. **PostgreSQL Container Starts** → Database server initializes
3. **PostgreSQL Health Check** → Waits 60 seconds, then checks if ready
4. **Backend Container Starts** → After PostgreSQL starts (`dependsOn: START`)
5. **Backend Retries Connection** → Up to 10 attempts with exponential backoff
6. **Both Containers Running** → Task is healthy

### 4. Environment Variables

**PostgreSQL Container:**
```yaml
POSTGRES_USER: photoportal
POSTGRES_PASSWORD: Leeds@2026
POSTGRES_DB: photoportal
POSTGRES_HOST: 0.0.0.0  # Listen on all interfaces
```

**Backend Container:**
```yaml
DATABASE_URL: postgresql://photoportal:Leeds%402026@localhost:5432/photoportal
# Note: Password is URL-encoded (@ becomes %40)
```

### 5. Port Mapping

**PostgreSQL:**
- Container Port: `5432`
- Host Port: `0` (dynamic - ECS assigns random port)
- **Why dynamic?** Multiple tasks can run on same EC2 instance without port conflicts

**Backend:**
- Container Port: `8000`
- Host Port: `0` (dynamic - ECS assigns random port)
- ALB routes traffic to the dynamic port

### 6. Resource Allocation

**Task Total Resources:**
- CPU: 1024 (1 vCPU)
- Memory: 2048 MB (2 GB)

**PostgreSQL Container:**
- CPU: 512 (0.5 vCPU)
- Memory: 1024 MB (1 GB)

**Backend Container:**
- CPU: 512 (0.5 vCPU)
- Memory: 1024 MB (1 GB)

## Container Lifecycle

### When Task Starts:
```
Time 0s:   Task created
Time 1s:   PostgreSQL container starts
Time 2s:   PostgreSQL initializing database...
Time 60s:  PostgreSQL health check starts
Time 61s:  PostgreSQL health check passes
Time 62s:  Backend container starts (dependsOn: START)
Time 63s:  Backend tries to connect to PostgreSQL
Time 64s:  Connection successful!
Time 65s:  Backend creates database tables
Time 66s:  Backend starts Uvicorn server
Time 67s:  Both containers running ✅
```

### When Task Stops:
```
Time 0s:   Task stop requested
Time 1s:   Backend receives SIGTERM
Time 2s:   Backend stops accepting new requests
Time 3s:   Backend container stops
Time 4s:   PostgreSQL receives SIGTERM
Time 5s:   PostgreSQL performs checkpoint
Time 6s:   PostgreSQL container stops
Time 7s:   Task stopped
```

## Why Not Separate Services?

### Option 1: Current Setup (Two Containers in One Task)
✅ **Pros:**
- Simple deployment
- No external database needed
- Cost-effective (no RDS)
- Local communication (fast)

❌ **Cons:**
- No high availability
- Data lost if task replaced
- Can't scale database independently

### Option 2: Separate ECS Service for PostgreSQL
✅ **Pros:**
- Can scale independently
- Better isolation

❌ **Cons:**
- More complex setup
- Need service discovery
- Higher cost (two services)

### Option 3: AWS RDS (Managed Database)
✅ **Pros:**
- High availability
- Automated backups
- Scalable
- Production-ready

❌ **Cons:**
- Higher cost (~$15-30/month minimum)
- More complex networking
- Overkill for demos/POCs

## Current Architecture (Demo/POC)

```
┌─────────────────────────────────────┐
│         ECS Task (Backend)          │
│  ┌──────────────┐  ┌──────────────┐ │
│  │  PostgreSQL  │  │   Backend    │ │
│  │  Container   │  │  Container   │ │
│  │              │  │              │ │
│  │ Port: 5432   │  │ Port: 8000   │ │
│  │              │  │              │ │
│  └──────┬───────┘  └──────┬───────┘ │
│         │                 │          │
│         └────────┬────────┘          │
│                  │                   │
│         localhost:5432               │
└──────────────────┼───────────────────┘
                   │
                   │ (via ALB)
                   ▼
            Application Load Balancer
```

## Key Points

1. **Both containers share the same task resources** (CPU/Memory)
2. **They communicate via localhost** (same network namespace)
3. **Backend waits for PostgreSQL** before starting (`dependsOn`)
4. **Dynamic ports** prevent conflicts when multiple tasks run
5. **Perfect for demos** - Simple, cost-effective, no external dependencies

## When to Use This Pattern

✅ **Good For:**
- Development environments
- Demos and POCs
- Cost-sensitive deployments
- Simple applications
- Non-critical workloads

❌ **Not Good For:**
- Production applications requiring high availability
- Applications needing database persistence across deployments
- Applications requiring independent scaling
- Multi-region deployments

