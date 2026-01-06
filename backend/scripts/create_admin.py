#!/usr/bin/env python3
"""
Script to create an admin user in the database.
Usage: python scripts/create_admin.py <email> <password>
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User
from app.routers.auth import get_password_hash

def create_admin_user(email: str, password: str):
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
            return
        
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
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin user: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/create_admin.py <email> <password>")
        print("Example: python scripts/create_admin.py admin@example.com admin123")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    create_admin_user(email, password)

