from sqlalchemy import Column, String, DateTime, Enum, Text, Boolean, Integer, ForeignKey, UniqueConstraint, Index, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base
import enum


class PlanTier(str, enum.Enum):
    FREE = "FREE"
    STANDARD = "STANDARD"
    PROFESSIONAL = "PROFESSIONAL"
    ENTERPRISE = "ENTERPRISE"


class UserRole(str, enum.Enum):
    OWNER = "OWNER"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


class IntegrationType(str, enum.Enum):
    AMAZON_SP_API = "AMAZON_SP_API"
    SHOPIFY = "SHOPIFY"


class IntegrationStatus(str, enum.Enum):
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"
    ERROR = "ERROR"


class SourceName(str, enum.Enum):
    HEALTH_CANADA = "HEALTH_CANADA"
    FDA_FOOD = "FDA_FOOD"
    FDA_DRUG = "FDA_DRUG"
    FDA_DEVICE = "FDA_DEVICE"
    CPSC = "CPSC"


class RecallSeverity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    AMBER = "AMBER"
    MONITORING = "MONITORING"


class IncidentStatus(str, enum.Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class AlertChannel(str, enum.Enum):
    EMAIL = "EMAIL"
    SMS = "SMS"


class SubscriptionStatus(str, enum.Enum):
    TRIAGING = "TRIAGING"
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    CANCELED = "CANCELED"


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    plan_tier = Column(Enum(PlanTier), default=PlanTier.FREE)
    stripe_customer_id = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="org")
    integrations = relationship("Integration", back_populates="org")
    skus = relationship("Sku", back_populates="org")
    incidents = relationship("SkuIncident", back_populates="org")
    alerts = relationship("Alert", back_populates="org")
    audit_logs = relationship("AuditLog", back_populates="org")
    subscription = relationship("Subscription", back_populates="org", uselist=False)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.MEMBER)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    org = relationship("Organization", back_populates="users")
    resolved_incidents = relationship("SkuIncident", back_populates="resolved_by")
    audit_logs = relationship("AuditLog", back_populates="user")

    __table_args__ = (Index("ix_users_org_id", "org_id"),)


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    type = Column(Enum(IntegrationType), nullable=False)
    credentials = Column(JSON)
    status = Column(Enum(IntegrationStatus), default=IntegrationStatus.DISCONNECTED)
    connected_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    org = relationship("Organization", back_populates="integrations")

    __table_args__ = (Index("ix_integrations_org_id", "org_id"),)


class Sku(Base):
    __tablename__ = "skus"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    asin = Column(String)
    upc = Column(String)
    ean = Column(String)
    brand = Column(String)
    model = Column(String)
    name = Column(String, nullable=False)
    source = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    org = relationship("Organization", back_populates="skus")
    incidents = relationship("SkuIncident", back_populates="sku")

    __table_args__ = (
        UniqueConstraint("org_id", "asin", name="ix_sku_org_asin"),
        Index("ix_skus_org_id", "org_id"),
    )


class RecallSource(Base):
    __tablename__ = "recall_sources"

    id = Column(String, primary_key=True)
    source_name = Column(Enum(SourceName), nullable=False)
    base_url = Column(String, nullable=False)
    api_key = Column(String)
    last_fetched = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    recalls = relationship("Recall", back_populates="source")


class Recall(Base):
    __tablename__ = "recalls"

    id = Column(String, primary_key=True)
    source_id = Column(String, ForeignKey("recall_sources.id"), nullable=False)
    external_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    source_url = Column(String)
    issuing_body = Column(String)
    product_name = Column(String)
    hazard_description = Column(Text)
    category = Column(String)
    severity = Column(Enum(RecallSeverity))
    recommended_action = Column(Text)
    published_at = Column(DateTime)
    raw_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    source = relationship("RecallSource", back_populates="recalls")
    incidents = relationship("SkuIncident", back_populates="recall")

    __table_args__ = (
        UniqueConstraint("source_id", "external_id", name="ix_recall_source_external"),
        Index("ix_recalls_source_id", "source_id"),
        Index("ix_recalls_published", "published_at"),
    )


class SkuIncident(Base):
    __tablename__ = "sku_incidents"

    id = Column(String, primary_key=True)
    sku_id = Column(String, ForeignKey("skus.id"), nullable=False)
    recall_id = Column(String, ForeignKey("recalls.id"), nullable=False)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    severity = Column(Enum(RecallSeverity), nullable=False)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.OPEN)
    auto_paused = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime)
    resolved_at = Column(DateTime)
    resolved_by_id = Column(String, ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sku = relationship("Sku", back_populates="incidents")
    recall = relationship("Recall", back_populates="incidents")
    org = relationship("Organization", back_populates="incidents")
    resolved_by = relationship("User", back_populates="resolved_incidents")
    alerts = relationship("Alert", back_populates="incident")

    __table_args__ = (
        UniqueConstraint("sku_id", "recall_id", name="ix_sku_recall_unique"),
        Index("ix_incidents_org_sev", "org_id", "severity", "status"),
        Index("ix_incidents_sku", "sku_id"),
    )


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    incident_id = Column(String, ForeignKey("sku_incidents.id"), nullable=False)
    channel = Column(Enum(AlertChannel), nullable=False)
    recipient = Column(String, nullable=False)
    payload = Column(JSON)
    sent_at = Column(DateTime)
    delivered = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    org = relationship("Organization", back_populates="alerts")
    incident = relationship("SkuIncident", back_populates="alerts")

    __table_args__ = (Index("ix_alerts_org", "org_id"),)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String, nullable=False)
    meta_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    org = relationship("Organization", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")

    __table_args__ = (Index("ix_audit_org_time", "org_id", "created_at"),)


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(String, primary_key=True)
    name = Column(Enum(PlanTier), unique=True)
    price_usd = Column(Integer)
    sku_limit = Column(Integer)
    features = Column(JSON)
    stripe_price_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True)
    org_id = Column(String, ForeignKey("organizations.id"), unique=True, nullable=False)
    plan_id = Column(String, ForeignKey("subscription_plans.id"), nullable=False)
    stripe_subscription_id = Column(String, unique=True)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAGING)
    current_period_end = Column(DateTime)
    grace_until = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    org = relationship("Organization", back_populates="subscription")
    plan = relationship("SubscriptionPlan")