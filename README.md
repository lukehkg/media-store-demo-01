# Multi-Tenant Photo Portal - Cloud Storage Reselling Platform

A white-label cloud storage portal for reselling Backblaze B2 object storage to clients.

## ✅ Status: Login Working!

Backend has been rebuilt and login is now functional.

## 🏗️ Architecture

```
frontend/          - Next.js frontend (React/TypeScript)
backend/           - FastAPI backend (Python)
database/          - PostgreSQL database
```

## 🚀 Quick Start

### Start All Services
```bash
docker-compose up -d
```

### Access Services
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Postgres**: localhost:5432

### Admin Login
- URL: http://localhost:3000/admin/login
- Email: `admin@example.com`
- Password: `admin123`

## 📋 Admin Console Pages

### 1. Dashboard (`/admin`)
- System overview
- Health monitoring
- Statistics

### 2. Clients (`/admin/clients`)
- Register new clients
- View client details
- Manage client subscriptions

### 3. Storage (`/admin/storage`)
- Assign storage quotas
- Manage storage limits
- View storage usage

### 4. B2 Config (`/admin/b2-config`)
- Configure Backblaze B2 credentials
- Test connection
- View connection status
- Update configuration

### 5. API Logs (`/admin/logs`)
- View all API calls
- Filter by time (day/week/month/all)
- Filter by method, status, user, tenant
- Troubleshoot issues

### 6. Profile (`/admin/profile`)
- Update admin profile
- Change password

## 🔧 Configuration

### Backblaze B2 Setup
1. Go to `/admin/b2-config`
2. Enter your B2 credentials:
   - Application Key ID
   - Application Key
   - Bucket Name
   - Endpoint URL
3. Click "Test Connection"
4. Click "Save Configuration"

### Register Clients
1. Go to `/admin/clients`
2. Click "Register New Client"
3. Fill in:
   - Subdomain
   - Client Name
   - Email
   - Storage Limit (MB)
   - Expires In (Days)
4. Click "Register Client"

## 📁 Project Structure

```
.
├── frontend/          # Next.js frontend
│   ├── app/
│   │   ├── admin/     # Admin console pages
│   │   └── client/    # Client portal pages
│   └── lib/           # API client, state management
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── routers/   # API routes
│   │   ├── services/  # Business logic
│   │   └── models.py  # Database models
│   └── scripts/       # Utility scripts
├── docs/              # Documentation
└── docker-compose.yml # Docker configuration
```

## 🛠️ Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📝 Features

- ✅ Multi-tenant architecture
- ✅ Backblaze B2 integration
- ✅ Client registration and management
- ✅ Storage quota assignment
- ✅ API logging and monitoring
- ✅ Admin dashboard
- ✅ Client portal

## 🔐 Security

- Passwords are hashed with bcrypt
- JWT authentication
- CORS configured for development
- Tenant isolation

## 📚 Documentation

See `docs/` folder for detailed documentation:
- Architecture overview
- API documentation
- Setup guides
- Troubleshooting

## 🐛 Troubleshooting

### Login Issues
- Check backend logs: `docker-compose logs backend`
- Verify admin user exists: Check database
- Check CORS configuration

### B2 Connection Issues
- Verify credentials in `/admin/b2-config`
- Test connection using "Test Connection" button
- Check B2 bucket permissions

## 📄 License

Private project - All rights reserved
