from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import uuid4
from app.db.database import get_db
from app.core.auth_deps import get_current_user, get_org_id
from app.models.init_db import Organization, Integration, IntegrationType, IntegrationStatus
from app.services.audit import log_action, LOG_INTEGRATION_CONNECT, LOG_INTEGRATION_DISCONNECT

router = APIRouter()


class ConnectRequest(BaseModel):
    type: IntegrationType
    # Mock credentials for now - real OAuth flows come in Phase 3
    seller_id: str = ""
    store_url: str = ""
    api_key: str = ""


class IntegrationResponse(BaseModel):
    id: str
    type: str
    status: str
    connected_at: str | None


MOCK_AMAZON_RETURN = {
    "seller_id": "A1234567890ABC",
    "marketplace": "amazon.com",
    "sku_count": 1247,
}

MOCK_SHOPIFY_RETURN = {
    "store": "mystore.myshopify.com",
    "product_count": 892,
}


@router.get("")
def list_integrations(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    integrations = db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.status == IntegrationStatus.CONNECTED
    ).all()
    return [
        {
            "id": i.id,
            "type": i.type.value,
            "status": i.status.value,
            "connected_at": i.connected_at.isoformat() if i.connected_at else None,
        }
        for i in integrations
    ]


@router.post("", status_code=201)
def connect_integration(
    body: ConnectRequest,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    user=Depends(get_current_user),
):
    # Check if already connected
    existing = db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.type == body.type,
    ).first()
    if existing and existing.status == IntegrationStatus.CONNECTED:
        raise HTTPException(status_code=409, detail="Integration already connected")

    # Mock the OAuth/connection process
    if body.type == IntegrationType.AMAZON_SP_API:
        mock_result = MOCK_AMAZON_RETURN
    elif body.type == IntegrationType.SHOPIFY:
        mock_result = MOCK_SHOPIFY_RETURN
    else:
        raise HTTPException(status_code=400, detail="Unknown integration type")

    import json
    credentials = json.dumps(mock_result)

    if existing:
        existing.credentials = credentials
        existing.status = IntegrationStatus.CONNECTED
        from datetime import datetime
        existing.connected_at = datetime.utcnow()
    else:
        integration = Integration(
            id=str(uuid4()),
            org_id=org_id,
            type=body.type,
            credentials=credentials,
            status=IntegrationStatus.CONNECTED,
        )
        db.add(integration)

    db.commit()
    log_action(db, org_id, LOG_INTEGRATION_CONNECT, user.id, {"type": body.type.value})

    return {"status": "connected", "type": body.type.value}


@router.delete("/{integration_id}")
def disconnect_integration(
    integration_id: str,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    user=Depends(get_current_user),
):
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.org_id == org_id,
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    integration.status = IntegrationStatus.DISCONNECTED
    integration.connected_at = None
    db.commit()

    log_action(db, org_id, LOG_INTEGRATION_DISCONNECT, user.id, {"id": integration_id})

    return {"status": "disconnected"}


@router.get("/mock-import")
def mock_import_skus(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    user=Depends(get_current_user),
):
    """Mock SKU import - generates test SKUs for demo"""
    from app.models.init_db import Sku
    import json

    # Get connected integrations
    integrations = db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.status == IntegrationStatus.CONNECTED,
    ).all()

    if not integrations:
        return {"message": "No integrations connected", "imported": 0}

    total_imported = 0
    for integration in integrations:
        creds = integration.credentials if isinstance(integration.credentials, dict) else json.loads(integration.credentials or "{}")
        sku_count = creds.get("product_count", creds.get("sku_count", 100))

        # Generate mock SKUs
        products = [
            f"Product SKU-{i:04d}" for i in range(1, min(sku_count, 26))
        ]
        for i, name in enumerate(products):
            asin = f"B{(integration.type.value[0])}{str(uuid4())[:8].upper()}"
            sku = Sku(
                id=str(uuid4()),
                org_id=org_id,
                asin=asin,
                upc=f"{999999999999:012d}",
                name=name,
                brand="Demo Brand",
                source=integration.type.value,
            )
            db.add(sku)
            total_imported += 1

    db.commit()
    log_action(db, org_id, "catalog.import", user.id, {"count": total_imported})

    return {"imported": total_imported}