"""
LLM matching service using Gemini 3.0 Flash.
Matches SKUs against recall notices.
"""
import json
from typing import Optional

from app.core.config import get_settings
from app.models.init_db import Sku, Recall, SkuIncident, RecallSeverity, IncidentStatus


async def match_with_gemini(sku: dict, recall: dict, api_key: str) -> dict:
    """Use Gemini to match SKU against recall."""
    from google.genai import Client

    client = Client(api_key=api_key)

    prompt = f"""You are a product recall matching system.
Given a product SKU and a recall notice, determine if the SKU matches the recall.
Respond with JSON only.

SKU:
- Name: {sku.get('name', '')}
- Brand: {sku.get('brand', '')}
- Model: {sku.get('model', '')}
- ASIN: {sku.get('asin', '')}

Recall Notice:
- Title: {recall.get('title', '')}
- Product: {recall.get('product_name', '')}
- Issue: {recall.get('hazard_description', '')}
- Manufacturer: {recall.get('issuing_body', '')}

Respond with: {{"match": true/false, "confidence": 0.0-1.0, "reasoning": "brief explanation"}}"""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        result_text = response.text.strip()
        # Parse JSON from response
        if result_text.startswith("```json"):
            result_text = result_text[7:-3]
        elif result_text.startswith("```"):
            result_text = result_text[3:-3]
        result = json.loads(result_text)
        return {
            "match": result.get("match", False),
            "confidence": float(result.get("confidence", 0.0)),
            "reasoning": result.get("reasoning", ""),
        }
    except Exception as e:
        return {"match": False, "confidence": 0.0, "reasoning": f"Error: {str(e)}"}


def rule_based_match(sku: dict, recall: dict) -> dict:
    """Simple rule-based matching."""
    import re

    sku_asin = (sku.get("asin", "") or "").upper().strip()
    sku_upc = (sku.get("upc", "") or "").strip()
    sku_brand = (sku.get("brand", "") or "").lower().strip()
    sku_name = (sku.get("name", "") or "").lower().strip()

    recall_title = (recall.get("title", "") or "").upper()
    recall_product = (recall.get("product_name", "") or "").lower()
    recall_body = (recall.get("issuing_body", "") or "").lower()
    recall_text = (recall.get("title", "") + " " + recall.get("product_name", "")).upper()

    # ASIN
    recall_asins = set(re.findall(r'B[A-Z0-9]{9}', recall_text))
    if sku_asin and sku_asin in recall_asins:
        return {"match": True, "confidence": 0.98, "reasoning": "ASIN match"}

    # UPC
    recall_upcs = set(re.findall(r'\d{12,13}', (recall.get("hazard_description", ""))))
    if sku_upc and any(u in recall_upcs for u in [sku_upc, sku_upc.replace("-", "")]):
        return {"match": True, "confidence": 0.97, "reasoning": "UPC match"}

    # Brand in manufacturer (fuzzy)
    if sku_brand and len(sku_brand) >= 3:
        if sku_brand in recall_body:
            return {"match": True, "confidence": 0.75, "reasoning": f"Brand match: {sku_brand}"}
        # Partial brand in product name (e.g., brand word in product description)
        brand_word = sku_brand.replace(" ", "")
        if brand_word in recall_product.replace(" ", "") or brand_word in recall_body.replace(" ", ""):
            return {"match": True, "confidence": 0.65, "reasoning": "Partial brand match"}

    # Product name words in recall
    if sku_name:
        key_words = [w for w in sku_name.split() if len(w) >= 4][:3]
        matches = sum(1 for w in key_words if w in recall_product or w in recall_title.lower())
        if matches >= 2:
            return {"match": True, "confidence": 0.60, "reasoning": f"Product match ({matches} words)"}

    return {"match": False, "confidence": 0.0, "reasoning": "No match"}


async def match_skus_to_recalls(db, org_id: str, use_llm: bool = False) -> dict:
    """Match SKUs for org against recent critical/amber recalls."""
    from uuid import uuid4
    from datetime import datetime, timedelta
    from app.models.init_db import Recall, RecallSeverity, Sku, SkuIncident, IncidentStatus

    # Get critical/amber recalls (most important)
    recalls = db.query(Recall).filter(
        Recall.severity.in_([RecallSeverity.CRITICAL, RecallSeverity.AMBER])
    ).limit(100).all()
    print(f"Recall query: {len(recalls)} recalls")

    # Get org SKUs 
    skus = db.query(Sku).filter(Sku.org_id == org_id).limit(50).all()
    print(f"SKU query: {len(skus)} SKUs")

    total_matches = 0
    by_severity = {"CRITICAL": 0, "AMBER": 0, "MONITORING": 0}

    for sku in skus:
        sku_dict = {"name": sku.name, "brand": sku.brand, "model": sku.model, "asin": sku.asin, "upc": sku.upc}
        
        for recall in recalls:
            # Fast skip check
            if db.query(SkuIncident).filter(SkuIncident.sku_id == sku.id, SkuIncident.recall_id == recall.id).first():
                continue

            result = rule_based_match(sku_dict, {
                "title": recall.title or "",
                "product_name": recall.product_name or "",
                "issuing_body": recall.issuing_body or "",
                "hazard_description": recall.hazard_description or "",
            })

            if result.get("confidence", 0) < 0.65:
                continue

            incident = SkuIncident(
                id=str(uuid4()),
                sku_id=sku.id,
                recall_id=recall.id,
                org_id=org_id,
                severity=recall.severity,
                status=IncidentStatus.OPEN,
                auto_paused=recall.severity == RecallSeverity.CRITICAL,
                notes={"confidence": result["confidence"], "reasoning": result.get("reasoning", "")},
            )
            db.add(incident)
            total_matches += 1
            by_severity[recall.severity.value] += 1

    db.commit()
    print(f"Matched: {total_matches}")
    return {"matched": total_matches, "by_severity": by_severity}