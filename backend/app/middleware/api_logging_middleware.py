import logging
import time
import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import ApiLog
from datetime import datetime

logger = logging.getLogger(__name__)

class ApiLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all API requests to database"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        db: Session = SessionLocal()
        
        # Extract request info
        method = request.method
        path = str(request.url.path)
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
        
        # Get user and tenant from request state (set by auth middleware)
        user_id = None
        tenant_id = None
        
        # Try to get user_id from JWT token in Authorization header
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from jose import jwt
                from app.config import settings
                token = auth_header.split(" ")[1]
                if token:  # Only try to decode if token exists
                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                    user_id_str = payload.get("sub")
                    if user_id_str:
                        try:
                            user_id = int(user_id_str)
                            tenant_id = payload.get("tenant_id")
                        except (ValueError, TypeError):
                            pass  # Invalid user_id format
            except Exception as e:
                # JWT decode failed (expired, invalid, etc.) - ignore silently
                # This is expected for unauthenticated requests
                pass
        
        # Get tenant from request state (set by tenant middleware)
        if hasattr(request.state, 'tenant_id'):
            tenant_id = request.state.tenant_id
        elif hasattr(request.state, 'tenant') and request.state.tenant:
            tenant_id = request.state.tenant.id
        
        # Read request body (for POST/PUT/PATCH)
        request_body = None
        if method in ["POST", "PUT", "PATCH"]:
            try:
                body_bytes = await request.body()
                if body_bytes:
                    # Try to parse as JSON
                    try:
                        body_json = json.loads(body_bytes.decode('utf-8'))
                        # Sanitize sensitive fields
                        sanitized_body = self._sanitize_request_body(body_json)
                        request_body = json.dumps(sanitized_body)
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        # Not JSON or binary, store as text (truncated)
                        body_str = body_bytes.decode('utf-8', errors='ignore')[:1000]
                        request_body = body_str if body_str else None
            except Exception as e:
                logger.warning(f"Error reading request body: {e}")
        
        # Execute request
        status_code = 500
        response_body = None
        error_message = None
        
        try:
            response = await call_next(request)
            status_code = response.status_code
            
            # Only log response body for errors (to avoid performance issues)
            if status_code >= 400:
                try:
                    # Store response body for logging (but don't consume it)
                    # We'll log it after the response is sent
                    pass  # Response body logging handled in finally block
                except Exception as e:
                    logger.warning(f"Error preparing response body logging: {e}")
        except Exception as e:
            status_code = 500
            error_message = str(e)[:1000]  # Truncate long error messages
            logger.error(f"Request failed: {e}", exc_info=True)
            raise
        finally:
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Log to database (async, don't block response)
            try:
                api_log = ApiLog(
                    method=method,
                    path=path,
                    status_code=status_code,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    ip_address=ip_address,
                    user_agent=user_agent[:500],  # Truncate long user agents
                    request_body=request_body[:5000] if request_body else None,  # Limit size
                    response_body=response_body,
                    error_message=error_message,
                    duration_ms=duration_ms
                )
                db.add(api_log)
                db.commit()
            except Exception as e:
                logger.error(f"Error logging API request: {e}", exc_info=True)
                db.rollback()
            finally:
                db.close()
        
        return response
    
    def _sanitize_request_body(self, body: dict) -> dict:
        """Remove sensitive fields from request body before logging"""
        sensitive_fields = ['password', 'key', 'secret', 'token', 'authorization', 'api_key']
        sanitized = {}
        
        for key, value in body.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_fields):
                sanitized[key] = "***REDACTED***"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_request_body(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    self._sanitize_request_body(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        
        return sanitized

