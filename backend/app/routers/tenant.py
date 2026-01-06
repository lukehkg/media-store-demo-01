from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.models import Tenant, Photo, UsageLog
from app.routers.auth import get_current_user
from app.services.b2_service import B2Service
from app.services.tenant_service import TenantService
from datetime import datetime

router = APIRouter()

class PhotoUploadRequest(BaseModel):
    filename: str
    content_type: str
    file_size_bytes: int

class PhotoUploadResponse(BaseModel):
    upload_url: str
    photo_id: int
    b2_key: str

class PhotoResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size_bytes: int
    content_type: Optional[str]
    uploaded_at: datetime
    download_url: str

class StorageInfoResponse(BaseModel):
    storage_limit_mb: int
    storage_used_mb: float
    storage_used_bytes: int
    storage_percentage: float
    photo_count: int

class TenantInfoResponse(BaseModel):
    id: int
    subdomain: str
    name: str
    expires_at: Optional[datetime]
    days_remaining: Optional[int]

def get_tenant_from_request(request: Request, db: Session = None, current_user = None) -> Tenant:
    """Get tenant from request state (set by middleware) or from user's tenant_id"""
    import logging
    logger = logging.getLogger(__name__)
    
    # First try to get from request state (set by middleware from subdomain)
    if hasattr(request.state, 'tenant') and request.state.tenant:
        logger.info(f"Tenant resolved from request state: {request.state.tenant.id}")
        return request.state.tenant
    
    # If no tenant in request state, try to get from current_user's tenant_id
    # This allows clients to access via regular domain instead of subdomain
    if current_user:
        logger.info(f"Resolving tenant from user tenant_id: {current_user.tenant_id}, user_id: {current_user.id}")
        if current_user.tenant_id:
            if db is None:
                from app.database import SessionLocal
                db = SessionLocal()
            
            tenant = db.query(Tenant).filter(
                Tenant.id == current_user.tenant_id,
                Tenant.is_active == True
            ).first()
            
            if tenant:
                # Check expiration - use timezone-aware datetime
                from datetime import datetime, timezone
                if tenant.expires_at and tenant.expires_at < datetime.now(timezone.utc):
                    logger.warning(f"Tenant {tenant.id} expired at {tenant.expires_at}")
                    raise HTTPException(status_code=403, detail="Tenant subscription expired")
                logger.info(f"Tenant resolved from user tenant_id: {tenant.id}, subdomain: {tenant.subdomain}")
                return tenant
            else:
                logger.error(f"Tenant {current_user.tenant_id} not found or inactive for user {current_user.id}")
        else:
            logger.error(f"User {current_user.id} has no tenant_id")
    else:
        logger.error("No current_user provided to get_tenant_from_request")
    
    raise HTTPException(status_code=403, detail="Tenant not found or inactive")

def get_b2_service_for_tenant(tenant: Tenant, db: Session) -> B2Service:
    """Get B2Service for a tenant, using tenant's credentials or default"""
    from app.models import B2Credential
    from app.config import settings
    
    if tenant.b2_key_id and tenant.b2_key and tenant.b2_bucket:
        # Tenant has its own B2 credentials
        return B2Service(
            key_id=tenant.b2_key_id.strip() if tenant.b2_key_id else None,
            key=tenant.b2_key.strip() if tenant.b2_key else None,
            bucket=tenant.b2_bucket.strip() if tenant.b2_bucket else None
        )
    else:
        # Use default B2 credentials from database
        default_cred = db.query(B2Credential).filter(
            B2Credential.tenant_id == None,
            B2Credential.is_active == True
        ).first()
        
        if default_cred:
            return B2Service(
                key_id=default_cred.key_id.strip() if default_cred.key_id else None,
                key=default_cred.key.strip() if default_cred.key else None,
                bucket=default_cred.bucket_name.strip() if default_cred.bucket_name else None,
                endpoint=default_cred.endpoint.strip() if default_cred.endpoint else settings.B2_ENDPOINT
            )
        else:
            # Fallback to environment variables
            return B2Service()

@router.post("/photos/upload", response_model=PhotoUploadResponse)
async def request_photo_upload(
    upload_request: PhotoUploadRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Request upload URL for a photo"""
    tenant = get_tenant_from_request(request, db, current_user)
    tenant_service = TenantService(db)
    
    # Check storage limit
    if not tenant_service.check_storage_limit(tenant.id, upload_request.file_size_bytes):
        raise HTTPException(
            status_code=403,
            detail=f"Storage limit exceeded. Available: {tenant.storage_limit_mb * 1024 * 1024 - tenant.storage_used_bytes} bytes"
        )
    
    # Generate B2 key
    from datetime import timezone
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    b2_key = f"tenant_{tenant.id}/{timestamp}_{upload_request.filename}"
    
    # Generate presigned upload URL
    b2_service = get_b2_service_for_tenant(tenant, db)
    upload_url = b2_service.generate_presigned_upload_url(
        b2_key,
        upload_request.content_type,
        expires_in=3600
    )
    
    # Create photo record
    photo = Photo(
        tenant_id=tenant.id,
        filename=b2_key.split('/')[-1],
        original_filename=upload_request.filename,
        b2_key=b2_key,
        file_size_bytes=upload_request.file_size_bytes,
        content_type=upload_request.content_type
    )
    
    db.add(photo)
    db.flush()
    
    # Update tenant storage
    tenant_service.update_tenant_storage(tenant.id, upload_request.file_size_bytes)
    
    # Log usage
    usage_log = UsageLog(
        tenant_id=tenant.id,
        log_type="upload",
        bytes_transferred=upload_request.file_size_bytes
    )
    db.add(usage_log)
    
    db.commit()
    db.refresh(photo)
    
    return PhotoUploadResponse(
        upload_url=upload_url,
        photo_id=photo.id,
        b2_key=b2_key
    )

@router.post("/photos/{photo_id}/confirm")
async def confirm_photo_upload(
    photo_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Confirm photo upload completed (verify file exists in B2)"""
    tenant = get_tenant_from_request(request, db, current_user)
    
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.tenant_id == tenant.id
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Verify file exists in B2
    b2_service = get_b2_service_for_tenant(tenant, db)
    file_size = b2_service.get_file_size(photo.b2_key)
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Photo not found in storage")
    
    # Update file size if different
    if file_size != photo.file_size_bytes:
        diff = file_size - photo.file_size_bytes
        tenant_service = TenantService(db)
        tenant_service.update_tenant_storage(tenant.id, diff)
        photo.file_size_bytes = file_size
        db.commit()
    
    return {"message": "Photo upload confirmed", "photo_id": photo_id}

@router.get("/photos", response_model=List[PhotoResponse])
async def list_photos(
    skip: int = 0,
    limit: int = 100,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all photos for the tenant"""
    tenant = get_tenant_from_request(request, db, current_user)
    
    photos = db.query(Photo).filter(
        Photo.tenant_id == tenant.id
    ).offset(skip).limit(limit).order_by(Photo.uploaded_at.desc()).all()
    
    b2_service = get_b2_service_for_tenant(tenant, db)
    
    result = []
    for photo in photos:
        download_url = b2_service.generate_presigned_download_url(photo.b2_key, expires_in=3600)
        result.append(PhotoResponse(
            id=photo.id,
            filename=photo.filename,
            original_filename=photo.original_filename,
            file_size_bytes=photo.file_size_bytes,
            content_type=photo.content_type,
            uploaded_at=photo.uploaded_at,
            download_url=download_url
        ))
    
    return result

@router.get("/photos/{photo_id}", response_model=PhotoResponse)
async def get_photo(
    photo_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific photo"""
    tenant = get_tenant_from_request(request, db, current_user)
    
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.tenant_id == tenant.id
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    b2_service = get_b2_service_for_tenant(tenant, db)
    download_url = b2_service.generate_presigned_download_url(photo.b2_key, expires_in=3600)
    
    return PhotoResponse(
        id=photo.id,
        filename=photo.filename,
        original_filename=photo.original_filename,
        file_size_bytes=photo.file_size_bytes,
        content_type=photo.content_type,
        uploaded_at=photo.uploaded_at,
        download_url=download_url
    )

@router.delete("/photos/{photo_id}")
async def delete_photo(
    photo_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a photo"""
    tenant = get_tenant_from_request(request, db, current_user)
    
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.tenant_id == tenant.id
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Delete from B2
    b2_service = get_b2_service_for_tenant(tenant, db)
    b2_service.delete_file(photo.b2_key)
    
    # Update tenant storage
    tenant_service = TenantService(db)
    tenant_service.update_tenant_storage(tenant.id, -photo.file_size_bytes)
    
    # Log usage
    usage_log = UsageLog(
        tenant_id=tenant.id,
        log_type="delete",
        bytes_transferred=-photo.file_size_bytes
    )
    db.add(usage_log)
    
    # Delete photo record
    db.delete(photo)
    db.commit()
    
    return {"message": "Photo deleted successfully"}

@router.get("/storage", response_model=StorageInfoResponse)
async def get_storage_info(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get storage usage information"""
    tenant = get_tenant_from_request(request, db, current_user)
    
    photo_count = db.query(Photo).filter(Photo.tenant_id == tenant.id).count()
    storage_used_mb = round(tenant.storage_used_bytes / (1024 * 1024), 2)
    storage_limit_bytes = tenant.storage_limit_mb * 1024 * 1024 if tenant.storage_limit_mb else (500 * 1024 * 1024)  # Default 500MB
    storage_percentage = round((tenant.storage_used_bytes / storage_limit_bytes) * 100, 2) if storage_limit_bytes > 0 else 0
    
    return StorageInfoResponse(
        storage_limit_mb=tenant.storage_limit_mb or 500,  # Default 500MB
        storage_used_mb=storage_used_mb,
        storage_used_bytes=tenant.storage_used_bytes,
        storage_percentage=storage_percentage,
        photo_count=photo_count
    )

@router.get("/info", response_model=TenantInfoResponse)
async def get_tenant_info(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get tenant information"""
    tenant = get_tenant_from_request(request, db, current_user)
    
    days_remaining = None
    if tenant.expires_at:
        from datetime import timezone
        delta = tenant.expires_at - datetime.now(timezone.utc)
        days_remaining = max(0, delta.days)
    
    return TenantInfoResponse(
        id=tenant.id,
        subdomain=tenant.subdomain,
        name=tenant.name,
        email=tenant.email,
        expires_at=tenant.expires_at,
        days_remaining=days_remaining
    )

@router.get("/usage-logs")
async def get_usage_logs(
    skip: int = 0,
    limit: int = 50,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get usage logs for the tenant"""
    tenant = get_tenant_from_request(request, db, current_user)
    
    logs = db.query(UsageLog).filter(
        UsageLog.tenant_id == tenant.id
    ).order_by(UsageLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "log_type": log.log_type,
            "bytes_transferred": log.bytes_transferred,
            "created_at": log.created_at.isoformat() if log.created_at else None
        }
        for log in logs
    ]

