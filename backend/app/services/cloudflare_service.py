import requests
from typing import Optional, Dict
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class CloudflareService:
    def __init__(self):
        self.api_token = settings.CLOUDFLARE_API_TOKEN
        self.zone_id = settings.CLOUDFLARE_ZONE_ID
        self.base_domain = settings.BASE_DOMAIN
        self.base_url = "https://api.cloudflare.com/client/v4"
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
    
    def create_subdomain(self, subdomain: str, target: str = None) -> Dict:
        """Create a DNS A record for subdomain"""
        if not target:
            # Default to CNAME pointing to main domain or load balancer
            target = f"{self.base_domain}"
        
        url = f"{self.base_url}/zones/{self.zone_id}/dns_records"
        data = {
            "type": "CNAME",
            "name": f"{subdomain}.{self.base_domain}",
            "content": target,
            "ttl": 300,
            "proxied": True  # Enable Cloudflare proxy/CDN
        }
        
        try:
            response = requests.post(url, json=data, headers=self._get_headers())
            response.raise_for_status()
            result = response.json()
            
            if result.get("success"):
                logger.info(f"Created subdomain {subdomain}.{self.base_domain}")
                return result.get("result", {})
            else:
                errors = result.get("errors", [])
                logger.error(f"Failed to create subdomain: {errors}")
                raise Exception(f"Cloudflare API error: {errors}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Error creating subdomain: {e}")
            raise
    
    def delete_subdomain(self, subdomain: str) -> bool:
        """Delete DNS record for subdomain"""
        # First, get the record ID
        url = f"{self.base_url}/zones/{self.zone_id}/dns_records"
        params = {
            "name": f"{subdomain}.{self.base_domain}",
            "type": "CNAME"
        }
        
        try:
            response = requests.get(url, params=params, headers=self._get_headers())
            response.raise_for_status()
            result = response.json()
            
            if result.get("success") and result.get("result"):
                record_id = result["result"][0]["id"]
                
                # Delete the record
                delete_url = f"{self.base_url}/zones/{self.zone_id}/dns_records/{record_id}"
                delete_response = requests.delete(delete_url, headers=self._get_headers())
                delete_response.raise_for_status()
                
                logger.info(f"Deleted subdomain {subdomain}.{self.base_domain}")
                return True
            else:
                logger.warning(f"Subdomain record not found: {subdomain}")
                return False
        except requests.exceptions.RequestException as e:
            logger.error(f"Error deleting subdomain: {e}")
            raise
    
    def purge_cache(self, url: str = None) -> bool:
        """Purge Cloudflare cache for a URL or entire zone"""
        url_endpoint = f"{self.base_url}/zones/{self.zone_id}/purge_cache"
        
        if url:
            data = {"files": [url]}
        else:
            data = {"purge_everything": True}
        
        try:
            response = requests.post(url_endpoint, json=data, headers=self._get_headers())
            response.raise_for_status()
            result = response.json()
            return result.get("success", False)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error purging cache: {e}")
            return False

