from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.middleware.tenant_middleware import TenantMiddleware
from app.middleware.api_logging_middleware import ApiLoggingMiddleware
from app.routers import admin, tenant, auth
from app.database import engine, Base
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Multi-Tenant Photo Portal API",
    description="White-label photo portal with Backblaze B2 integration",
    version="1.0.0"
)

# CORS configuration
# For development, be permissive; restrict in production
import os
cors_origins = settings.CORS_ORIGINS
# In development, add common localhost variants (both HTTP and HTTPS)
if os.getenv("ENVIRONMENT", "development") == "development":
    cors_origins = list(set(cors_origins + [
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
        "http://admin.localhost:3000",
        "https://admin.localhost:3000",
        "http://*.localhost:3000",
        "https://*.localhost:3000"
    ]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add API logging middleware (logs all requests)
app.add_middleware(ApiLoggingMiddleware)

# Add tenant middleware (must be before routers)
app.add_middleware(TenantMiddleware)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(tenant.router, prefix="/api/tenant", tags=["Tenant"])

@app.get("/")
async def root():
    return {"message": "Multi-Tenant Photo Portal API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

