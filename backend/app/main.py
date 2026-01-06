"""
Clean, simple FastAPI backend - rebuilt from scratch
Focus: Get login working first, then add features
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine, Base
from app.routers import auth, admin, tenant
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Multi-Tenant Photo Portal API",
    description="White-label photo portal with Backblaze B2 integration",
    version="2.0.0"
)

# CORS Configuration - SIMPLE and PERMISSIVE for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when using "*"
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
)

# Include routers - AUTH FIRST (most important)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(tenant.router, prefix="/api/tenant", tags=["Tenant"])

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Multi-Tenant Photo Portal API", "version": "2.0.0", "status": "running"}

@app.get("/api/version")
async def get_version():
    """Get API version information"""
    return {
        "api_version": "2.0.0",
        "frontend_version": "1.0.0",
        "platform": "Object Storage Reselling Platform",
        "s3_compatible": True
    }

# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

