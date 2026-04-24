from sqlalchemy.orm import Session
from app.models.init_db import AuditLog
import json
from datetime import datetime
from uuid import uuid4


def log_action(
    db: Session,
    org_id: str,
    action: str,
    user_id: str | None = None,
    metadata: dict | None = None,
) -> AuditLog:
    entry = AuditLog(
        id=str(uuid4()),
        org_id=org_id,
        user_id=user_id,
        action=action,
        meta_data=metadata or {},
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
    return entry


# ── Canonical action names used throughout the app ──────────────────────────
LOG_REGISTER = "user.register"
LOG_LOGIN = "user.login"
LOG_INTEGRATION_CONNECT = "integration.connect"
LOG_INTEGRATION_DISCONNECT = "integration.disconnect"
LOG_CATALOG_IMPORT = "catalog.import"
LOG_INCIDENT_ACKNOWLEDGE = "incident.acknowledge"
LOG_INCIDENT_AUTO_PAUSE = "incident.auto_pause"
LOG_INCIDENT_RESOLVE = "incident.resolve"
LOG_FEED_FETCH = "feed.fetch"
LOG_MATCH_RUN = "match.run"
LOG_SUBSCRIPTION_CHANGE = "subscription.change"
LOG_SUBSCRIPTION_GRACE = "subscription.grace"
LOG_SUBSCRIPTION_CANCEL = "subscription.cancel"