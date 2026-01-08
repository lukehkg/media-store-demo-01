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
import time
from sqlalchemy.exc import OperationalError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Retry database connection with exponential backoff
def init_database(max_retries=10, retry_delay=5):
    """Initialize database tables with retry logic for ECS deployment"""
    from urllib.parse import urlparse
    import socket
    from app.config import settings
    
    # Extract hostname from DATABASE_URL
    db_url = settings.DATABASE_URL
    parsed = urlparse(db_url)
    db_host = parsed.hostname or 'localhost'
    db_port = parsed.port or (3306 if 'mysql' in db_url.lower() else 5432)
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempting to connect to database at {db_host}:{db_port} (attempt {attempt + 1}/{max_retries})...")
            
            # Check if database port is accessible (skip check in Docker Compose where hostname might not resolve)
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2)
                result = sock.connect_ex((db_host, db_port))
                sock.close()
                if result != 0 and db_host == 'localhost':
                    logger.warning(f"Port {db_port} on {db_host} is not accessible (result: {result})")
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (2 ** attempt)
                        logger.info(f"Waiting {wait_time} seconds before retry...")
                        time.sleep(wait_time)
                        continue
            except Exception as e:
                logger.debug(f"Socket check skipped: {e}")
            
            # Try database connection
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Database tables created successfully!")
            return True
        except OperationalError as e:
            if attempt < max_retries - 1:
                wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                logger.warning(f"Database not ready yet, retrying in {wait_time} seconds... Error: {e}")
                time.sleep(wait_time)
            else:
                logger.error(f"❌ Failed to connect to database after {max_retries} attempts: {e}")
                logger.error(f"Please check: 1) MySQL container is running, 2) Port 3306 is accessible, 3) Database credentials are correct")
                raise
        except Exception as e:
            logger.error(f"❌ Unexpected error initializing database: {e}")
            raise
    return False

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
    """Health check endpoint - also checks database connection"""
    try:
        # Test database connection
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

# Startup event - initialize database
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup with retry logic"""
    logger.info("Starting application...")
    try:
        init_database()
        # Initialize demo data if tables are empty
        try:
            from scripts.init_demo_data import init_demo_data
            init_demo_data()
        except Exception as e:
            logger.warning(f"Demo data initialization skipped: {e}")
    except Exception as e:
        logger.error(f"Failed to initialize database on startup: {e}")
        # Don't crash the app, let it continue and retry on first request
        pass

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

