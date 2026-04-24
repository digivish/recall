from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.auth_deps import get_current_user, get_org_id
from app.models.init_db import Integration, IntegrationStatus
from app.services.audit import log_action, LOG_CATALOG_IMPORT
from uuid import uuid4

router = APIRouter()


@router.post("/import")
def import_catalog(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    user=Depends(get_current_user),
):
    """Import SKUs from connected integrations"""
    from app.models.init_db import Sku
    import json

    integrations = db.query(Integration).filter(
        Integration.org_id == org_id,
        Integration.status == IntegrationStatus.CONNECTED,
    ).all()

    if not integrations:
        raise HTTPException(status_code=400, detail="No integrations connected")

    total_imported = 0
    for integ in integrations:
        creds = integ.credentials if isinstance(integ.credentials, dict) else json.loads(integ.credentials or "{}")
        sku_count = creds.get("product_count", creds.get("sku_count", 100))

        # Generate mock SKUs from integration
        for i in range(1, min(sku_count + 1, 26)):
            asin = f"B{integ.type.value[0]}{str(uuid4())[:8].upper()}"
            existing = db.query(Sku).filter(Sku.org_id == org_id, Sku.asin == asin).first()
            if existing:
                continue
            sku = Sku(
                id=str(uuid4()),
                org_id=org_id,
                asin=asin,
                upc=f"{999999999999 + i:012d}",
                name=f"Product {integ.type.value}-{i:03d}",
                brand="Import Brand",
                source=integ.type.value,
            )
            db.add(sku)
            total_imported += 1

    db.commit()
    log_action(db, org_id, LOG_CATALOG_IMPORT, user.id, {"count": total_imported})

    return {"imported": total_imported, "source": "mock"}


@router.get("")
def list_skus(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    limit: int = 100,
    offset: int = 0,
):
    from app.models.init_db import Sku

    query = db.query(Sku).filter(Sku.org_id == org_id)
    total = query.count()
    skus = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": s.id,
                "asin": s.asin,
                "upc": s.upc,
                "name": s.name,
                "brand": s.brand,
                "source": s.source,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in skus
        ],
    }


@router.get("/{sku_id}")
def get_sku(
    sku_id: str,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    from app.models.init_db import Sku

    sku = db.query(Sku).filter(Sku.id == sku_id, Sku.org_id == org_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    return {
        "id": sku.id,
        "asin": sku.asin,
        "upc": sku.upc,
        "ean": sku.ean,
        "brand": sku.brand,
        "model": sku.model,
        "name": sku.name,
        "source": sku.source,
        "created_at": sku.created_at.isoformat() if sku.created_at else None,
    }