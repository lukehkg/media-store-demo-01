# Application Load Balancer Routing Rules

Configure your ALB with the following listener rules for separated frontends:

## Rule Priority 1: Admin Subdomain
- **Condition**: Host header is `admin.yourdomain.com`
- **Action**: Forward to `photo-portal-frontend-admin` target group (port 3000)
- **Target Group**: `admin-tg`
- **Health Check**: `http://admin.yourdomain.com/`

## Rule Priority 2: API Path
- **Condition**: Path pattern is `/api/*`
- **Action**: Forward to `photo-portal-backend` target group (port 8000)
- **Target Group**: `backend-tg`
- **Health Check**: `http://api.yourdomain.com/health`

## Rule Priority 3: Tenant Subdomains (Client Portal)
- **Condition**: Host header matches pattern `*.yourdomain.com` (wildcard, excluding admin)
- **Action**: Forward to `photo-portal-frontend-client` target group (port 3001)
- **Target Group**: `client-tg`
- **Health Check**: `http://*.yourdomain.com/`

## Default Action
- Forward to `photo-portal-frontend-client` target group (default client portal)

## Target Groups

### Backend Target Group
- **Name**: `backend-tg`
- **Protocol**: HTTP
- **Port**: 8000
- **Health Check Path**: `/health`
- **Health Check Protocol**: HTTP
- **Health Check Interval**: 30 seconds
- **Unhealthy Threshold**: 3

### Admin Frontend Target Group
- **Name**: `admin-tg`
- **Protocol**: HTTP
- **Port**: 3000
- **Health Check Path**: `/admin`
- **Health Check Protocol**: HTTP
- **Health Check Interval**: 30 seconds
- **Unhealthy Threshold**: 2

### Client Frontend Target Group
- **Name**: `client-tg`
- **Protocol**: HTTP
- **Port**: 3001
- **Health Check Path**: `/client`
- **Health Check Protocol**: HTTP
- **Health Check Interval**: 30 seconds
- **Unhealthy Threshold**: 2

## Scaling Configuration

### Admin Frontend
- **Min Tasks**: 1
- **Max Tasks**: 3
- **Desired**: 1
- **CPU Scaling**: 70% target
- **Low traffic service** - minimal scaling needed

### Client Frontend
- **Min Tasks**: 2
- **Max Tasks**: 20
- **Desired**: 2
- **CPU Scaling**: 70% target
- **Request Scaling**: 2000 requests/target
- **High traffic service** - aggressive scaling

### Backend
- **Min Tasks**: 2
- **Max Tasks**: 10
- **Desired**: 2
- **CPU Scaling**: 70% target
- **Moderate scaling** for API load

## Cloudflare Configuration

1. Point your domain's nameservers to Cloudflare
2. Create DNS records:
   - `admin.yourdomain.com` → CNAME → ALB DNS name (proxied)
   - `api.yourdomain.com` → CNAME → ALB DNS name (proxied)
   - `*.yourdomain.com` → CNAME → ALB DNS name (proxied)
3. Enable SSL/TLS: Full (strict) mode
4. Enable CDN caching for static assets
5. Configure page rules for caching

## Security Groups

### Backend Security Group
- Inbound: Port 8000 from ALB security group
- Outbound: All traffic

### Frontend Security Groups
- Inbound: Port 3000/3001 from ALB security group
- Outbound: All traffic

### ALB Security Group
- Inbound: Port 80/443 from 0.0.0.0/0
- Outbound: All traffic
