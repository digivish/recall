from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.auth_deps import get_current_user
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
        log_action(db, "default", LOG_FEED_FETCH, user.id if user else None, results)
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
