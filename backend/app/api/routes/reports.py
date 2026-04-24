from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.auth_deps import get_current_user, get_org_id
from uuid import uuid4
from datetime import datetime, timedelta

router = APIRouter()


@router.post("")
def generate_compliance_report(
    date_range: str = "Last 30 Days",
    entity_id: str = None,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    user=Depends(get_current_user),
):
    """Generate a new compliance evidence report (mock PDF)."""
    from app.models.init_db import SkuIncident, IncidentStatus

    # Get incidents based on date range
    days = 30
    if date_range == "Last 7 Days":
        days = 7
    elif date_range == "Last 90 Days":
        days = 90
    elif date_range == "Year to Date":
        days = 365

    cutoff = datetime.utcnow() - timedelta(days=days)
    incidents = db.query(SkuIncident).filter(
        SkuIncident.org_id == org_id,
        SkuIncident.created_at >= cutoff,
    ).order_by(SkuIncident.created_at.desc()).all()

    # Count by status
    total = len(incidents)
    resolved = len([i for i in incidents if i.status == IncidentStatus.RESOLVED])
    open_count = len([i for i in incidents if i.status == IncidentStatus.OPEN])

    # Create mock report
    report_id = str(uuid4())
    report = {
        "id": report_id,
        "generated_at": datetime.utcnow().isoformat(),
        "date_range": date_range,
        "total_incidents": total,
        "resolved": resolved,
        "open": open_count,
        "type": "Compliance Evidence Report",
        "status": "Generated",
    }

    return {"report": report, "message": "Report generated successfully (mock)"}


@router.get("")
def list_reports(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """List historical compliance reports."""
    from app.models.init_db import SkuIncident, IncidentStatus, Sku
    from sqlalchemy import func

    # Get incidents to derive report stats
    incidents = db.query(SkuIncident).filter(
        SkuIncident.org_id == org_id,
    ).order_by(SkuIncident.created_at.desc()).limit(50).all()

    # Group by month for archives
    by_month = {}
    for i in incidents:
        if i.created_at:
            month = i.created_at.strftime("%Y-%m")
            if month not in by_month:
                by_month[month] = {"count": 0, "resolved": 0}
            by_month[month]["count"] += 1
            if i.status == IncidentStatus.RESOLVED:
                by_month[month]["resolved"] += 1

    archives = [
        {
            "id": f"report-{month}",
            "title": f"Monthly Audit: {month}",
            "type": "Monthly Audit",
            "incident_count": data["count"],
            "resolved_count": data["resolved"],
            "last_modified": f"{month}-01",
        }
        for month, data in sorted(by_month.items(), reverse=True)[:12]
    ]

    # Also add some static mock historical reports
    archives.extend([
        {
            "id": "report-q3-master",
            "title": "Q3 Master Audit",
            "type": "Insurance Claim",
            "incident_count": 42,
            "resolved_count": 38,
            "last_modified": "2023-10-12",
        },
        {
            "id": "report-cpsc-99ax",
            "title": "CPSC Case #99-AX Verification",
            "type": "Insurance Claim",
            "incident_count": 12,
            "resolved_count": 10,
            "last_modified": "2023-09-28",
        },
        {
            "id": "report-week-42",
            "title": "Weekly Snapshot: Week 42",
            "type": "Internal Review",
            "incident_count": 5,
            "resolved_count": 4,
            "last_modified": "2023-10-19",
        },
    ])

    return {"reports": archives, "total": len(archives)}


@router.get("/proof-of-action")
def get_proof_of_action(
    limit: int = 10,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Get proof of action - incidents with actions taken."""
    from app.models.init_db import SkuIncident, IncidentStatus, Recall

    incidents = db.query(SkuIncident).filter(
        SkuIncident.org_id == org_id,
    ).order_by(SkuIncident.created_at.desc()).limit(limit).all()

    incident_map = {
        "OPEN": "Listing Paused" if incidents and incidents[0].auto_paused else "Monitoring",
        "ACKNOWLEDGED": "Acknowledged",
        "RESOLVED": "Recall Processed",
        "CLOSED": "Resolved",
    }

    items = []
    for i in incidents:
        action_status = incident_map.get(i.status.value, "Monitoring")

        # Get source display name
        source_name = "CPSC Notification"
        if i.recall and i.recall.source:
            src = i.recall.source.source_name.value
            if "FDA" in src:
                source_name = f"FDA {src.split('_')[-1]}"
            elif "HEALTH" in src:
                source_name = "Health Canada Advisory"
            elif "CPSC" in src:
                source_name = f"CPSC #{i.recall.external_id[:4]}"

        items.append({
            "id": i.id,
            "sku": {
                "id": i.sku.id if i.sku else None,
                "name": i.sku.name if i.sku else None,
                "asin": i.sku.asin if i.sku else None,
                "brand": i.sku.brand if i.sku else None,
            },
            "recall": {
                "title": i.recall.title if i.recall else None,
                "source_name": source_name,
            },
            "action_taken": action_status,
            "timestamp": i.created_at.isoformat() if i.created_at else None,
            "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None,
        })

    return {"items": items, "total": len(items)}


@router.get("/stats")
def get_report_stats(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Get stats for reports page."""
    from app.models.init_db import SkuIncident, IncidentStatus
    from sqlalchemy import func

    total_incidents = db.query(func.count(SkuIncident.id)).filter(
        SkuIncident.org_id == org_id,
    ).scalar() or 0

    resolved = db.query(func.count(SkuIncident.id)).filter(
        SkuIncident.org_id == org_id,
        SkuIncident.status == IncidentStatus.RESOLVED,
    ).scalar() or 0

    open_count = db.query(func.count(SkuIncident.id)).filter(
        SkuIncident.org_id == org_id,
        SkuIncident.status == IncidentStatus.OPEN,
    ).scalar() or 0

    compliance_pct = round((resolved / max(total_incidents, 1)) * 100, 1)

    # Calculate risk score (mock - inverse of open incidents)
    risk_score = max(0, 100 - (open_count * 10))

    return {
        "compliance_health": compliance_pct,
        "exposure_gauge": risk_score,
        "total_incidents": total_incidents,
        "resolved": resolved,
        "open": open_count,
    }


@router.post("/insurance-audit")
def generate_insurance_audit(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Generate insurance audit report."""
    from app.models.init_db import SkuIncident, AuditLog
    from datetime import datetime
    import json

    incidents = db.query(SkuIncident).filter(
        SkuIncident.org_id == org_id,
    ).all()

    audit_logs = db.query(AuditLog).filter(
        AuditLog.org_id == org_id,
    ).order_by(AuditLog.created_at.desc()).limit(100).all()

    report = {
        "generated_at": datetime.utcnow().isoformat(),
        "org_id": org_id,
        "total_incidents": len(incidents),
        "incidents": [
            {
                "id": i.id,
                "sku": i.sku.name if i.sku else None,
                "asin": i.sku.asin if i.sku else None,
                "recall": i.recall.title if i.recall else None,
                "severity": i.severity.value,
                "status": i.status.value,
                "created_at": i.created_at.isoformat() if i.created_at else None,
                "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None,
            }
            for i in incidents
        ],
        "actions": [
            {
                "action": a.action,
                "user_id": a.user_id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "meta": a.meta_data,
            }
            for a in audit_logs
        ],
    }

    return report


@router.get("/export/{incident_id}")
def export_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Export single incident as document."""
    from app.models.init_db import SkuIncident
    from datetime import datetime

    incident = db.query(SkuIncident).filter(
        SkuIncident.id == incident_id,
        SkuIncident.org_id == org_id,
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    doc = {
        "incident_id": incident.id,
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
        "product": {
            "name": incident.sku.name if incident.sku else None,
            "asin": incident.sku.asin if incident.sku else None,
            "upc": incident.sku.upc if incident.sku else None,
            "brand": incident.sku.brand if incident.sku else None,
        },
        "recall": {
            "title": incident.recall.title if incident.recall else None,
            "source": incident.recall.source.source_name.value if incident.recall and incident.recall.source else None,
            "severity": incident.severity.value,
            "description": incident.recall.hazard_description if incident.recall else None,
            "recommended_action": incident.recall.recommended_action if incident.recall else None,
        },
        "resolution": {
            "status": incident.status.value,
            "acknowledged_at": incident.acknowledged_at.isoformat() if incident.acknowledged_at else None,
            "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
            "notes": incident.notes,
        },
    }

    return doc


@router.get("/audit-log")
def get_audit_log(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    limit: int = 100,
):
    """Get audit log for org."""
    from app.models.init_db import AuditLog

    logs = db.query(AuditLog).filter(
        AuditLog.org_id == org_id,
    ).order_by(AuditLog.created_at.desc()).limit(limit).all()

    return {
        "total": len(logs),
        "items": [
            {
                "id": l.id,
                "action": l.action,
                "user_id": l.user_id,
                "created_at": l.created_at.isoformat() if l.created_at else None,
                "meta": l.meta_data,
            }
            for l in logs
        ],
    }