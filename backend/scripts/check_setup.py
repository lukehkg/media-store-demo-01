#!/usr/bin/env python3
"""
Diagnostic script to check system setup
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models import User
from sqlalchemy import text

def check_database():
    """Check database connection and tables"""
    print("🔍 Checking database...")
    try:
        from sqlalchemy import text
        db = SessionLocal()
        # Test connection
        db.execute(text("SELECT 1"))
        
        # Check if tables exist
        result = db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """))
        tables = [row[0] for row in result]
        
        required_tables = ['users', 'tenants', 'photos', 'usage_logs', 'b2_credentials']
        missing_tables = [t for t in required_tables if t not in tables]
        
        if missing_tables:
            print(f"  ⚠️  Missing tables: {', '.join(missing_tables)}")
            print("  💡 Run: python scripts/init_db.py")
        else:
            print(f"  ✅ All required tables exist: {', '.join(tables)}")
        
        db.close()
        return True
    except Exception as e:
        print(f"  ❌ Database error: {e}")
        return False

def check_admin_user():
    """Check if admin user exists"""
    print("\n🔍 Checking admin user...")
    try:
        db = SessionLocal()
        admin_users = db.query(User).filter(User.is_admin == True).all()
        
        if not admin_users:
            print("  ⚠️  No admin users found")
            print("  💡 Run: python scripts/create_admin.py admin@example.com admin123")
            return False
        else:
            print(f"  ✅ Found {len(admin_users)} admin user(s):")
            for user in admin_users:
                print(f"     - {user.email} (ID: {user.id})")
            return True
    except Exception as e:
        print(f"  ❌ Error checking admin users: {e}")
        return False
    finally:
        db.close()

def check_all_users():
    """List all users"""
    print("\n🔍 Checking all users...")
    try:
        db = SessionLocal()
        users = db.query(User).all()
        
        if not users:
            print("  ⚠️  No users found in database")
        else:
            print(f"  ✅ Found {len(users)} user(s):")
            for user in users:
                admin_status = "👑 ADMIN" if user.is_admin else "👤 User"
                print(f"     - {user.email} ({admin_status}, Tenant ID: {user.tenant_id})")
    except Exception as e:
        print(f"  ❌ Error checking users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 50)
    print("🔧 System Diagnostic Check")
    print("=" * 50)
    
    db_ok = check_database()
    admin_ok = check_admin_user()
    check_all_users()
    
    print("\n" + "=" * 50)
    if db_ok and admin_ok:
        print("✅ System is properly configured!")
    else:
        print("⚠️  Some issues found. See recommendations above.")
    print("=" * 50)

