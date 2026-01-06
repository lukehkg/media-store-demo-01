# Frontend Separation Setup Guide

## Structure Created

```
multi-search/
├── frontend-shared/          # Shared libraries
│   └── lib/
│       ├── api.ts           # API client
│       └── store.ts         # Zustand store
│
├── frontend-admin/           # Admin Console (port 3000)
│   ├── app/
│   │   ├── admin/          # Admin routes
│   │   ├── layout.tsx
│   │   ├── providers.tsx
│   │   └── globals.css
│   ├── lib/                # Symlinked/copied from frontend-shared
│   ├── package.json
│   ├── Dockerfile
│   └── ...config files
│
└── frontend-client/          # Client Portal (port 3001)
    ├── app/
    │   ├── client/         # Client routes
    │   ├── layout.tsx
    │   ├── providers.tsx
    │   └── globals.css
    ├── lib/                # Symlinked/copied from frontend-shared
    ├── package.json
    ├── Dockerfile
    └── ...config files
```

## Features

### ✅ Media Preview Plugin
- Added `react-viewer` to client console
- Full-screen image preview with zoom, rotate, scale
- Navigate between images
- Download functionality

### ✅ Separated Frontends
- **Admin Console**: Port 3000, admin routes only
- **Client Portal**: Port 3001, client routes + media preview
- Shared lib copied to each frontend

## Usage

### Option 1: Use Separated Frontends (Recommended for Production)

```bash
# Use the separated docker-compose file
docker-compose -f docker-compose.separated.yml up --build

# Access:
# - Admin Console: http://localhost:3000
# - Client Portal: http://localhost:3001
```

### Option 2: Keep Single Frontend (Current)

```bash
# Use the original docker-compose.yml
docker-compose up --build

# Access:
# - Single Frontend: http://localhost:3000
```

## Benefits of Separation

1. **Security**: Complete isolation between admin and client
2. **Scaling**: Scale independently (admin: 1 instance, client: N instances)
3. **Deployment**: Deploy independently
4. **Performance**: Smaller bundles, faster load times
5. **Resource Allocation**: Admin uses fewer resources

## Testing

1. **Test Media Preview**:
   - Login to client portal
   - Upload an image
   - Click on any image to open preview
   - Test zoom, rotate, navigation

2. **Test Separation**:
   - Build both frontends: `docker-compose -f docker-compose.separated.yml build`
   - Verify admin console works on port 3000
   - Verify client portal works on port 3001
   - Verify they don't interfere with each other

## Maintenance

### Updating Shared Code

When updating `frontend-shared/lib/`:
1. Copy to both frontends:
   ```bash
   Copy-Item frontend-shared\lib frontend-admin\lib -Recurse -Force
   Copy-Item frontend-shared\lib frontend-client\lib -Recurse -Force
   ```
2. Rebuild Docker images

### Adding New Dependencies

- **Admin-only**: Add to `frontend-admin/package.json`
- **Client-only**: Add to `frontend-client/package.json`
- **Shared**: Add to both `package.json` files

