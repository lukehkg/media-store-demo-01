#!/usr/bin/env python3
"""
Complete setup script - initializes database and creates admin user
Usage: python scripts/setup_complete.py [admin_email] [admin_password]
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base, SessionLocal
from app.models import *
from app.routers.auth import get_password_hash

def setup_database():
    """Initialize database tables"""
    try:
        print("📦 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
        return True
    except Exception as e:
        print(f"❌ Error creating database tables: {e}")
        return False

def create_admin_user(email: str, password: str):
    """Create admin user"""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            # Update existing user to be admin
            existing_user.is_admin = True
            existing_user.hashed_password = get_password_hash(password)
            db.commit()
            print(f"✅ Updated existing user '{email}' to admin")
            return True
        
        # Create new admin user
        hashed_password = get_password_hash(password)
        admin_user = User(
            email=email,
            hashed_password=hashed_password,
            tenant_id=None,  # Admin users don't need a tenant
            is_admin=True,
            is_tenant_admin=False
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"✅ Created admin user: {email}")
        print(f"   User ID: {admin_user.id}")
        print(f"   Is Admin: {admin_user.is_admin}")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin user: {e}")
        return False
    finally:
        db.close()

def check_database_connection():
    """Check if database is accessible"""
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting complete setup...")
    print("=" * 50)
    
    # Check database connection
    if not check_database_connection():
        print("\n❌ Setup failed: Cannot connect to database")
        print("   Make sure PostgreSQL is running and DATABASE_URL is correct")
        sys.exit(1)
    
    # Initialize database
    if not setup_database():
        print("\n❌ Setup failed: Could not create database tables")
        sys.exit(1)
    
    # Create admin user
    admin_email = sys.argv[1] if len(sys.argv) > 1 else "admin@example.com"
    admin_password = sys.argv[2] if len(sys.argv) > 2 else "admin123"
    
    if not create_admin_user(admin_email, admin_password):
        print("\n❌ Setup failed: Could not create admin user")
        sys.exit(1)
    
    print("=" * 50)
    print("✨ Setup complete!")
    print(f"\n📧 Admin credentials:")
    print(f"   Email: {admin_email}")
    print(f"   Password: {admin_password}")
    print(f"\n🌐 Access the admin portal at: http://admin.localhost:3000")
    print(f"   (or your admin subdomain)")

