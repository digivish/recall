"""
Alert service - sends notifications for incidents.
"""
import json
from datetime import datetime
from uuid import uuid4

from app.models.init_db import SkuIncident, Alert, AlertChannel


def create_alert(db, org_id: str, incident_id: str, channel: AlertChannel, recipient: str) -> Alert:
    """Create an alert for an incident."""
    incident = db.query(SkuIncident).filter(
        SkuIncident.id == incident_id,
        SkuIncident.org_id == org_id,
    ).first()
    if not incident:
        return None

    # Build alert payload
    payload = {
        "incident_id": incident_id,
        "sku": incident.sku.name if incident.sku else None,
        "severity": incident.severity.value,
        "recall": incident.recall.title if incident.recall else None,
    }

    alert = Alert(
        id=str(uuid4()),
        org_id=org_id,
        incident_id=incident_id,
        channel=channel,
        recipient=recipient,
        payload=payload,
        sent_at=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()
    return alert


def notify_incident_created(db, org_id: str, incident: SkuIncident):
    """Notify relevant users when incident is created."""
    # Get org users (in real app, fetch from User model)
    # For now, create a placeholder alert
    payload = {
        "incident_id": incident.id,
        "sku": incident.sku.name if incident.sku else None,
        "severity": incident.severity.value,
        "action": "Auto-pause enabled" if incident.auto_paused else "Review required",
    }

    alert = Alert(
        id=str(uuid4()),
        org_id=org_id,
        incident_id=incident.id,
        channel=AlertChannel.EMAIL,
        recipient="alerts@example.com",  # placeholder
        payload=payload,
        sent_at=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()


def get_alerts_for_org(db, org_id: str, limit: int = 50):
    """Get recent alerts for org."""
    return db.query(Alert).filter(
        Alert.org_id == org_id
    ).order_by(Alert.created_at.desc()).limit(limit).all()