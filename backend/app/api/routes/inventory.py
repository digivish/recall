from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.db.database import get_db
from app.core.auth_deps import get_current_user, get_org_id
from app.models.init_db import Sku, Integration, IntegrationStatus, SkuIncident, IncidentStatus
from uuid import uuid4
from datetime import datetime, timedelta

router = APIRouter()


@router.get("")
def list_inventory(
    source: str = None,
    status: str = None,
    search: str = None,
    limit: int = 15,
    offset: int = 0,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    query = db.query(Sku).filter(Sku.org_id == org_id)

    if source and source != "All Platforms":
        source_map = {"Amazon FBA": "AMAZON_SP_API", "Shopify Plus": "SHOPIFY"}
        if source in source_map:
            query = query.filter(Sku.source == source_map[source])

    if search:
        query = query.filter(
            or_(
                Sku.name.ilike(f"%{search}%"),
                Sku.asin.ilike(f"%{search}%"),
                Sku.brand.ilike(f"%{search}%"),
            )
        )

    total = query.count()
    skus = query.order_by(Sku.updated_at.desc()).offset(offset).limit(limit).all()

    flagged_asins = set()
    if status == "Flagged" or not status:
        flagged = db.query(SkuIncident.sku_id).join(Sku).filter(
            Sku.org_id == org_id,
            SkuIncident.status == IncidentStatus.OPEN,
        ).all()
        flagged_asins = {f.sku_id for f in flagged}

    monitoring_asins = set()
    if status == "Monitoring" or not status:
        recent = datetime.utcnow() - timedelta(days=7)
        monitoring = db.query(SkuIncident.sku_id).join(Sku).filter(
            Sku.org_id == org_id,
            SkuIncident.created_at >= recent,
        ).all()
        monitoring_asins = {m.sku_id for m in monitoring}

    items = []
    for s in skus:
        sku_status = "Flagged" if s.id in flagged_asins else "Monitoring" if s.id in monitoring_asins else "Safe"
        if status and status != "All Statuses" and sku_status != status:
            continue
        items.append({
            "id": s.id,
            "asin": s.asin,
            "name": s.name,
            "brand": s.brand,
            "category": s.model or "General",
            "source": s.source,
            "status": sku_status,
            "last_sync": s.updated_at.isoformat() if s.updated_at else None,
        })

    return {
        "total": total,
        "items": items,
        "offset": offset,
        "limit": limit,
    }


@router.get("/stats")
def inventory_stats(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    total = db.query(func.count(Sku.id)).filter(Sku.org_id == org_id).scalar()

    amazon_count = db.query(func.count(Sku.id)).filter(
        Sku.org_id == org_id,
        Sku.source == "AMAZON_SP_API",
    ).scalar()

    shopify_count = db.query(func.count(Sku.id)).filter(
        Sku.org_id == org_id,
        Sku.source == "SHOPIFY",
    ).scalar()

    flagged = db.query(func.count(func.distinct(SkuIncident.sku_id))).join(Sku).filter(
        Sku.org_id == org_id,
        SkuIncident.status == IncidentStatus.OPEN,
    ).scalar()

    total_flagged = flagged or 0
    health_pct = 100 - int((total_flagged / max(total, 1)) * 100)

    return {
        "total_skus": total or 0,
        "amazon_skus": amazon_count or 0,
        "shopify_skus": shopify_count or 0,
        "flagged_count": total_flagged,
        "health_score": health_pct,
    }


@router.post("/sync")
def sync_inventory(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    user=Depends(get_current_user),
):
    """Sync inventory - now routes to proper integration endpoints."""
    return {"message": "Use /api/integrations/shopify/sync or /api/integrations/amazon/sync to sync from specific integrations"}