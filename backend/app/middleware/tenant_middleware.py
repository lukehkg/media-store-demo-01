from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Tenant
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip tenant resolution for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            response = await call_next(request)
            return response
        
        # Extract subdomain from host
        host = request.headers.get("host", "")
        
        # Skip tenant resolution for admin routes and health checks
        if request.url.path.startswith("/api/admin") or request.url.path in ["/", "/health"]:
            request.state.tenant = None
            request.state.is_admin = True
            response = await call_next(request)
            return response
        
        # Extract subdomain
        subdomain = None
        if host:
            parts = host.split(".")
            if len(parts) >= 3:
                subdomain = parts[0]
            elif len(parts) == 2 and parts[0] != "www" and parts[0] != "admin":
                subdomain = parts[0]
        
        # For admin subdomain
        if subdomain == "admin":
            request.state.tenant = None
            request.state.is_admin = True
            response = await call_next(request)
            return response
        
        # Resolve tenant from subdomain
        if subdomain:
            db: Session = SessionLocal()
            try:
                tenant = db.query(Tenant).filter(
                    Tenant.subdomain == subdomain,
                    Tenant.is_active == True
                ).first()
                
                if not tenant:
                    raise HTTPException(status_code=404, detail="Tenant not found")
                
                # Check expiration - use timezone-aware datetime
                from datetime import datetime, timezone
                if tenant.expires_at and tenant.expires_at < datetime.now(timezone.utc):
                    raise HTTPException(status_code=403, detail="Tenant subscription expired")
                
                request.state.tenant = tenant
                request.state.tenant_id = tenant.id
                request.state.is_admin = False
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error resolving tenant: {e}")
                raise HTTPException(status_code=500, detail="Error resolving tenant")
            finally:
                db.close()
        else:
            request.state.tenant = None
            request.state.is_admin = False
        
        response = await call_next(request)
        return response

