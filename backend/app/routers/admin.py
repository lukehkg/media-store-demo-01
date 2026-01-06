from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from app.database import get_db
from app.models import User, Tenant, Photo, UsageLog, ApiLog
from app.routers.auth import get_current_user
from app.services.tenant_service import TenantService
from app.services.b2_service import B2Service
from app.config import settings
from datetime import datetime, timedelta, timezone
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class TenantCreate(BaseModel):
    name: str
    email: EmailStr
    subdomain: str
    storage_limit_mb: Optional[int] = 500
    expires_in_days: Optional[int] = 90
    password: Optional[str] = None  # Optional password, auto-generated if not provided
    b2_key_id: Optional[str] = None
    b2_key: Optional[str] = None
    b2_bucket: Optional[str] = None

class TenantStorageUpdate(BaseModel):
    storage_limit_mb: int = Field(..., gt=0, description="Storage limit in MB")
    expires_at: Optional[datetime] = None

class TenantResponse(BaseModel):
    id: int
    subdomain: str
    name: str
    email: str
    storage_limit_mb: int
    storage_used_bytes: int
    created_at: Optional[datetime]
    expires_at: Optional[datetime]
    is_active: bool
    password: Optional[str] = None  # Only returned on creation

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    storage_limit_mb: Optional[int] = None
    expires_in_days: Optional[int] = None
    is_active: Optional[bool] = None

class TenantDetailsResponse(BaseModel):
    id: int
    subdomain: str
    name: str
    email: str
    storage_limit_mb: int
    storage_used_bytes: int
    created_at: Optional[datetime]
    expires_at: Optional[datetime]
    is_active: bool
    dns_record: Optional[str] = None  # DNS subdomain URL
    b2_bucket: Optional[str] = None
    user_count: int = 0
    photo_count: int = 0

class TenantStatsResponse(BaseModel):
    tenant_id: int
    subdomain: str
    name: str
    storage_limit_mb: int
    storage_used_mb: float
    storage_used_bytes: int
    storage_percentage: float
    photo_count: int
    created_at: Optional[str]
    expires_at: Optional[str]
    is_active: bool

class SystemStatsResponse(BaseModel):
    total_tenants: int
    active_tenants: int
    total_storage_used_mb: float
    b2_bucket_storage_mb: Optional[float] = 0  # Actual B2 bucket storage
    b2_bucket_objects: Optional[int] = 0  # Total objects in B2 bucket
    total_photos: int
    total_users: Optional[int] = 0
    registered_clients: Optional[int] = 0
    tenants: List[TenantStatsResponse]

class B2ConfigUpdate(BaseModel):
    key_id: str
    key: str
    bucket_name: str
    endpoint: Optional[str] = ''

def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.post("/tenants", response_model=TenantResponse)
async def create_tenant(
    tenant_data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new tenant"""
    tenant_service = TenantService(db)
    
    try:
        expires_at = None
        if tenant_data.expires_in_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=tenant_data.expires_in_days)
        
        tenant = tenant_service.create_tenant(
            name=tenant_data.name,
            email=tenant_data.email,
            subdomain=tenant_data.subdomain,
            b2_key_id=tenant_data.b2_key_id,
            b2_key=tenant_data.b2_key,
            b2_bucket=tenant_data.b2_bucket,
            storage_limit_mb=tenant_data.storage_limit_mb,
            expires_at=expires_at
        )
        
        # Create a user account for the tenant
        from app.routers.auth import get_password_hash
        import secrets
        # Use provided password or generate a random one
        if tenant_data.password:
            temp_password = tenant_data.password
        else:
            temp_password = secrets.token_urlsafe(12)
        hashed_password = get_password_hash(temp_password)
        
        user = User(
            email=tenant_data.email,
            hashed_password=hashed_password,
            tenant_id=tenant.id,
            is_admin=False,
            is_tenant_admin=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        logger.info(f"Created tenant {tenant.id} with user {user.id}. Password: {temp_password}")
        
        return TenantResponse(
            id=tenant.id,
            subdomain=tenant.subdomain,
            name=tenant.name,
            email=tenant.email,
            storage_limit_mb=tenant.storage_limit_mb,
            storage_used_bytes=tenant.storage_used_bytes,
            created_at=tenant.created_at,
            expires_at=tenant.expires_at,
            is_active=tenant.is_active,
            password=temp_password  # Return password so admin can share it
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/tenants", response_model=List[TenantResponse])
async def list_tenants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all tenants"""
    tenant_service = TenantService(db)
    tenants = tenant_service.list_tenants(skip=skip, limit=limit)
    
    return [
        TenantResponse(
            id=t.id,
            subdomain=t.subdomain,
            name=t.name,
            email=t.email,
            storage_limit_mb=t.storage_limit_mb,
            storage_used_bytes=t.storage_used_bytes,
            created_at=t.created_at,
            expires_at=t.expires_at,
            is_active=t.is_active,
            password=None  # Never return password in list
        )
        for t in tenants
    ]

@router.get("/tenants/{tenant_id}", response_model=TenantStatsResponse)
async def get_tenant_stats(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get detailed stats for a tenant"""
    tenant_service = TenantService(db)
    stats = tenant_service.get_tenant_stats(tenant_id)
    
    if not stats:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    return TenantStatsResponse(**stats)

@router.get("/tenants/{tenant_id}/details", response_model=TenantDetailsResponse)
async def get_tenant_details(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get detailed tenant information including DNS and resource mappings"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get user count
    user_count = db.query(User).filter(User.tenant_id == tenant_id).count()
    
    # Get photo count
    photo_count = db.query(Photo).filter(Photo.tenant_id == tenant_id).count()
    
    # Build DNS record URL
    from app.config import settings
    dns_record = f"{tenant.subdomain}.{settings.BASE_DOMAIN}" if settings.BASE_DOMAIN else None
    
    return TenantDetailsResponse(
        id=tenant.id,
        subdomain=tenant.subdomain,
        name=tenant.name,
        email=tenant.email,
        storage_limit_mb=tenant.storage_limit_mb,
        storage_used_bytes=tenant.storage_used_bytes,
        created_at=tenant.created_at,
        expires_at=tenant.expires_at,
        is_active=tenant.is_active,
        dns_record=dns_record,
        b2_bucket=tenant.b2_bucket,
        user_count=user_count,
        photo_count=photo_count
    )

@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: int,
    update_data: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update tenant details"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if update_data.name is not None:
        tenant.name = update_data.name
    if update_data.email is not None:
        tenant.email = update_data.email
    if update_data.storage_limit_mb is not None:
        tenant.storage_limit_mb = update_data.storage_limit_mb
    if update_data.is_active is not None:
        tenant.is_active = update_data.is_active
    if update_data.expires_in_days is not None:
        if update_data.expires_in_days > 0:
            tenant.expires_at = datetime.now(timezone.utc) + timedelta(days=update_data.expires_in_days)
        else:
            tenant.expires_at = None
    
    db.commit()
    db.refresh(tenant)
    
    return TenantResponse(
        id=tenant.id,
        subdomain=tenant.subdomain,
        name=tenant.name,
        email=tenant.email,
        storage_limit_mb=tenant.storage_limit_mb,
        storage_used_bytes=tenant.storage_used_bytes,
        created_at=tenant.created_at,
        expires_at=tenant.expires_at,
        is_active=tenant.is_active
    )

@router.patch("/tenants/{tenant_id}/storage-limit", response_model=TenantResponse)
async def update_tenant_storage_limit(
    tenant_id: int,
    update_data: TenantStorageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update tenant storage limit and expiry date"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.storage_limit_mb = update_data.storage_limit_mb
    
    # Handle expiry date - can be None, datetime, or ISO string
    if update_data.expires_at is not None:
        if isinstance(update_data.expires_at, str):
            # Parse ISO string to timezone-aware datetime
            try:
                tenant.expires_at = datetime.fromisoformat(update_data.expires_at.replace('Z', '+00:00'))
            except ValueError:
                # Try parsing without timezone
                tenant.expires_at = datetime.fromisoformat(update_data.expires_at).replace(tzinfo=timezone.utc)
        else:
            tenant.expires_at = update_data.expires_at
    else:
        # Explicitly set to None if provided as None/empty
        tenant.expires_at = None
    
    db.commit()
    db.refresh(tenant)
    
    return TenantResponse(
        id=tenant.id,
        subdomain=tenant.subdomain,
        name=tenant.name,
        email=tenant.email,
        storage_limit_mb=tenant.storage_limit_mb,
        storage_used_bytes=tenant.storage_used_bytes,
        created_at=tenant.created_at,
        expires_at=tenant.expires_at,
        is_active=tenant.is_active
    )

@router.delete("/tenants/{tenant_id}")
async def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a tenant and cleanup resources"""
    tenant_service = TenantService(db)
    success = tenant_service.delete_tenant(tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    return {"message": "Tenant deleted successfully"}

@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get overall system statistics"""
    tenant_service = TenantService(db)
    
    total_tenants = db.query(Tenant).count()
    active_tenants = db.query(Tenant).filter(Tenant.is_active == True).count()
    total_photos = db.query(Photo).count()
    total_users = db.query(User).count()
    registered_clients = db.query(User).filter(User.is_admin == False).count()
    
    total_storage_bytes = db.query(func.sum(Tenant.storage_used_bytes)).scalar() or 0
    total_storage_mb = round(total_storage_bytes / (1024 * 1024), 2)
    
    # Get actual B2 bucket storage size
    b2_bucket_storage_mb = 0
    b2_bucket_objects = 0
    try:
        from app.models import B2Credential
        default_cred = db.query(B2Credential).filter(
            B2Credential.tenant_id == None,
            B2Credential.is_active == True
        ).first()
        
        if default_cred:
            b2_service = B2Service(
                key_id=default_cred.key_id.strip() if default_cred.key_id else None,
                key=default_cred.key.strip() if default_cred.key else None,
                bucket=default_cred.bucket_name.strip() if default_cred.bucket_name else None,
                endpoint=default_cred.endpoint.strip() if default_cred.endpoint else settings.B2_ENDPOINT
            )
            try:
                bucket_stats = b2_service.get_bucket_storage_size()
                b2_bucket_storage_mb = bucket_stats.get("total_size_mb", 0)
                b2_bucket_objects = bucket_stats.get("total_objects", 0)
                logger.info(f"B2 bucket storage calculated: {b2_bucket_storage_mb} MB, {b2_bucket_objects} objects")
            except Exception as calc_error:
                logger.warning(f"Could not calculate bucket storage size: {calc_error}. Using 0.")
                b2_bucket_storage_mb = 0
                b2_bucket_objects = 0
        else:
            logger.warning("No active default B2 credential found for storage calculation")
    except Exception as e:
        logger.error(f"Error calculating B2 bucket storage: {e}", exc_info=True)
    
    # Get stats for all tenants
    tenants = tenant_service.list_tenants(limit=1000)
    tenant_stats = [tenant_service.get_tenant_stats(t.id) for t in tenants]
    
    return SystemStatsResponse(
        total_tenants=total_tenants,
        active_tenants=active_tenants,
        total_storage_used_mb=total_storage_mb,
        b2_bucket_storage_mb=b2_bucket_storage_mb,  # Actual B2 bucket storage
        b2_bucket_objects=b2_bucket_objects,  # Total objects in B2 bucket
        total_photos=total_photos,
        total_users=total_users,
        registered_clients=registered_clients,
        tenants=[TenantStatsResponse(**stats) for stats in tenant_stats]
    )

@router.get("/health")
async def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get system health status for all services"""
    from sqlalchemy import text
    from app.services.b2_service import B2Service
    from app.models import B2Credential
    from datetime import datetime
    
    health_status = {
        "database": {"status": "unknown", "message": "", "timestamp": datetime.now(timezone.utc).isoformat()},
        "b2_storage": {"status": "unknown", "message": "", "timestamp": datetime.now(timezone.utc).isoformat()},
        "api": {"status": "healthy", "message": "API is responding", "timestamp": datetime.now(timezone.utc).isoformat()}
    }
    
    # Check database
    try:
        db.execute(text("SELECT 1"))
        health_status["database"] = {
            "status": "healthy",
            "message": "Database connection successful",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        health_status["database"] = {
            "status": "unhealthy",
            "message": f"Database error: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    # Check B2 storage (test first active credential)
    try:
        b2_cred = db.query(B2Credential).filter(B2Credential.is_active == True).first()
        if b2_cred:
            b2_service = B2Service(
                key_id=b2_cred.key_id.strip() if b2_cred.key_id else None,
                key=b2_cred.key.strip() if b2_cred.key else None,
                bucket=b2_cred.bucket_name.strip() if b2_cred.bucket_name else None,
                endpoint=b2_cred.endpoint.strip() if b2_cred.endpoint else settings.B2_ENDPOINT
            )
            test_result = b2_service.test_connection()
            if test_result["status"] == "connected":
                health_status["b2_storage"] = {
                    "status": "healthy",
                    "message": test_result.get("message", f"B2 connection successful. Bucket: {b2_cred.bucket_name}"),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "details": {
                        "bucket": test_result.get("bucket", b2_cred.bucket_name),
                        "object_count": test_result.get("object_count", 0),
                        "response_time_ms": test_result.get("response_time_ms", 0)
                    }
                }
            elif test_result["status"] == "partial":
                health_status["b2_storage"] = {
                    "status": "warning",
                    "message": test_result.get("message", "B2 connection partial"),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "details": {
                        "bucket": test_result.get("bucket", b2_cred.bucket_name),
                        "response_time_ms": test_result.get("response_time_ms", 0)
                    }
                }
            else:
                health_status["b2_storage"] = {
                    "status": "unhealthy",
                    "message": test_result.get("message", "B2 connection failed"),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
        else:
            health_status["b2_storage"] = {
                "status": "warning",
                "message": "No active B2 credentials configured",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    except Exception as e:
        health_status["b2_storage"] = {
            "status": "unhealthy",
            "message": f"B2 check error: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    return health_status

@router.get("/b2-credentials")
async def list_b2_credentials(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all B2 credentials (for management)"""
    from app.models import B2Credential
    
    credentials = db.query(B2Credential).all()
    
    return [
        {
            "id": c.id,
            "tenant_id": c.tenant_id,
            "key_id": c.key_id,
            "bucket_name": c.bucket_name,
            "endpoint": c.endpoint,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in credentials
    ]

@router.post("/b2-credentials/test")
async def test_b2_connection(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Test B2 connection with default credentials from database"""
    from app.services.b2_service import B2Service
    from app.config import settings
    from app.models import B2Credential
    
    try:
        # Get the active default credential from database
        default_cred = db.query(B2Credential).filter(
            B2Credential.tenant_id == None,
            B2Credential.is_active == True
        ).first()
        
        if default_cred:
            # Use credentials from database (trim to prevent issues)
            # Ensure we have valid values
            key_id = default_cred.key_id.strip() if default_cred.key_id else None
            key = default_cred.key.strip() if default_cred.key else None
            bucket = default_cred.bucket_name.strip() if default_cred.bucket_name else None
            endpoint = default_cred.endpoint.strip() if default_cred.endpoint else settings.B2_ENDPOINT
            
            # Log for debugging (without exposing sensitive data)
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Testing B2 connection with key_id length: {len(key_id) if key_id else 0}, bucket: {bucket}")
            
            if not key_id or not key or not bucket:
                return {
                    "status": "error",
                    "message": f"Invalid credentials: key_id={'present' if key_id else 'missing'}, key={'present' if key else 'missing'}, bucket={'present' if bucket else 'missing'}",
                    "bucket": bucket or "N/A",
                    "endpoint": endpoint or "N/A",
                    "bucket_accessible": False,
                    "list_accessible": False,
                    "response_time_ms": None,
                    "object_count": None
                }
            
            b2_service = B2Service(
                key_id=key_id,
                key=key,  # Note: In production, decrypt this
                bucket=bucket,
                endpoint=endpoint
            )
        else:
            # Fallback to environment variables
            b2_service = B2Service()
        
        result = b2_service.test_connection()
        return result
    except ValueError as e:
        # Validation error - credentials are invalid
        return {
            "status": "error",
            "message": f"Invalid credentials: {str(e)}",
            "bucket": default_cred.bucket_name if default_cred else settings.B2_BUCKET_NAME,
            "endpoint": default_cred.endpoint if default_cred and default_cred.endpoint else settings.B2_ENDPOINT,
            "bucket_accessible": False,
            "list_accessible": False,
            "response_time_ms": None,
            "object_count": None
        }
    except Exception as e:
        error_msg = str(e)
        # Check if it's a boto3 error about malformed key
        if "InvalidAccessKeyId" in error_msg or "Malformed" in error_msg:
            error_msg = f"Invalid Access Key ID format. Please verify your Application Key ID is correct (should be 12 characters, alphanumeric). Error: {error_msg}"
        return {
            "status": "error",
            "message": f"Connection test failed: {error_msg}",
            "bucket": default_cred.bucket_name if default_cred else settings.B2_BUCKET_NAME,
            "endpoint": default_cred.endpoint if default_cred and default_cred.endpoint else settings.B2_ENDPOINT,
            "bucket_accessible": False,
            "list_accessible": False,
            "response_time_ms": None,
            "object_count": None
        }

@router.post("/b2-credentials/{credential_id}/test")
async def test_b2_credential_connection(
    credential_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Test B2 connection with specific credential"""
    from app.models import B2Credential
    from app.services.b2_service import B2Service
    
    credential = db.query(B2Credential).filter(B2Credential.id == credential_id).first()
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    try:
        from app.config import settings
        b2_service = B2Service(
            key_id=credential.key_id.strip() if credential.key_id else None,
            key=credential.key.strip() if credential.key else None,  # Note: In production, decrypt this
            bucket=credential.bucket_name.strip() if credential.bucket_name else None,
            endpoint=credential.endpoint.strip() if credential.endpoint else settings.B2_ENDPOINT
        )
        result = b2_service.test_connection()
        return result
    except Exception as e:
        return {
            "status": "error",
            "message": f"Connection test failed: {str(e)}",
            "bucket": credential.bucket_name,
            "endpoint": credential.endpoint or "N/A",
            "bucket_accessible": False,
            "list_accessible": False,
            "response_time_ms": None,
            "object_count": None
        }

@router.post("/b2-config/update")
async def update_b2_config(
    config_data: B2ConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update default B2 configuration"""
    from app.models import B2Credential
    from app.config import settings
    
    try:
        # Trim and validate input to prevent whitespace issues
        key_id = config_data.key_id.strip() if config_data.key_id else ""
        key = config_data.key.strip() if config_data.key else ""
        bucket_name = config_data.bucket_name.strip() if config_data.bucket_name else ""
        endpoint = config_data.endpoint.strip() if config_data.endpoint else None
        
        # Validate input
        if not key_id or not key or not bucket_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All fields (key_id, key, bucket_name) are required"
            )
        
        # Validate key_id format (B2 key IDs can be 12-25 characters, alphanumeric)
        if len(key_id) < 10 or len(key_id) > 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid key_id format. Expected 10-30 characters, got {len(key_id)}"
            )
        
        # Deactivate all existing default credentials first
        db.query(B2Credential).filter(
            B2Credential.tenant_id == None
        ).update({"is_active": False})
        
        # Find existing credential with same key_id (if updating) or create new
        default_cred = db.query(B2Credential).filter(
            B2Credential.tenant_id == None,
            B2Credential.key_id == key_id
        ).first()
        
        if default_cred:
            # Update existing
            default_cred.key_id = key_id
            default_cred.key = key
            default_cred.bucket_name = bucket_name
            # Always update endpoint (can be empty string to clear it)
            default_cred.endpoint = endpoint if endpoint else None
            default_cred.is_active = True
        else:
            # Create new
            default_cred = B2Credential(
                tenant_id=None,
                key_id=key_id,
                key=key,
                bucket_name=bucket_name,
                endpoint=endpoint,
                is_active=True
            )
            db.add(default_cred)
        
        db.commit()
        db.refresh(default_cred)
        
        return {
            "id": default_cred.id,
            "key_id": default_cred.key_id,
            "bucket_name": default_cred.bucket_name,
            "endpoint": default_cred.endpoint,
            "is_active": default_cred.is_active,
            "message": "B2 configuration updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update B2 configuration: {str(e)}"
        )

@router.get("/users")
async def list_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all users with registration details"""
    users = db.query(User).offset(skip).limit(limit).all()
    
    return [
        {
            "id": u.id,
            "email": u.email,
            "is_admin": u.is_admin,
            "is_tenant_admin": u.is_tenant_admin,
            "tenant_id": u.tenant_id,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "hashed_password": u.hashed_password[:20] + "..." if u.hashed_password else None  # Partial for security
        }
        for u in users
    ]

@router.get("/b2-config")
async def get_b2_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get current B2 configuration"""
    from app.models import B2Credential
    from app.config import settings
    
    # Try to get from database first (if configured via admin UI)
    default_cred = db.query(B2Credential).filter(
        B2Credential.tenant_id == None,
        B2Credential.is_active == True
    ).first()
    
    if default_cred:
        return {
            "key_id": default_cred.key_id,
            "bucket": default_cred.bucket_name,
            "endpoint": default_cred.endpoint or settings.B2_ENDPOINT or ""
        }
    
    # Fallback to environment variables
    return {
        "key_id": settings.B2_APPLICATION_KEY_ID or "",
        "bucket": settings.B2_BUCKET_NAME or "",
        "endpoint": settings.B2_ENDPOINT or ""
    }

@router.get("/api-logs")
async def get_api_logs(
    skip: int = 0,
    limit: int = 100,
    method: Optional[str] = None,
    status_code: Optional[int] = None,
    user_id: Optional[int] = None,
    tenant_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get API logs for troubleshooting"""
    query = db.query(ApiLog)
    
    if method:
        query = query.filter(ApiLog.method == method.upper())
    if status_code:
        query = query.filter(ApiLog.status_code == status_code)
    if user_id:
        query = query.filter(ApiLog.user_id == user_id)
    if tenant_id:
        query = query.filter(ApiLog.tenant_id == tenant_id)
    
    total = query.count()
    logs = query.order_by(ApiLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "logs": [
            {
                "id": log.id,
                "method": log.method,
                "path": log.path,
                "status_code": log.status_code,
                "user_id": log.user_id,
                "tenant_id": log.tenant_id,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent[:100] if log.user_agent else None,
                "error_message": log.error_message,
                "duration_ms": log.duration_ms,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
    }

