"""
Shopify Admin API integration service.
"""
import requests
import hashlib
import hmac
import base64
import urllib.parse
from typing import Optional
from app.core.config import get_settings


class ShopifyOAuth:
    """Shopify OAuth 2.0 flow handler."""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.SHOPIFY_API_KEY
        self.api_secret = settings.SHOPIFY_API_SECRET
        self.redirect_uri = settings.SHOPIFY_REDIRECT_URI

    def generate_auth_url(self, shop_name: str, state: str) -> str:
        """Generate Shopify OAuth authorization URL."""
        shop_name = shop_name.replace(".myshopify.com", "")
        scope = "read_products,read_inventory,write_inventory"
        params = {
            "client_id": self.api_key,
            "scope": scope,
            "redirect_uri": self.redirect_uri,
            "state": state,
        }
        return f"https://{shop_name}.myshopify.com/admin/oauth/authorize?{urllib.parse.urlencode(params)}"

    def exchange_code_for_token(self, shop_name: str, code: str) -> dict:
        """Exchange authorization code for access token."""
        shop_name = shop_name.replace(".myshopify.com", "")
        url = f"https://{shop_name}.myshopify.com/admin/oauth/access_token"
        response = requests.post(url, data={
            "client_id": self.api_key,
            "client_secret": self.api_secret,
            "code": code,
            "grant_type": "authorization_code",
            "expiring": "1",
        })
        if response.status_code != 200:
            raise Exception(f"Token exchange failed: {response.text}")
        return response.json()

    def verify_hmac(self, params: dict) -> bool:
        """Verify HMAC signature from Shopify webhook/callback."""
        hmac_header = params.get("hmac", "")
        params.pop("hmac", None)
        params.pop("signature", None)

        sorted_params = sorted(params.items())
        message = urllib.parse.urlencode(sorted_params)

        digest = hmac.new(
            self.api_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(digest, hmac_header)


class ShopifyClient:
    """Shopify Admin API client for a specific store."""

    def __init__(self, shop_name: str, access_token: str):
        self.shop_name = shop_name.replace(".myshopify.com", "")
        self.access_token = access_token
        self.base_url = f"https://{self.shop_name}.myshopify.com/admin/api/2024-01"

    def _headers(self) -> dict:
        return {
            "X-Shopify-Access-Token": self.access_token,
            "Content-Type": "application/json",
        }

    def get_products(self, limit: int = 250) -> list[dict]:
        """Get products from Shopify store."""
        url = f"{self.base_url}/products.json?limit={min(limit, 250)}"
        response = requests.get(url, headers=self._headers())

        if response.status_code != 200:
            raise Exception(f"Shopify API error: {response.text}")

        return response.json().get("products", [])

    def get_product_count(self) -> int:
        """Get total product count."""
        url = f"{self.base_url}/products/count.json"
        response = requests.get(url, headers=self._headers())

        if response.status_code != 200:
            raise Exception(f"Shopify API error: {response.text}")

        return response.json().get("count", 0)

    def get_inventory_levels(self, location_id: str = None) -> list[dict]:
        """Get inventory levels."""
        url = f"{self.base_url}/inventory_levels.json"
        params = {}
        if location_id:
            params["location_ids"] = location_id

        response = requests.get(url, headers=self._headers(), params=params)

        if response.status_code != 200:
            raise Exception(f"Shopify API error: {response.text}")

        return response.json().get("inventory_levels", [])

    def get_locations(self) -> list[dict]:
        """Get store locations."""
        url = f"{self.base_url}/locations.json"
        response = requests.get(url, headers=self._headers())

        if response.status_code != 200:
            raise Exception(f"Shopify API error: {response.text}")

        return response.json().get("locations", [])


def fetch_shopify_products(shop_name: str, access_token: str) -> list[dict]:
    """Fetch all products from a Shopify store."""
    try:
        client = ShopifyClient(shop_name=shop_name, access_token=access_token)

        products = []
        for product in client.get_products(limit=250):
            for variant in product.get("variants", []):
                products.append({
                    "sku": variant.get("sku", ""),
                    "name": product.get("title", ""),
                    "variant_title": variant.get("title", ""),
                    "price": variant.get("price", ""),
                    "inventory_quantity": variant.get("inventory_quantity", 0),
                    "barcode": variant.get("barcode", ""),
                    "vendor": product.get("vendor", ""),
                    "product_type": product.get("product_type", ""),
                    "image": product.get("image", {}).get("src", ""),
                })

        return products
    except Exception as e:
        print(f"Shopify API error: {e}")
        return []