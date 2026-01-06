from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, BigInteger, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime, timedelta

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(Integer, primary_key=True, index=True)
    subdomain = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False)
    
    # B2 credentials (encrypted in production)
    b2_key_id = Column(String(200))
    b2_key = Column(Text)  # Encrypted
    b2_bucket = Column(String(200))
    
    # Limits
    storage_limit_mb = Column(Integer, default=500)
    storage_used_bytes = Column(BigInteger, default=0)
    
    # Expiration
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    
    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="tenant", cascade="all, delete-orphan")
    usage_logs = relationship("UsageLog", back_populates="tenant")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)  # Nullable for admin users
    email = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_tenant_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    tenant = relationship("Tenant", back_populates="users")

class Photo(Base):
    __tablename__ = "photos"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    b2_key = Column(String(1000), nullable=False)  # Full B2 key path
    file_size_bytes = Column(BigInteger, nullable=False)
    content_type = Column(String(100))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    tenant = relationship("Tenant", back_populates="photos")

class UsageLog(Base):
    __tablename__ = "usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    log_type = Column(String(50))  # 'upload', 'download', 'delete'
    bytes_transferred = Column(BigInteger, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    tenant = relationship("Tenant", back_populates="usage_logs")

class B2Credential(Base):
    __tablename__ = "b2_credentials"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)  # Null for admin/default
    key_id = Column(String(200), nullable=False)
    key = Column(Text, nullable=False)  # Encrypted
    bucket_name = Column(String(200))
    endpoint = Column(String(500), nullable=True)  # B2 endpoint URL
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ApiLog(Base):
    __tablename__ = "api_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    method = Column(String(10), nullable=False, index=True)  # GET, POST, PUT, DELETE, etc.
    path = Column(String(500), nullable=False, index=True)
    status_code = Column(Integer, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    request_body = Column(Text)  # JSON string of request body (sanitized)
    response_body = Column(Text)  # JSON string of response body (truncated if large)
    error_message = Column(Text)  # Error details if request failed
    duration_ms = Column(Integer)  # Request duration in milliseconds
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    user = relationship("User")
    tenant = relationship("Tenant")

