from fastapi import APIRouter, HTTPException, Depends, Query, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from uuid import uuid4
import json
from app.db.database import get_db
from app.core.auth_deps import get_org_id
from app.models.init_db import Organization, Integration, IntegrationType, IntegrationStatus
from app.services.shopify import ShopifyOAuth, ShopifyClient

router = APIRouter()

OAUTH_STATE_DB = {}


@router.get("/connect")
def shopify_connect(
    response: Response,
    shop: str = Query(..., description="Shop name (e.g. mystore)"),
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Initiate Shopify OAuth flow. Returns auth URL to redirect user."""
    oauth = ShopifyOAuth()
    state = str(uuid4())

    OAUTH_STATE_DB[state] = {"org_id": org_id, "shop": shop}

    auth_url = oauth.generate_auth_url(shop, state)

    return {
        "auth_url": auth_url,
        "shop": shop,
    }


@router.get("/callback")
def shopify_callback(
    code: str = Query(...),
    shop: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    """Handle Shopify OAuth callback. Exchange code for token and save to Integration."""
    state_info = OAUTH_STATE_DB.pop(state, None)
    if not state_info:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    org_id = state_info["org_id"]

    oauth = ShopifyOAuth()

    try:
        token_data = oauth.exchange_code_for_token(shop, code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {str(e)}")

    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token returned")

    integration = db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.type == IntegrationType.SHOPIFY,
    ).first()

    from datetime import datetime

    if integration:
        integration.credentials = {
            "shop_name": shop,
            "access_token": access_token,
        }
        integration.status = IntegrationStatus.CONNECTED
        integration.connected_at = datetime.utcnow()
    else:
        integration = Integration(
            id=str(uuid4()),
            org_id=org_id,
            type=IntegrationType.SHOPIFY,
            credentials={
                "shop_name": shop,
                "access_token": access_token,
            },
            status=IntegrationStatus.CONNECTED,
            connected_at=datetime.utcnow(),
        )
        db.add(integration)

    db.commit()

    # Auto-sync products after connect
    try:
        client = ShopifyClient(shop_name=shop.replace(".myshopify.com", ""), access_token=access_token)
        products = client.get_products(limit=250)
        from app.models.init_db import Sku

        synced = 0
        for product in products:
            for variant in product.get("variants", []):
                asin = variant.get("sku", "") or f"SHOP-{variant.get('id', '')}"
                
                # Check for existing before adding
                existing = db.query(Sku).filter(
                    Sku.org_id == org_id,
                    Sku.asin == asin,
                ).first()
                
                if existing:
                    continue  # Skip duplicates
                    
                sku = Sku(
                    id=str(uuid4()),
                    org_id=org_id,
                    asin=asin,
                    upc=variant.get("barcode", ""),
                    name=product.get("title", ""),
                    brand=product.get("vendor", ""),
                    model=product.get("product_type", ""),
                    source="SHOPIFY",
                )
                db.add(sku)
                synced += 1
        db.commit()
        print(f"Auto-synced {synced} products", flush=True)
    except Exception as e:
        print(f"Auto-sync failed: {e}", flush=True)

    return RedirectResponse(url="http://localhost:5173/settings/integrations?connected=shopify")


@router.post("/sync")
def shopify_sync(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Sync products from connected Shopify store."""
    import traceback
    
    integration = db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.type == IntegrationType.SHOPIFY,
        Integration.status == IntegrationStatus.CONNECTED,
    ).first()

    if not integration:
        print("DEBUG: No connected Shopify integration found", flush=True)
        raise HTTPException(status_code=404, detail="Shopify not connected")

    creds = integration.credentials if isinstance(integration.credentials, dict) else {}
    shop_name = creds.get("shop_name", "").replace(".myshopify.com", "")
    access_token = creds.get("access_token", "")

    print(f"DEBUG sync: shop={shop_name}, token={access_token[:20] if access_token else 'NONE'}...", flush=True)

    if not shop_name or not access_token:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    client = ShopifyClient(shop_name=shop_name, access_token=access_token)

    try:
        products = client.get_products(limit=250)
        print(f"DEBUG: Got {len(products)} products", flush=True)
    except Exception as e:
        print(f"Shopify API error: {e}", flush=True)
        print(f"Trace: {traceback.format_exc()}", flush=True)
        raise HTTPException(status_code=500, detail=f"Shopify API error: {str(e)}")

    from app.models.init_db import Sku
    from datetime import datetime

    synced = 0
    for product in products:
        product_title = product.get("title", "")
        product_vendor = product.get("vendor", "")
        product_type = product.get("product_type", "")
        
        for variant in product.get("variants", []):
            asin = variant.get("sku", "") or f"SHOP-{variant.get('id', '')}"
            barcode = variant.get("barcode", "")

            existing = db.query(Sku).filter(
                Sku.org_id == org_id,
                Sku.asin == asin,
            ).first()

            if existing:
                existing.updated_at = datetime.utcnow()
                existing.name = product_title
                existing.brand = product_vendor
            else:
                sku = Sku(
                    id=str(uuid4()),
                    org_id=org_id,
                    asin=asin,
                    upc=barcode,
                    name=product_title,
                    brand=product_vendor,
                    model=product_type,
                    source="SHOPIFY",
                )
                db.add(sku)
                synced += 1

    db.commit()
    return {"synced": synced, "shop": shop_name}


@router.delete("/disconnect")
def shopify_disconnect(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Disconnect Shopify integration."""
    integration = db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.type == IntegrationType.SHOPIFY,
    ).first()

    if not integration:
        raise HTTPException(status_code=404, detail="Shopify not connected")

    # Delete and recreate to clear old token
    db.delete(integration)
    db.commit()

    return {"status": "disconnected"}