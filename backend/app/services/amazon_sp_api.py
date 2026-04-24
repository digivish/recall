"""
Amazon Selling Partner API (SP-API) OAuth integration.
"""
import base64
import requests
from urllib.parse import urlencode
from app.core.config import get_settings


class AmazonOAuth:
    """Amazon SP-API OAuth 2.0 flow handler."""

    def __init__(self):
        settings = get_settings()
        self.client_id = settings.AMAZON_CLIENT_ID
        self.client_secret = settings.AMAZON_CLIENT_SECRET
        self.refresh_token_val = settings.AMAZON_REFRESH_TOKEN

        self.token_url = "https://api.amazon.com/auth/o2/token"
        self.auth_url = "https://www.amazon.com/ap/oa"

    def generate_auth_url(self, state: str, redirect_uri: str) -> str:
        """Generate Amazon OAuth authorization URL."""
        scope = "sellingpartnerapi::catalog"

        params = {
            "client_id": self.client_id,
            "scope": scope,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "state": state,
        }
        return f"{self.auth_url}?{urlencode(params)}"

    def exchange_code_for_token(self, code: str, redirect_uri: str) -> dict:
        """Exchange authorization code for refresh token."""
        auth = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        response = requests.post(
            self.token_url,
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
            },
        )

        if response.status_code != 200:
            raise Exception(f"Token exchange failed: {response.text}")

        return response.json()

    def refresh_access_token(self, refresh_token: str = None) -> dict:
        """Refresh the access token using refresh token."""
        refresh = refresh_token or self.refresh_token_val
        if not refresh:
            raise ValueError("No refresh token available")

        auth = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        response = requests.post(
            self.token_url,
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh,
            },
        )

        if response.status_code != 200:
            raise Exception(f"Token refresh failed: {response.text}")

        return response.json()


class AmazonSPAPI:
    """Amazon Selling Partner API client."""

    def __init__(self, seller_id: str = None, refresh_token: str = None):
        settings = get_settings()
        self.seller_id = seller_id or settings.AMAZON_SELLER_ID
        self.refresh_token_val = refresh_token or settings.AMAZON_REFRESH_TOKEN
        self.client_id = settings.AMAZON_CLIENT_ID
        self.client_secret = settings.AMAZON_CLIENT_SECRET

        self.access_token = None
        self.token_expiry = None

        self.endpoint = "https://sellingpartnerapi-na.amazon.com"
        self.region = "na"

    def _refresh_token(self) -> str:
        """Get a fresh access token."""
        oauth = AmazonOAuth()
        result = oauth.refresh_access_token(self.refresh_token_val)
        self.access_token = result["access_token"]
        self.token_expiry = __import__("time").time() + result.get("expires_in", 3600) - 60
        return self.access_token

    def _get_access_token(self) -> str:
        """Get valid access token (cached)."""
        import time
        if self.access_token and self.token_expiry and time.time() < self.token_expiry:
            return self.access_token
        return self._refresh_token()

    def _make_request(self, method: str, path: str, **kwargs) -> dict:
        """Make authenticated API request."""
        token = self._get_access_token()

        url = f"{self.endpoint}{path}"
        headers = {
            "Authorization": f"Bearer {token}",
            "x-amz-target": "AmazonSPAPI",
            "Content-Type": "application/json",
        }

        response = requests.request(method, url, headers=headers, **kwargs)

        if response.status_code == 401:
            self.access_token = None
            self.token_expiry = None
            token = self._get_access_token()
            headers["Authorization"] = f"Bearer {token}"
            response = requests.request(method, url, headers=headers, **kwargs)

        if response.status_code >= 400:
            raise Exception(f"API request failed: {response.status_code} - {response.text}")

        return response.json() if response.content else {}

    def get_inventory(self, next_token: str = None) -> dict:
        """Get FBA inventory summaries."""
        if next_token:
            return self._make_request(
                "POST",
                "/fba/inventory/v1/summaries/next",
                json={"nextToken": next_token},
            )

        return self._make_request(
            "GET",
            f"/fba/inventory/v1/summaries?sellerId={self.seller_id}&marketplaceIds=ATVPDKIKX0DER&details=true",
        )

    def get_product_catalog(self, sku: str = None, asin: str = None) -> dict:
        """Get product catalog item details."""
        path = "/catalog/2022-04-01/items"
        params = {"marketplaceId": "ATVPDKIKX0DER"}

        if sku:
            params["keywords"] = sku
        if asin:
            params["identifiers"] = asin
            params["identifiersType"] = "ASIN"

        return self._make_request("GET", path, params=params)

    def get_orders(self, created_after: str = None) -> dict:
        """Get orders."""
        import time
        from datetime import datetime, timedelta

        if not created_after:
            created_after = (datetime.utcnow() - timedelta(days=30)).isoformat()

        return self._make_request(
            "GET",
            "/orders/v0/orders",
            params={
                "SellerId": self.seller_id,
                "MarketplaceId": "ATVPDKIKX0DER",
                "CreatedAfter": created_after,
            },
        )


def fetch_amazon_products(refresh_token: str = None, seller_id: str = None) -> list:
    """Fetch products from Amazon seller account."""
    try:
        api = AmazonSPAPI(seller_id=seller_id, refresh_token=refresh_token)
        result = api.get_inventory()

        products = []
        for item in result.get("inventorySummaries", []):
            products.append({
                "asin": item.get("asin"),
                "sku": item.get("sellerSku"),
                "name": item.get("productName", ""),
                "brand": item.get("brandName", ""),
                "condition": item.get("condition", ""),
                "quantity": item.get("quantity", 0),
                "inbound": item.get("inboundQuantity", 0),
                "reserved": item.get("reservedQuantity", 0),
            })

        return products
    except Exception as e:
        print(f"Amazon API error: {e}")
        return []


def fetch_amazon_orders(refresh_token: str = None, seller_id: str = None) -> list:
    """Fetch recent orders from Amazon."""
    try:
        api = AmazonSPAPI(seller_id=seller_id, refresh_token=refresh_token)
        result = api.get_orders()

        orders = []
        for order in result.get("Orders", []):
            orders.append({
                "amazon_order_id": order.get("AmazonOrderId"),
                "status": order.get("OrderStatus"),
                "total": order.get("OrderTotal", {}).get("Amount"),
                "currency": order.get("OrderTotal", {}).get("CurrencyCode"),
                "purchase_date": order.get("PurchaseDate"),
            })

        return orders
    except Exception as e:
        print(f"Amazon API error: {e}")
        return []