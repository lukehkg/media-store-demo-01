import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import Optional, Dict
from app.config import settings
import logging
import time

logger = logging.getLogger(__name__)

class B2Service:
    def __init__(self, key_id: Optional[str] = None, key: Optional[str] = None, bucket: Optional[str] = None, endpoint: Optional[str] = None):
        # Trim whitespace to prevent "Malformed Access Key Id" errors
        # Handle None values properly
        key_id_str = key_id or settings.B2_APPLICATION_KEY_ID or ""
        key_str = key or settings.B2_APPLICATION_KEY or ""
        bucket_str = bucket or settings.B2_BUCKET_NAME or ""
        endpoint_str = endpoint or settings.B2_ENDPOINT or ""
        
        self.key_id = key_id_str.strip() if key_id_str else ""
        self.key = key_str.strip() if key_str else ""
        self.bucket = bucket_str.strip() if bucket_str else ""
        self.endpoint = endpoint_str.strip() if endpoint_str else None
        
        # Validate required fields
        if not self.key_id:
            raise ValueError("B2 Application Key ID is required")
        if not self.key:
            raise ValueError("B2 Application Key is required")
        if not self.bucket:
            raise ValueError("B2 Bucket Name is required")
        
        # Validate key_id format (B2 key IDs can vary in length, typically 12-25 characters, alphanumeric)
        if len(self.key_id) < 10 or len(self.key_id) > 30:
            raise ValueError(f"Invalid B2 Application Key ID format. Expected 10-30 characters, got {len(self.key_id)} characters. Key ID starts with: '{self.key_id[:5] if len(self.key_id) >= 5 else self.key_id}...'")
        
        # Validate key format (B2 application keys are typically 32+ characters)
        if len(self.key) < 20:
            raise ValueError(f"Invalid B2 Application Key format. Expected at least 20 characters, got {len(self.key)} characters.")
        
        # Log key_id length for debugging (without exposing the actual key)
        logger.info(f"B2Service initialized with key_id length: {len(self.key_id)}, key length: {len(self.key)}, bucket: {self.bucket}, endpoint: {self.endpoint}")
        
        # Additional validation: Check for non-printable characters or encoding issues
        if not self.key_id.isalnum():
            # Check if it's just alphanumeric (B2 key IDs should be)
            non_alnum_chars = [c for c in self.key_id if not c.isalnum()]
            logger.warning(f"Key ID contains non-alphanumeric characters: {non_alnum_chars}")
            # Remove any non-alphanumeric characters (except if it's a valid format)
            cleaned_key_id = ''.join(c for c in self.key_id if c.isalnum())
            if cleaned_key_id != self.key_id:
                logger.warning(f"Cleaned key_id from '{self.key_id}' to '{cleaned_key_id}'")
                self.key_id = cleaned_key_id
        
        # Log the actual key_id being used (first 5 and last 2 chars for debugging)
        key_id_display = f"{self.key_id[:5]}...{self.key_id[-2:]}" if len(self.key_id) > 7 else self.key_id
        logger.info(f"Using key_id: {key_id_display} (length: {len(self.key_id)})")
        
        # Extract region from endpoint and use it for signing
        # For Backblaze B2, the region in the signature should match the endpoint region
        # Extract region from endpoint like: s3.eu-central-003.backblazeb2.com -> eu-central-003
        region_name = 'us-east-1'  # Default fallback
        
        if self.endpoint and 'backblazeb2.com' in self.endpoint:
            import re
            match = re.search(r's3\.([^.]+)\.backblazeb2\.com', self.endpoint)
            if match:
                endpoint_region = match.group(1)
                # Backblaze B2 S3-Compatible API expects the exact endpoint region in region_name
                # Use the exact region from the endpoint (e.g., 'eu-central-003')
                region_name = endpoint_region
                logger.info(f"Extracted Backblaze region '{endpoint_region}' from endpoint, using '{region_name}' for boto3 region_name")
        
        # Configure S3 client for B2
        try:
            self.s3_client = boto3.client(
                's3',
                endpoint_url=self.endpoint,
                aws_access_key_id=self.key_id,
                aws_secret_access_key=self.key,
                region_name=region_name,  # Explicitly set region for signing
                config=Config(signature_version='s3v4')
            )
            logger.info(f"Boto3 S3 client created successfully with region: {region_name}")
        except Exception as e:
            logger.error(f"Failed to create boto3 S3 client: {e}")
            logger.error(f"Key ID being used: '{self.key_id}' (length: {len(self.key_id)}, repr: {repr(self.key_id)})")
            raise
    
    def generate_presigned_upload_url(self, key: str, content_type: str, expires_in: int = 3600) -> str:
        """Generate pre-signed URL for direct upload to B2"""
        try:
            url = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': key,
                    'ContentType': content_type
                },
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise
    
    def generate_presigned_download_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate pre-signed URL for downloading from B2"""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': key
                },
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating presigned download URL: {e}")
            raise
    
    def upload_file(self, file_content: bytes, key: str, content_type: str) -> bool:
        """Upload file directly to B2"""
        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_content,
                ContentType=content_type
            )
            return True
        except ClientError as e:
            logger.error(f"Error uploading file: {e}")
            raise
    
    def delete_file(self, key: str) -> bool:
        """Delete file from B2"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket,
                Key=key
            )
            return True
        except ClientError as e:
            logger.error(f"Error deleting file: {e}")
            raise
    
    def get_file_size(self, key: str) -> int:
        """Get file size from B2"""
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket,
                Key=key
            )
            return response.get('ContentLength', 0)
        except ClientError as e:
            logger.error(f"Error getting file size: {e}")
            return 0
    
    def list_files(self, prefix: str, max_keys: int = 1000) -> list:
        """List files with prefix"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            return response.get('Contents', [])
        except ClientError as e:
            logger.error(f"Error listing files: {e}")
            return []
    
    def get_bucket_storage_size(self) -> Dict:
        """Calculate total storage size of the bucket"""
        try:
            total_size = 0
            total_objects = 0
            continuation_token = None
            
            while True:
                params = {
                    'Bucket': self.bucket,
                    'MaxKeys': 1000
                }
                if continuation_token:
                    params['ContinuationToken'] = continuation_token
                
                response = self.s3_client.list_objects_v2(**params)
                
                if 'Contents' in response:
                    for obj in response['Contents']:
                        total_size += obj.get('Size', 0)
                        total_objects += 1
                
                if not response.get('IsTruncated', False):
                    break
                
                continuation_token = response.get('NextContinuationToken')
            
            return {
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "total_size_gb": round(total_size / (1024 * 1024 * 1024), 2),
                "total_objects": total_objects
            }
        except ClientError as e:
            logger.error(f"Error calculating bucket storage: {e}")
            return {
                "total_size_bytes": 0,
                "total_size_mb": 0,
                "total_size_gb": 0,
                "total_objects": 0,
                "error": str(e)
            }
    
    def test_connection(self) -> Dict:
        """Test B2 connection and return status"""
        try:
            start_time = time.time()
            bucket_error = None
            bucket_accessible = False
            list_accessible = False
            object_count = 0
            
            # Test 1: Try to list objects (this tests both bucket access and listing permissions)
            try:
                response = self.s3_client.list_objects_v2(
                    Bucket=self.bucket,
                    MaxKeys=1
                )
                # If this succeeds, both bucket access and listing work
                bucket_accessible = True
                list_accessible = True
                object_count = response.get('KeyCount', 0)
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_message = e.response.get('Error', {}).get('Message', str(e))
                
                # If ListObjectsV2 fails with 403, try HeadBucket to see if it's a listing permission issue
                if error_code in ['403', 'Forbidden', 'AccessDenied']:
                    # Try HeadBucket to check if bucket exists but listing is forbidden
                    try:
                        self.s3_client.head_bucket(Bucket=self.bucket)
                        # HeadBucket succeeded, so bucket exists but listing is forbidden
                        bucket_accessible = True
                        list_accessible = False
                        bucket_error = f"Bucket accessible but listing forbidden (403). The application key may not have 'readFiles' capability. Error: {error_message}"
                    except ClientError as head_error:
                        head_error_code = head_error.response.get('Error', {}).get('Code', 'Unknown')
                        if head_error_code == '404':
                            bucket_error = f"Bucket '{self.bucket}' not found. Please verify the bucket name."
                        elif head_error_code in ['403', 'Forbidden', 'AccessDenied']:
                            bucket_error = f"Access denied (403 Forbidden). The application key may not have required capabilities ('listBuckets' or 'readFiles'). Please check your B2 application key permissions. Error: {error_message}"
                        else:
                            bucket_error = f"Bucket access failed: {head_error_code} - {head_error.response.get('Error', {}).get('Message', str(head_error))}"
                elif error_code == '404':
                    bucket_error = f"Bucket '{self.bucket}' not found. Please verify the bucket name and ensure it exists in your Backblaze account."
                else:
                    bucket_error = f"Bucket access failed: {error_code} - {error_message}"
            
            elapsed_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # Overall status
            if bucket_accessible and list_accessible:
                status = "connected"
                message = f"Successfully connected to B2. Bucket accessible. Response time: {elapsed_time:.0f}ms"
            elif bucket_accessible:
                status = "partial"
                message = f"Bucket accessible but listing failed. {bucket_error if bucket_error else 'Response time: ' + str(round(elapsed_time, 0)) + 'ms'}"
            else:
                status = "error"
                if bucket_error:
                    message = bucket_error
                else:
                    message = "Connection failed. Please check your B2 application key permissions."
            
            return {
                "status": status,
                "message": message,
                "bucket": self.bucket,
                "endpoint": self.endpoint,
                "bucket_accessible": bucket_accessible,
                "list_accessible": list_accessible,
                "response_time_ms": round(elapsed_time, 2),
                "object_count": object_count if list_accessible else None
            }
        except Exception as e:
            logger.error(f"Error testing B2 connection: {e}")
            return {
                "status": "error",
                "message": f"Connection test failed: {str(e)}",
                "bucket": self.bucket,
                "endpoint": self.endpoint,
                "bucket_accessible": False,
                "list_accessible": False,
                "response_time_ms": None,
                "object_count": None
            }

