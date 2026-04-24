from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.auth_deps import get_current_user, get_org_id
from app.services.matching import match_skus_to_recalls
from app.services.audit import log_action, LOG_MATCH_RUN

router = APIRouter()


@router.post("/match")
def run_matching(
    use_llm: bool = False,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    user=Depends(get_current_user),
):
    """Run SKU-to-recall matching."""
    import asyncio

    try:
        results = asyncio.run(match_skus_to_recalls(db, org_id, use_llm))
        log_action(db, org_id, LOG_MATCH_RUN, user.id, results)
        return {"status": "complete", **results}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/results")
def get_last_match_results(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Get last matching results."""
    from app.models.init_db import SkuIncident, RecallSeverity
    from sqlalchemy import func

    total = db.query(SkuIncident).filter(SkuIncident.org_id == org_id).count()
    critical = db.query(SkuIncident).filter(
        SkuIncident.org_id == org_id,
        SkuIncident.severity == RecallSeverity.CRITICAL,
    ).count()
    amber = db.query(SkuIncident).filter(
        SkuIncident.org_id == org_id,
        SkuIncident.severity == RecallSeverity.AMBER,
    ).count()
    monitoring = db.query(SkuIncident).filter(
        SkuIncident.org_id == org_id,
        SkuIncident.severity == RecallSeverity.MONITORING,
    ).count()

    resolved = db.query(SkuIncident).filter(
        SkuIncident.org_id == org_id,
        SkuIncident.status == "RESOLVED",
    ).count()

    return {
        "total_incidents": total,
        "critical": critical,
        "amber": amber,
        "monitoring": monitoring,
        "resolved": resolved,
    }