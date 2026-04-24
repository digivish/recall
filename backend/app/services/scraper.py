"""
Recall feed scraper service.
Fetches from Health Canada, CPSC, and FDA open data sources.
"""
import json
import httpx
from datetime import datetime
from typing import Optional
from uuid import uuid4

from app.models.init_db import RecallSource, SourceName, Recall, RecallSeverity


async def fetch_health_canada(db, source: RecallSource) -> list[dict]:
    """Fetch Health Canada recalls."""
    url = "https://recalls-rappels.canada.ca/sites/default/files/opendata-donneesouvertes/HCRSAMOpenData.json"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    recalls = []
    for item in data:
        if item.get("Archived") == "1":
            continue
        severity = _map_severity(item.get("Recall class", ""))
        recalls.append({
            "external_id": f"HC-{item.get('NID', '')}",
            "title": item.get("Title", ""),
            "source_url": item.get("URL", ""),
            "issuing_body": item.get("Organization", ""),
            "product_name": item.get("Product", ""),
            "hazard_description": item.get("Issue", ""),
            "category": item.get("Category", ""),
            "severity": severity,
            "recommended_action": item.get("What you should do", ""),
            "published_at": item.get("Last updated", ""),
            "raw_json": item,
        })
    return recalls


async def fetch_cpsc(db, source: RecallSource) -> list[dict]:
    """Fetch CPSC recalls."""
    url = "https://www.saferproducts.gov/RestWebServices/Recall?format=json"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    recalls = []
    for item in data:
        severity = _map_severity(item.get("RecallRecallsClass", ""))
        recalls.append({
            "external_id": f"CPSC-{item.get('RecallID', '')}",
            "title": item.get("Title", ""),
            "source_url": item.get("URL", ""),
            "issuing_body": item.get("ManufacturerName", ""),
            "product_name": item.get("ProductName", ""),
            "hazard_description": item.get("Hazard", ""),
            "category": item.get("ProductType", ""),
            "severity": severity,
            "recommended_action": item.get("Remedy", ""),
            "published_at": item.get("RecallDate", ""),
            "raw_json": item,
        })
    return recalls


async def fetch_fda_food(db, source: RecallSource) -> list[dict]:
    """Fetch FDA food enforcement reports."""
    url = "https://api.fda.gov/food/enforcement.json?limit=100"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    recalls = []
    for item in data.get("results", []):
        severity = _map_severity(item.get("classification", ""))
        recalls.append({
            "external_id": f"FDA-{item.get('recall_number', '')}",
            "title": item.get("product_description", "")[:500],
            "source_url": f"https://www.fda.gov/recalls/{item.get('recall_number', '')}",
            "issuing_body": item.get("firm_name", ""),
            "product_name": item.get("product_description", "")[:255],
            "hazard_description": item.get("reason_for_recall", ""),
            "category": item.get("product_type", ""),
            "severity": severity,
            "recommended_action": item.get("consumer_comment", ""),
            "published_at": item.get("recall_initiation_date", ""),
            "raw_json": item,
        })
    return recalls


def _map_severity(classification: str) -> RecallSeverity:
    """Map source severity to canonical severity."""
    classification = (classification or "").upper()
    if "CLASS I" in classification or "1" in classification:
        return RecallSeverity.CRITICAL
    elif "CLASS II" in classification or "2" in classification:
        return RecallSeverity.AMBER
    else:
        return RecallSeverity.MONITORING


def parse_date(date_str: str) -> Optional[datetime]:
    """Parse various date formats."""
    if not date_str:
        return None
    for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d"]:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


async def fetch_all_sources(db) -> dict:
    """Fetch from all configured recall sources."""
    sources = db.query(RecallSource).all()
    results = {"total": 0, "by_source": {}}

    for source in sources:
        if source.source_name == SourceName.HEALTH_CANADA:
            recalls = await fetch_health_canada(db, source)
        elif source.source_name == SourceName.CPSC:
            recalls = await fetch_cpsc(db, source)
        elif source.source_name == SourceName.FDA_FOOD:
            recalls = await fetch_fda_food(db, source)
        else:
            continue

        # Upsert recalls
        added = 0
        for rec in recalls:
            existing = db.query(Recall).filter(
                Recall.source_id == source.id,
                Recall.external_id == rec["external_id"],
            ).first()

            if existing:
                existing.title = rec["title"]
                existing.hazard_description = rec["hazard_description"]
                existing.severity = rec["severity"]
            else:
                recall = Recall(
                    id=str(uuid4()),
                    source_id=source.id,
                    external_id=rec["external_id"],
                    title=rec["title"],
                    source_url=rec["source_url"],
                    issuing_body=rec["issuing_body"],
                    product_name=rec["product_name"],
                    hazard_description=rec["hazard_description"],
                    category=rec["category"],
                    severity=rec["severity"],
                    recommended_action=rec["recommended_action"],
                    published_at=parse_date(rec["published_at"]),
                    raw_json=rec["raw_json"],
                )
                db.add(recall)
                added += 1

        source.last_fetched = datetime.utcnow()
        db.commit()
        results["by_source"][source.source_name.value] = {"fetched": len(recalls), "added": added}
        results["total"] += len(recalls)

    return results