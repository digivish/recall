from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import uuid4
from app.db.database import get_db
from app.core.auth_deps import get_current_user, get_org_id
from app.services.scraper import fetch_all_sources
from app.services.audit import log_action, LOG_FEED_FETCH

router = APIRouter()


@router.get("/{recall_id}")
def get_recall(
    recall_id: str,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Get a single recall by ID with matched SKUs and incidents."""
    from app.models.init_db import Recall, SkuIncident, Sku

    recall = db.query(Recall).filter(Recall.id == recall_id).first()
    if not recall:
        raise HTTPException(status_code=404, detail="Recall not found")

    # Get incidents for this recall
    incidents = db.query(SkuIncident).filter(
        SkuIncident.recall_id == recall_id,
    ).all()

    # Get matched SKUs
    sku_ids = [i.sku_id for i in incidents]
    matched_skus = db.query(Sku).filter(Sku.id.in_(sku_ids)).all() if sku_ids else []

    # Get available actions based on incident state
    status = "NO_MATCH"
    acknowledged_at = None
    if incidents:
        incident = incidents[0]
        status = incident.status.value
        acknowledged_at = incident.acknowledged_at.isoformat() if incident.acknowledged_at else None

    return {
        "id": recall.id,
        "external_id": recall.external_id,
        "title": recall.title,
        "source_name": recall.source.source_name.value if recall.source else None,
        "product_name": recall.product_name,
        "issuing_body": recall.issuing_body,
        "hazard_description": recall.hazard_description,
        "recommended_action": recall.recommended_action,
        "published_at": recall.published_at.isoformat() if recall.published_at else None,
        "source_url": recall.source_url,
        "severity": recall.severity.value,
        "status": status,
        "acknowledged_at": acknowledged_at,
        "matched_skus": [
            {
                "id": sku.id,
                "asin": sku.asin,
                "name": sku.name,
                "brand": sku.brand,
            }
            for sku in matched_skus
        ],
    }


@router.post("/trigger")
def trigger_feed_fetch(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Trigger feed fetch from all sources."""
    import asyncio

    try:
        results = asyncio.run(fetch_all_sources(db))
        log_action(db, "default", LOG_FEED_FETCH, user.id, results)
        return {"status": "complete", **results}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/sources")
def list_sources(
    db: Session = Depends(get_db),
):
    """List configured recall sources."""
    from app.models.init_db import RecallSource
    sources = db.query(RecallSource).all()
    return [
        {
            "source_name": s.source_name.value,
            "last_fetched": s.last_fetched.isoformat() if s.last_fetched else None,
        }
        for s in sources
    ]


@router.get("")
def list_recalls(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    source: str | None = None,
    severity: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    """List all recalls."""
    from app.models.init_db import Recall, SkuIncident, RecallSource

    query = db.query(Recall)
    if source:
        # source can be source_name (FDA_FOOD) or source UUID
        source_rec = db.query(RecallSource).filter(
            (RecallSource.id == source) | (RecallSource.source_name == source)
        ).first()
        if source_rec:
            query = query.filter(Recall.source_id == source_rec.id)

    if severity:
        query = query.filter(Recall.severity == severity)

    total = query.count()
    recalls = query.offset(offset).limit(limit).all()

    # Get incident counts per recall
    incident_counts = {}
    for recall in recalls:
        count = db.query(SkuIncident).filter(
            SkuIncident.recall_id == recall.id,
        ).count()
        incident_counts[recall.id] = count

    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "external_id": r.external_id,
                "title": r.title,
                "source_name": r.source.source_name.value if r.source else None,
                "issuing_body": r.issuing_body,
                "product_name": r.product_name,
                "hazard_description": r.hazard_description,
                "category": r.category,
                "severity": r.severity.value,
                "published_at": r.published_at.isoformat() if r.published_at else None,
                "source_url": r.source_url,
                "incident_count": incident_counts.get(r.id, 0),
            }
            for r in recalls
        ],
    }