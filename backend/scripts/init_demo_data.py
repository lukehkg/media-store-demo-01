"""
Initialize demo data for MySQL database
This script runs after database connection is established and populates demo data if tables are empty
"""
import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal, engine
from app.models import Tenant, User, Photo, UsageLog, ApiLog
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_demo_data():
    """Initialize demo data if tables are empty"""
    db = SessionLocal()
    try:
        # Check if tenants table has data
        tenant_count = db.query(Tenant).count()
        
        if tenant_count > 0:
            logger.info(f"Demo data already exists ({tenant_count} tenants found). Skipping initialization.")
            return
        
        logger.info("Initializing demo data...")
        
        # Use programmatic method for more reliable data insertion
        logger.info("Creating demo data programmatically...")
        create_demo_data_programmatically(db)
            
    except Exception as e:
        logger.error(f"Error initializing demo data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def create_demo_data_programmatically(db):
    """Create demo data programmatically if SQL file is not available"""
    from datetime import datetime, timedelta
    from passlib.context import CryptContext
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    demo_password_hash = pwd_context.hash("demo123")
    
    # Create demo tenants
    tenants = [
        Tenant(
            id=1,
            subdomain='demo',
            name='Demo Tenant',
            email='demo@example.com',
            storage_limit_mb=1000,
            storage_used_bytes=0,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=90),
            is_active=True
        ),
        Tenant(
            id=2,
            subdomain='acme',
            name='Acme Corporation',
            email='admin@acme.com',
            storage_limit_mb=2000,
            storage_used_bytes=52428800,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=180),
            is_active=True
        ),
        Tenant(
            id=3,
            subdomain='testco',
            name='Test Company',
            email='contact@testco.com',
            storage_limit_mb=500,
            storage_used_bytes=10485760,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30),
            is_active=True
        )
    ]
    
    # Create admin user
    admin_user = User(
        id=1,
        tenant_id=None,
        email='admin@example.com',
        hashed_password=demo_password_hash,
        is_admin=True,
        is_tenant_admin=False,
        created_at=datetime.utcnow()
    )
    
    # Create tenant users
    users = [
        User(
            id=2,
            tenant_id=1,
            email='admin@demo.example.com',
            hashed_password=demo_password_hash,
            is_admin=False,
            is_tenant_admin=True,
            created_at=datetime.utcnow()
        ),
        User(
            id=3,
            tenant_id=1,
            email='user1@demo.example.com',
            hashed_password=demo_password_hash,
            is_admin=False,
            is_tenant_admin=False,
            created_at=datetime.utcnow()
        ),
        User(
            id=4,
            tenant_id=2,
            email='admin@acme.com',
            hashed_password=demo_password_hash,
            is_admin=False,
            is_tenant_admin=True,
            created_at=datetime.utcnow()
        ),
        User(
            id=5,
            tenant_id=2,
            email='john@acme.com',
            hashed_password=demo_password_hash,
            is_admin=False,
            is_tenant_admin=False,
            created_at=datetime.utcnow()
        ),
        User(
            id=6,
            tenant_id=3,
            email='admin@testco.com',
            hashed_password=demo_password_hash,
            is_admin=False,
            is_tenant_admin=True,
            created_at=datetime.utcnow()
        )
    ]
    
    # Add all to database
    db.add_all(tenants)
    db.add(admin_user)
    db.add_all(users)
    db.commit()
    
    logger.info("✅ Demo data created programmatically!")

if __name__ == "__main__":
    init_demo_data()
