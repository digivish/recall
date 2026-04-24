from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.auth_deps import get_current_user, get_org_id
from app.services.scraper import fetch_all_sources
from app.services.audit import log_action, LOG_FEED_FETCH

router = APIRouter()


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
    from app.models.init_db import Recall, SkuIncident

    query = db.query(Recall)
    if source:
        query = query.filter(Recall.source_id == source)

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
                "issuing_body": r.issuing_body,
                "product_name": r.product_name,
                "severity": r.severity.value,
                "published_at": r.published_at.isoformat() if r.published_at else None,
                "incident_count": incident_counts.get(r.id, 0),
            }
            for r in recalls
        ],
    }