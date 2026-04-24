from fastapi import APIRouter, HTTPException, Depends, Query, Response
from sqlalchemy.orm import Session
from uuid import uuid4
from app.db.database import get_db
from app.core.auth_deps import get_org_id
from app.models.init_db import Organization, Integration, IntegrationType, IntegrationStatus
from app.services.amazon_sp_api import AmazonOAuth, AmazonSPAPI
from app.services.audit import log_action, LOG_INTEGRATION_CONNECT, LOG_INTEGRATION_DISCONNECT

router = APIRouter()

AMAZON_REDIRECT_URI = "https://recallhero.com/api/integrations/amazon/callback"
OAUTH_STATE_DB = {}


@router.get("/connect")
def amazon_connect(
    response: Response,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Initiate Amazon SP-API OAuth flow. Returns auth URL to redirect user."""
    oauth = AmazonOAuth()
    state = str(uuid4())

    OAUTH_STATE_DB[state] = {"org_id": org_id}

    auth_url = oauth.generate_auth_url(state, AMAZON_REDIRECT_URI)

    return {
        "auth_url": auth_url,
    }


@router.get("/callback")
def amazon_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    """Handle Amazon OAuth callback."""
    state_info = OAUTH_STATE_DB.pop(state, None)
    if not state_info:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    org_id = state_info["org_id"]

    oauth = AmazonOAuth()

    try:
        token_data = oauth.exchange_code_for_token(code, AMAZON_REDIRECT_URI)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {str(e)}")

    refresh_token = token_data.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="No refresh token returned")

    integration = db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.type == IntegrationType.AMAZON_SP_API,
    ).first()

    from datetime import datetime

    if integration:
        integration.credentials = {
            "refresh_token": refresh_token,
        }
        integration.status = IntegrationStatus.CONNECTED
        integration.connected_at = datetime.utcnow()
    else:
        integration = Integration(
            id=str(uuid4()),
            org_id=org_id,
            type=IntegrationType.AMAZON_SP_API,
            credentials={
                "refresh_token": refresh_token,
            },
            status=IntegrationStatus.CONNECTED,
            connected_at=datetime.utcnow(),
        )
        db.add(integration)

    db.commit()
    log_action(db, org_id, LOG_INTEGRATION_CONNECT, org_id, {"type": "AMAZON_SP_API"})

    return {
        "status": "connected",
        "redirect_url": "https://recallhero.com/integrations?connected=amazon",
    }


@router.post("/sync")
def amazon_sync(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Sync products from connected Amazon seller account."""
    integration = db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.type == IntegrationType.AMAZON_SP_API,
        Integration.status == IntegrationStatus.CONNECTED,
    ).first()

    if not integration:
        raise HTTPException(status_code=404, detail="Amazon not connected")

    creds = integration.credentials if isinstance(integration.credentials, dict) else {}
    refresh_token = creds.get("refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    api = AmazonSPAPI(refresh_token=refresh_token)

    try:
        result = api.get_inventory()
        from app.models.init_db import Sku
        from datetime import datetime

        synced = 0
        for item in result.get("inventorySummaries", []):
            asin = item.get("asin", "")
            if not asin:
                continue

            existing = db.query(Sku).filter(
                Sku.org_id == org_id,
                Sku.asin == asin,
            ).first()

            if existing:
                existing.updated_at = datetime.utcnow()
            else:
                sku = Sku(
                    id=str(uuid4()),
                    org_id=org_id,
                    asin=asin,
                    upc="",
                    name=item.get("productName", ""),
                    brand=item.get("brandName", ""),
                    model=item.get("condition", ""),
                    source="AMAZON_SP_API",
                )
                db.add(sku)
                synced += 1

        db.commit()
        return {"synced": synced}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.delete("/disconnect")
def amazon_disconnect(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Disconnect Amazon integration."""
    integration = db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.type == IntegrationType.AMAZON_SP_API,
    ).first()

    if not integration:
        raise HTTPException(status_code=404, detail="Amazon not connected")

    integration.status = IntegrationStatus.DISCONNECTED
    integration.credentials = {}
    integration.connected_at = None
    db.commit()

    log_action(db, org_id, LOG_INTEGRATION_DISCONNECT, org_id, {"type": "AMAZON_SP_API"})

    return {"status": "disconnected"}