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
    """Simple rule-based matching as fallback - prioritizes exact ASIN/UPC matching."""
    sku_asin = (sku.get("asin", "") or "").upper().strip()
    sku_upc = (sku.get("upc", "") or "").strip()
    sku_name = (sku.get("name", "") or "").lower()
    sku_brand = (sku.get("brand", "") or "").lower()

    recall_title = (recall.get("title", "") or "").upper()
    recall_product = (recall.get("product_name", "") or "").lower()
    recall_brand = (recall.get("issuing_body", "") or "").lower()
    recall_hazard = (recall.get("hazard_description", "") or "").lower()

    # Extract identifiers from recall (ASIN, UPC, model numbers)
    # These are often in structured fields or embedded in title
    recall_text = (recall.get("title", "") + " " + recall.get("product_name", "") + " " + recall.get("hazard_description", "")).upper()

    # ASIN pattern: B00XXXXXXX (Amazon Standard Item Number)
    import re
    asin_pattern = r'B[A-Z0-9]{9}'
    recall_asins = set(re.findall(asin_pattern, recall_text))

    # UPC/EAN pattern: 12-13 digit codes
    upc_pattern = r'\d{12,13}'
    recall_upcs = set(re.findall(upc_pattern, recall_text))

    # 1. EXACT ASIN MATCH (highest confidence)
    if sku_asin and sku_asin in recall_asins:
        return {"match": True, "confidence": 0.98, "reasoning": f"Exact ASIN match: {sku_asin}"}

    # 2. EXACT UPC MATCH
    if sku_upc and any(u in recall_upcs for u in [sku_upc, sku_upc.replace("-", "")]):
        return {"match": True, "confidence": 0.97, "reasoning": "Exact UPC match"}

    # 3. ASIN in recall text (partial confidence)
    if sku_asin and sku_asin in recall_text:
        return {"match": True, "confidence": 0.85, "reasoning": f"ASIN found in recall: {sku_asin}"}

    # Check brand overlap (partial match)
    brand_match = sku_brand and (sku_brand in recall_brand or recall_brand in sku_brand)

    # Check product name in title (partial match)
    product_match = sku_name and (any(w in recall_title.lower() for w in sku_name.split()[:3]) or any(w in sku_name.split()[:3] for w in recall_product.split()[:3]))

    # Check hazard keywords
    hazard_keywords = ["salmonella", "fire", "hazard", "contamination", "burn", "injury"]
    hazard_match = any(kw in recall_hazard or kw in recall_title.lower() for kw in hazard_keywords)

    if brand_match and product_match:
        return {"match": True, "confidence": 0.80, "reasoning": "Brand + product name match"}
    elif brand_match:
        return {"match": True, "confidence": 0.65, "reasoning": "Brand name match"}
    elif hazard_match and sku_brand:
        return {"match": True, "confidence": 0.55, "reasoning": "Hazard keyword + brand match"}
    else:
        return {"match": False, "confidence": 0.0, "reasoning": "No match"}


async def match_skus_to_recalls(db, org_id: str, use_llm: bool = False) -> dict:
    """Match all SKUs for an org against all recalls."""
    from uuid import uuid4

    settings = get_settings()
    api_key = settings.GEMINI_API_KEY

    # Get all unresolved recalls
    recalls = db.query(Recall).all()

    # Get all SKUs for org
    skus = db.query(Sku).filter(Sku.org_id == org_id).all()

    total_matches = 0
    by_severity = {"CRITICAL": 0, "AMBER": 0, "MONITORING": 0}

    for sku in skus:
        for recall in recalls:
            # Check if already matched
            existing = db.query(SkuIncident).filter(
                SkuIncident.sku_id == sku.id,
                SkuIncident.recall_id == recall.id,
            ).first()
            if existing:
                continue

            sku_dict = {"name": sku.name, "brand": sku.brand, "model": sku.model, "asin": sku.asin, "upc": sku.upc}
            recall_dict = {
                "title": recall.title,
                "product_name": recall.product_name,
                "issuing_body": recall.issuing_body,
                "hazard_description": recall.hazard_description,
            }

            # Match
            if use_llm and api_key:
                result = await match_with_gemini(sku_dict, recall_dict, api_key)
            else:
                result = rule_based_match(sku_dict, recall_dict)

            confidence = result.get("confidence", 0.0)
            if confidence < 0.50:
                continue

            # Determine severity
            if confidence >= 0.85:
                severity = RecallSeverity.CRITICAL
            elif confidence >= 0.65:
                severity = RecallSeverity.AMBER
            else:
                severity = RecallSeverity.MONITORING

            # Create incident
            incident = SkuIncident(
                id=str(uuid4()),
                sku_id=sku.id,
                recall_id=recall.id,
                org_id=org_id,
                severity=severity,
                status=IncidentStatus.OPEN,
                auto_paused=severity == RecallSeverity.CRITICAL,
                notes=json.dumps({"confidence": confidence, "reasoning": result.get("reasoning", "")}),
            )
            db.add(incident)
            total_matches += 1
            by_severity[severity.value] += 1

    db.commit()
    return {"matched": total_matches, "by_severity": by_severity}