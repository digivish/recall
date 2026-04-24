#!/usr/bin/env python3
"""
Seed mock data for testing.
Usage: python scripts/seed.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pg8000
from uuid import uuid4
from datetime import datetime, timedelta
import json


def main():
    conn = pg8000.connect(host='10.0.0.5', port=5432, database='nestor', user='kord', password='K0rdi5l0rD')
    cur = conn.cursor()

    print("Seeding mock data...")

    # Create organization
    org_id = str(uuid4())
    cur.execute(
        "INSERT INTO organizations (id, name, slug, plan_tier, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s)",
        [org_id, "Demo Corp", "demo-corp", "PROFESSIONAL", datetime.utcnow(), datetime.utcnow()]
    )
    print(f"  ✓ Organization: Demo Corp")

    # Create user
    user_id = str(uuid4())
    cur.execute(
        "INSERT INTO users (id, email, password_hash, full_name, role, org_id, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        [user_id, "demo@recall.example.com", "$2b$12$dummyhash", "Demo User", "OWNER", org_id, datetime.utcnow(), datetime.utcnow()]
    )
    print(f"  ✓ User: demo@recall.example.com")

    # Create integrations
    int_amazon = str(uuid4())
    cur.execute(
        "INSERT INTO integrations (id, org_id, type, credentials, status, connected_at, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        [int_amazon, org_id, "AMAZON_SP_API", json.dumps({"seller_id": "A123456", "sku_count": 50}), "CONNECTED", datetime.utcnow(), datetime.utcnow(), datetime.utcnow()]
    )
    int_shopify = str(uuid4())
    cur.execute(
        "INSERT INTO integrations (id, org_id, type, credentials, status, connected_at, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        [int_shopify, org_id, "SHOPIFY", json.dumps({"store": "demo.myshopify.com", "product_count": 25}), "CONNECTED", datetime.utcnow(), datetime.utcnow(), datetime.utcnow()]
    )
    print(f"  ✓ Integrations: Amazon, Shopify")

    # Create SKUs
    sku_ids = []
    for i in range(1, 21):
        sku_id = str(uuid4())
        asin = f"B00{i:06d}"
        cur.execute(
            "INSERT INTO skus (id, org_id, asin, upc, name, brand, source, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            [sku_id, org_id, asin, f"{999999999999 + i:012d}", f"Demo Product {i}", "DemoBrand", "AMAZON_SP_API", datetime.utcnow(), datetime.utcnow()]
        )
        sku_ids.append(sku_id)
    print(f"  ✓ SKUs: {len(sku_ids)} products")

    # Get recall sources
    cur.execute("SELECT id, source_name FROM recall_sources;")
    sources = cur.fetchall()
    source_map = {s[1]: s[0] for s in sources}

    # Create recalls
    recall_ids = []
    recall_data = [
        ("FDA-2024-001", source_map.get("FDA_FOOD"), "Class I", "Organic Almonds recalled due to Salmonella", "Organic Almonds", "Salmonella contamination in batch A123"),
        ("FDA-2024-002", source_map.get("FDA_FOOD"), "Class II", "Chocolate Chip Cookies - Undeclared Milk", "Chocolate Chip Cookies", "Milk allergen not declared"),
        ("CPSC-2024-001", source_map.get("CPSC"), "Type I", "Breez Fan - Fire Hazard", "Breez 2-in-1 Smart Fan", "Fire hazard - overheating"),
        ("HC-2024-001", source_map.get("HEALTH_CANADA"), "Class 2", "Pistachios - Salmonella", "Raw Pistachios", "Salmonella contamination"),
    ]
    for ext_id, src_id, severity, title, product, hazard in recall_data:
        recall_id = str(uuid4())
        cur.execute(
            "INSERT INTO recalls (id, source_id, external_id, title, issuing_body, product_name, hazard_description, severity, published_at, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            [recall_id, src_id, ext_id, title, "Demo Manufacturer", product, hazard, severity, datetime.utcnow() - timedelta(days=5), datetime.utcnow(), datetime.utcnow()]
        )
        recall_ids.append(recall_id)
    print(f"  ✓ Recalls: {len(recall_ids)} recall notices")

    # Create incidents (match some SKUs to recalls) - save IDs
    incident_ids = []
    incident_data = [
        (sku_ids[0], recall_ids[0], "CRITICAL"),  # Demo Product 1 matches recall 1
        (sku_ids[1], recall_ids[2], "AMBER"),    # Demo Product 2 matches recall 3
        (sku_ids[5], recall_ids[1], "MONITORING"), # Demo Product 6 matches recall 2
    ]
    for sku_id, recall_id, severity in incident_data:
        inc_id = str(uuid4())
        cur.execute(
            "INSERT INTO sku_incidents (id, sku_id, recall_id, org_id, severity, status, auto_paused, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            [inc_id, sku_id, recall_id, org_id, severity, "OPEN", severity == "CRITICAL", datetime.utcnow(), datetime.utcnow()]
        )
        incident_ids.append(inc_id)
    conn.commit()
    print(f"  ✓ Incidents: {len(incident_ids)} matched")

    # Create alerts - use actual incident IDs
    for inc_id in incident_ids:
        alert_id = str(uuid4())
        cur.execute(
            "INSERT INTO alerts (id, org_id, incident_id, channel, recipient, payload, sent_at, delivered, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            [alert_id, org_id, inc_id, "EMAIL", "demo@recall.example.com", json.dumps({"test": True}), datetime.utcnow(), True, datetime.utcnow()]
        )
    print(f"  ✓ Alerts: 2 sent")

    # Create audit logs - use correct column name
    actions = ["user.register", "integration.connect", "catalog.import", "match.run"]
    for action in actions:
        log_id = str(uuid4())
        cur.execute(
            "INSERT INTO audit_logs (id, org_id, user_id, action, metadata, created_at) VALUES (%s, %s, %s, %s, %s, %s)",
            [log_id, org_id, user_id, action, json.dumps({"test": True}), datetime.utcnow()]
        )
    print(f"  ✓ Audit logs: {len(actions)} entries")

    conn.commit()
    print("\n✓ Mock data seeded successfully!")
    print(f"\nTest credentials:")
    print(f"  Email: demo@recall.example.com")
    print(f"  Password: password123")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()