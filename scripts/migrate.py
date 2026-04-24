#!/usr/bin/env python3
"""
Run this ONCE to create all tables in PostgreSQL.
Usage: python scripts/migrate.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pg8000

conn_params = {
    "host": "10.0.0.5",
    "port": 5432,
    "database": "nestor",
    "user": "kord",
    "password": "K0rdi5l0rD",
}

conn = pg8000.connect(**conn_params)
cur = conn.cursor()

TABLES = [
    """
    CREATE TABLE IF NOT EXISTS organizations (
        id          VARCHAR(64) PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        slug        VARCHAR(255) UNIQUE NOT NULL,
        plan_tier   VARCHAR(32)  NOT NULL DEFAULT 'FREE',
        stripe_customer_id VARCHAR(255) UNIQUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS users (
        id            VARCHAR(64) PRIMARY KEY,
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name    VARCHAR(255) NOT NULL,
        role        VARCHAR(16) NOT NULL DEFAULT 'MEMBER',
        org_id       VARCHAR(64) NOT NULL REFERENCES organizations(id),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_users_org_id ON users(org_id);
    """,
    """
    CREATE TABLE IF NOT EXISTS integrations (
        id          VARCHAR(64) PRIMARY KEY,
        org_id      VARCHAR(64) NOT NULL REFERENCES organizations(id),
        type        VARCHAR(32) NOT NULL,
        credentials JSONB,
        status     VARCHAR(32) NOT NULL DEFAULT 'DISCONNECTED',
        connected_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_integrations_org_id ON integrations(org_id);
    """,
    """
    CREATE TABLE IF NOT EXISTS skus (
        id          VARCHAR(64) PRIMARY KEY,
        org_id      VARCHAR(64) NOT NULL REFERENCES organizations(id),
        asin        VARCHAR(64),
        upc        VARCHAR(64),
        ean        VARCHAR(64),
        brand      VARCHAR(255),
        model      VARCHAR(255),
        name       VARCHAR(255) NOT NULL,
        source    VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(org_id, asin)
    );
    CREATE INDEX IF NOT EXISTS ix_skus_org_id ON skus(org_id);
    """,
    """
    CREATE TABLE IF NOT EXISTS recall_sources (
        id          VARCHAR(64) PRIMARY KEY,
        source_name VARCHAR(32) NOT NULL,
        base_url   VARCHAR(512) NOT NULL,
        api_key   VARCHAR(255),
        last_fetched TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS recalls (
        id                  VARCHAR(64) PRIMARY KEY,
        source_id           VARCHAR(64) NOT NULL REFERENCES recall_sources(id),
        external_id        VARCHAR(128) NOT NULL,
        title             VARCHAR(512) NOT NULL,
        source_url        VARCHAR(1024),
        issuing_body      VARCHAR(255),
        product_name     VARCHAR(255),
        hazard_description TEXT,
        category        VARCHAR(255),
        severity       VARCHAR(32),
        recommended_action TEXT,
        published_at    TIMESTAMPTZ,
        raw_json       JSONB,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(source_id, external_id)
    );
    CREATE INDEX IF NOT EXISTS ix_recalls_source_id ON recalls(source_id);
    CREATE INDEX IF NOT EXISTS ix_recalls_published ON recalls(published_at);
    """,
    """
    CREATE TABLE IF NOT EXISTS sku_incidents (
        id              VARCHAR(64) PRIMARY KEY,
        sku_id          VARCHAR(64) NOT NULL REFERENCES skus(id),
        recall_id      VARCHAR(64) NOT NULL REFERENCES recalls(id),
        org_id         VARCHAR(64) NOT NULL REFERENCES organizations(id),
        severity      VARCHAR(32) NOT NULL,
        status        VARCHAR(32) NOT NULL DEFAULT 'OPEN',
        auto_paused   BOOLEAN NOT NULL DEFAULT FALSE,
        acknowledged_at TIMESTAMPTZ,
        resolved_at   TIMESTAMPTZ,
        resolved_by_id VARCHAR(64) REFERENCES users(id),
        notes         TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(sku_id, recall_id)
    );
    CREATE INDEX IF NOT EXISTS ix_incidents_org_sev ON sku_incidents(org_id, severity, status);
    CREATE INDEX IF NOT EXISTS ix_incidents_sku ON sku_incidents(sku_id);
    """,
    """
    CREATE TABLE IF NOT EXISTS alerts (
        id          VARCHAR(64) PRIMARY KEY,
        org_id     VARCHAR(64) NOT NULL REFERENCES organizations(id),
        incident_id VARCHAR(64) NOT NULL REFERENCES sku_incidents(id),
        channel    VARCHAR(16) NOT NULL,
        recipient  VARCHAR(255) NOT NULL,
        payload   JSONB,
        sent_at   TIMESTAMPTZ,
        delivered BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_alerts_org ON alerts(org_id);
    """,
    """
    CREATE TABLE IF NOT EXISTS audit_logs (
        id          VARCHAR(64) PRIMARY KEY,
        org_id     VARCHAR(64) NOT NULL REFERENCES organizations(id),
        user_id    VARCHAR(64) REFERENCES users(id),
        action     VARCHAR(128) NOT NULL,
        metadata   JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_audit_org_time ON audit_logs(org_id, created_at DESC);
    """,
    """
    CREATE TABLE IF NOT EXISTS subscription_plans (
        id              VARCHAR(64) PRIMARY KEY,
        name           VARCHAR(32) UNIQUE NOT NULL,
        price_usd      INTEGER,
        sku_limit      INTEGER,
        features      JSONB,
        stripe_price_id VARCHAR(255),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS subscriptions (
        id          VARCHAR(64) PRIMARY KEY,
        org_id      VARCHAR(64) UNIQUE NOT NULL REFERENCES organizations(id),
        plan_id    VARCHAR(64) NOT NULL REFERENCES subscription_plans(id),
        stripe_subscription_id VARCHAR(255) UNIQUE,
        status     VARCHAR(32) NOT NULL DEFAULT 'TRIAGING',
        current_period_end TIMESTAMPTZ,
        grace_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
]

def main():
    print("Creating tables...")
    for sql in TABLES:
        cur.execute(sql)
    conn.commit()
    print(f"  ✓ {len(TABLES)} tables created/verified")

    # Seed subscription plans
    PLANS = [
        ("FREE", 0, 0, ["Email Alerts"], None),
        ("STANDARD", 9900, 500, ["FDA & CPSC Monitoring", "Email Alerts"], None),
        ("PROFESSIONAL", 29900, 5000, ["Real-Time Feeds", "SMS Alerts", "Health Canada", "Slack Integration"], None),
        ("ENTERPRISE", 99900, -1, ["Unlimited ASINs", "Custom Webhooks", "Dedicated Compliance Officer", "White-labeled Reporting"], None),
    ]

    cur.execute("SELECT COUNT(*) FROM subscription_plans;")
    existing = cur.fetchone()[0]
    if existing == 0:
        for name, price, limit, features, stripe_id in PLANS:
            import json
            cur.execute(
                "INSERT INTO subscription_plans (id, name, price_usd, sku_limit, features, stripe_price_id) VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s);",
                [name, price, limit, json.dumps(features), stripe_id],
            )
        conn.commit()
        print(f"  ✓ {len(PLANS)} subscription plans seeded")
    else:
        print("  ✓ subscription plans already exist")

    # Seed recall sources
    SOURCES = [
        ("HEALTH_CANADA", "recalls-rappels.canada.ca/sites/default/files/opendata-donneesouvertes/HCRSAMOpenData.json"),
        ("CPSC", "www.saferproducts.gov/RestWebServices/Recall?format=json"),
        ("FDA_FOOD", "api.fda.gov/food/enforcement.json"),
        ("FDA_DRUG", "api.fda.gov/drug/enforcement.json"),
        ("FDA_DEVICE", "api.fda.gov/device/enforcement.json"),
    ]

    cur.execute("SELECT COUNT(*) FROM recall_sources;")
    existing = cur.fetchone()[0]
    if existing == 0:
        for name, url in SOURCES:
            cur.execute(
                "INSERT INTO recall_sources (id, source_name, base_url) VALUES (gen_random_uuid()::text, %s, %s);",
                [name, url],
            )
        conn.commit()
        print(f"  ✓ {len(SOURCES)} recall sources seeded")
    else:
        print("  ✓ recall sources already exist")

    print("\nMigration complete.")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()