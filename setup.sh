#!/bin/bash

# Setup script for Multi-Tenant Photo Portal
# This script helps set up the development environment

set -e

echo "🚀 Setting up Multi-Tenant Photo Portal..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Backend setup
echo "🔧 Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

if [ ! -f ".env" ]; then
    echo "Creating backend .env file..."
    cat > .env << EOF
DATABASE_URL=postgresql://user:password@postgres:5432/photoportal
SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
B2_APPLICATION_KEY_ID=
B2_APPLICATION_KEY=your-b2-key
B2_BUCKET_NAME=photo-portal
B2_ENDPOINT=https://s3.us-west-000.backblazeb2.com
CLOUDFLARE_API_TOKEN=your-token
CLOUDFLARE_ZONE_ID=your-zone-id
BASE_DOMAIN=localhost
DEFAULT_STORAGE_LIMIT_MB=500
DEFAULT_TENANT_EXPIRY_DAYS=90
EOF
    echo "✅ Created backend/.env - Please update with your credentials"
else
    echo "⚠️  backend/.env already exists, skipping..."
fi

cd ..

# Frontend setup
echo "🔧 Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
else
    echo "⚠️  node_modules already exists, skipping..."
fi

if [ ! -f ".env.local" ]; then
    echo "Creating frontend .env.local file..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
    echo "✅ Created frontend/.env.local"
else
    echo "⚠️  frontend/.env.local already exists, skipping..."
fi

cd ..

# Docker setup
echo "🐳 Setting up Docker..."
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found"
    exit 1
fi

echo "✅ Docker configuration found"

# Create hosts file entries helper
echo ""
echo "📝 To test subdomains locally, add these to /etc/hosts:"
echo "   127.0.0.1 admin.localhost"
echo "   127.0.0.1 testclient.localhost"
echo ""

echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your B2 and Cloudflare credentials"
echo "2. Run: docker-compose up -d"
echo "3. Initialize database (see QUICKSTART.md)"
echo "4. Create admin user (see QUICKSTART.md)"
echo "5. Access http://localhost:3000"
echo ""
echo "For detailed instructions, see QUICKSTART.md"

