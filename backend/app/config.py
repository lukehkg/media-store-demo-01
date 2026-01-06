from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/photoportal")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS - Allow all origins in development, restrict in production
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://localhost:3000",  # Support HTTPS for local development
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
        "http://admin.localhost:3000",
        "https://admin.localhost:3000",
        "http://*.localhost:3000",
        "https://*.localhost:3000",
        "https://*.yourdomain.com"
    ]
    
    # Backblaze B2 (Default/Admin credentials)
    B2_APPLICATION_KEY_ID: str = os.getenv("B2_APPLICATION_KEY_ID", "")
    B2_APPLICATION_KEY: str = os.getenv("B2_APPLICATION_KEY", "")
    B2_BUCKET_NAME: str = os.getenv("B2_BUCKET_NAME", "photo-portal")
    B2_ENDPOINT: str = os.getenv("B2_ENDPOINT", "https://s3.us-west-000.backblazeb2.com")
    
    # Cloudflare
    CLOUDFLARE_API_TOKEN: str = os.getenv("CLOUDFLARE_API_TOKEN", "")
    CLOUDFLARE_ZONE_ID: str = os.getenv("CLOUDFLARE_ZONE_ID", "")
    BASE_DOMAIN: str = os.getenv("BASE_DOMAIN", "yourdomain.com")
    
    # Tenant defaults
    DEFAULT_STORAGE_LIMIT_MB: int = 500
    DEFAULT_TENANT_EXPIRY_DAYS: int = 90
    
    # AWS ECS
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    
    class Config:
        env_file = ".env"

settings = Settings()

