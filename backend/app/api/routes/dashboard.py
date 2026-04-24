from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.auth_deps import get_org_id
from app.models.init_db import Sku, SkuIncident, IncidentStatus, Recall, RecallSeverity

router = APIRouter()


@router.get("/incidents")
def list_incidents(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    limit: int = 50,
    offset: int = 0,
    severity: str | None = None,
):
    query = db.query(SkuIncident).filter(SkuIncident.org_id == org_id)
    if severity:
        query = query.filter(SkuIncident.severity == severity)

    total = query.count()
    incidents = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": i.id,
                "sku": {
                    "asin": i.sku.asin if i.sku else None,
                    "name": i.sku.name if i.sku else None,
                },
                "recall": {
                    "title": i.recall.title if i.recall else None,
                    "source_name": i.recall.source.source_name if i.recall and i.recall.source else None,
                },
                "severity": i.severity.value,
                "status": i.status.value,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in incidents
        ],
    }


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    total_skus = db.query(Sku).filter(Sku.org_id == org_id).count()
    active = db.query(SkuIncident).filter(
        SkuIncident.org_id == org_id,
        SkuIncident.status != IncidentStatus.RESOLVED,
    ).count()
    resolved = db.query(SkuIncident).filter(
        SkuIncident.org_id == org_id,
        SkuIncident.status == IncidentStatus.RESOLVED,
    ).count()
    critical = db.query(SkuIncident).filter(
        SkuIncident.org_id == org_id,
        SkuIncident.severity == RecallSeverity.CRITICAL,
        SkuIncident.status != IncidentStatus.RESOLVED,
    ).count()

    return {
        "total_skus": total_skus,
        "active_recalls": active,
        "resolved": resolved,
        "critical": critical,
        "docs_ready": 98.2,
    }


@router.get("")
def list_incidents(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    limit: int = 50,
    offset: int = 0,
    severity: str | None = None,
):
    query = db.query(SkuIncident).filter(SkuIncident.org_id == org_id)
    if severity:
        query = query.filter(SkuIncident.severity == severity)

    total = query.count()
    incidents = query.offset(offset).limit(limit).all()

    from app.models.init_db import Recall
    return {
        "total": total,
        "items": [
            {
                "id": i.id,
                "sku": {
                    "asin": i.sku.asin if i.sku else None,
                    "name": i.sku.name if i.sku else None,
                },
                "recall": {
                    "title": i.recall.title if i.recall else None,
                    "source_name": i.recall.source.source_name if i.recall and i.recall.source else None,
                },
                "severity": i.severity.value,
                "status": i.status.value,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in incidents
        ],
    }


@router.get("/{incident_id}")
def get_incident_detail(
    incident_id: str,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    incident = db.query(SkuIncident).filter(
        SkuIncident.id == incident_id,
        SkuIncident.org_id == org_id,
    ).first()
    if not incident:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Incident not found")

    return {
        "id": incident.id,
        "sku": {
            "id": incident.sku.id,
            "asin": incident.sku.asin,
            "name": incident.sku.name,
            "brand": incident.sku.brand,
            "model": incident.sku.model,
        },
        "recall": {
            "id": incident.recall.id,
            "title": incident.recall.title,
            "source_name": incident.recall.source.source_name.value if incident.recall.source else None,
            "product_name": incident.recall.product_name,
            "issuing_body": incident.recall.issuing_body,
            "hazard_description": incident.recall.hazard_description,
            "recommended_action": incident.recall.recommended_action,
            "published_at": incident.recall.published_at.isoformat() if incident.recall.published_at else None,
            "source_url": incident.recall.source_url,
        },
        "severity": incident.severity.value,
        "status": incident.status.value,
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
        "acknowledged_at": incident.acknowledged_at.isoformat() if incident.acknowledged_at else None,
        "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
    }
def acknowledge_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    from datetime import datetime
    incident = db.query(SkuIncident).filter(
        SkuIncident.id == incident_id,
        SkuIncident.org_id == org_id,
    ).first()
    if not incident:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = IncidentStatus.ACKNOWLEDGED
    incident.acknowledged_at = datetime.utcnow()
    db.commit()
    return {"status": "acknowledged"}


@router.post("/{incident_id}/resolve")
def resolve_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    from datetime import datetime
    from fastapi import HTTPException
    from app.core.auth_deps import get_current_user

    user = get_current_user  # Placeholder - need proper auth
    incident = db.query(SkuIncident).filter(
        SkuIncident.id == incident_id,
        SkuIncident.org_id == org_id,
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = IncidentStatus.RESOLVED
    incident.resolved_at = datetime.utcnow()
    db.commit()
    return {"status": "resolved"}