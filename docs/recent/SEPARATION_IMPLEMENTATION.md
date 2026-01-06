# Frontend Separation Implementation Plan

## Current Structure
- Single Next.js app with `/admin` and `/client` routes
- Shared `lib/` folder with API client and store
- Single Docker build

## Proposed Separation

### Structure
```
frontend-shared/          # Shared code (symlinked or copied)
  lib/
    api.ts
    store.ts

frontend-admin/           # Admin console (port 3000)
  app/
    admin/               # Admin routes only
  lib/ -> ../frontend-shared/lib
  package.json
  Dockerfile
  next.config.js

frontend-client/         # Client portal (port 3001)
  app/
    client/              # Client routes only
  lib/ -> ../frontend-shared/lib
  package.json
  Dockerfile
  next.config.js
```

### Benefits
1. **Security**: Complete isolation between admin and client
2. **Scaling**: Scale independently (admin: 1 instance, client: N instances)
3. **Deployment**: Deploy independently without affecting each other
4. **Bundle Size**: Smaller bundles, faster load times
5. **CDN**: Different caching strategies per frontend

### Docker Compose Changes
```yaml
frontend-admin:
  build: ./frontend-admin
  ports:
    - "3000:3000"
  environment:
    NEXT_PUBLIC_API_URL: http://backend:8000

frontend-client:
  build: ./frontend-client
  ports:
    - "3001:3001"
  environment:
    NEXT_PUBLIC_API_URL: http://backend:8000
```

### Migration Steps
1. Create `frontend-shared/lib` with shared code
2. Create `frontend-admin` with admin routes only
3. Create `frontend-client` with client routes only
4. Update docker-compose.yml
5. Test both frontends independently

### Alternative: Keep Single Frontend
If separation is too complex, we can:
- Use environment variables to build admin-only or client-only
- Use Next.js rewrites for routing
- Keep single Docker build but optimize bundle splitting

