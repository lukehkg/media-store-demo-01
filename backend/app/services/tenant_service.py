from sqlalchemy.orm import Session
from app.models import Tenant, User, Photo, UsageLog
from app.services.b2_service import B2Service
from app.services.cloudflare_service import CloudflareService
from app.config import settings
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
import secrets
import logging

logger = logging.getLogger(__name__)

class TenantService:
    def __init__(self, db: Session):
        self.db = db
        self.cloudflare = CloudflareService()
    
    def create_tenant(
        self,
        name: str,
        email: str,
        subdomain: str,
        b2_key_id: Optional[str] = None,
        b2_key: Optional[str] = None,
        b2_bucket: Optional[str] = None,
        storage_limit_mb: int = None,
        expires_at: Optional[datetime] = None
    ) -> Tenant:
        """Create a new tenant with subdomain and B2 setup"""
        
        # Check if subdomain exists
        existing = self.db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
        if existing:
            raise ValueError(f"Subdomain {subdomain} already exists")
        
        # Set defaults
        if storage_limit_mb is None:
            storage_limit_mb = settings.DEFAULT_STORAGE_LIMIT_MB
        
        if expires_at is None:
            expires_at = datetime.now(timezone.utc) + timedelta(days=settings.DEFAULT_TENANT_EXPIRY_DAYS)
        
        # Create tenant
        tenant = Tenant(
            subdomain=subdomain,
            name=name,
            email=email,
            b2_key_id=b2_key_id or settings.B2_APPLICATION_KEY_ID,
            b2_key=b2_key or settings.B2_APPLICATION_KEY,  # In production, encrypt this
            b2_bucket=b2_bucket or settings.B2_BUCKET_NAME,
            storage_limit_mb=storage_limit_mb,
            expires_at=expires_at,
            is_active=True
        )
        
        self.db.add(tenant)
        self.db.flush()
        
        # Create Cloudflare subdomain
        try:
            self.cloudflare.create_subdomain(subdomain)
        except Exception as e:
            logger.error(f"Failed to create Cloudflare subdomain: {e}")
            # Continue anyway - can be created manually
        
        self.db.commit()
        self.db.refresh(tenant)
        
        return tenant
    
    def get_tenant(self, tenant_id: int) -> Optional[Tenant]:
        return self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    def get_tenant_by_subdomain(self, subdomain: str) -> Optional[Tenant]:
        return self.db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    
    def list_tenants(self, skip: int = 0, limit: int = 100) -> list[Tenant]:
        return self.db.query(Tenant).offset(skip).limit(limit).all()
    
    def update_tenant_storage(self, tenant_id: int, bytes_added: int):
        """Update tenant storage usage"""
        tenant = self.get_tenant(tenant_id)
        if tenant:
            tenant.storage_used_bytes += bytes_added
            self.db.commit()
    
    def check_storage_limit(self, tenant_id: int, file_size_bytes: int) -> bool:
        """Check if tenant can upload file (within storage limit)"""
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return False
        
        limit_bytes = tenant.storage_limit_mb * 1024 * 1024
        return (tenant.storage_used_bytes + file_size_bytes) <= limit_bytes
    
    def delete_tenant(self, tenant_id: int) -> bool:
        """Delete tenant and cleanup resources"""
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return False
        
        # Delete Cloudflare subdomain
        try:
            self.cloudflare.delete_subdomain(tenant.subdomain)
        except Exception as e:
            logger.error(f"Failed to delete Cloudflare subdomain: {e}")
        
        # Delete B2 files (optional - or mark for cleanup)
        # b2_service = B2Service(tenant.b2_key_id, tenant.b2_key, tenant.b2_bucket)
        # files = b2_service.list_files(f"tenant_{tenant_id}/")
        # for file in files:
        #     b2_service.delete_file(file['Key'])
        
        # Delete tenant (cascade will delete related records)
        self.db.delete(tenant)
        self.db.commit()
        
        return True
    
    def get_tenant_stats(self, tenant_id: int) -> Dict:
        """Get tenant usage statistics"""
        tenant = self.get_tenant(tenant_id)
        if not tenant:
            return {}
        
        photo_count = self.db.query(Photo).filter(Photo.tenant_id == tenant_id).count()
        
        return {
            "tenant_id": tenant.id,
            "subdomain": tenant.subdomain,
            "name": tenant.name,
            "storage_limit_mb": tenant.storage_limit_mb,
            "storage_used_mb": round(tenant.storage_used_bytes / (1024 * 1024), 2),
            "storage_used_bytes": tenant.storage_used_bytes,
            "storage_percentage": round((tenant.storage_used_bytes / (tenant.storage_limit_mb * 1024 * 1024)) * 100, 2),
            "photo_count": photo_count,
            "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
            "expires_at": tenant.expires_at.isoformat() if tenant.expires_at else None,
            "is_active": tenant.is_active
        }

