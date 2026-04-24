#!/usr/bin/env python3
"""
Cron script for fetching recall feeds.
Usage: python scripts/fetch_recalls.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import asyncio
from app.db.database import SessionLocal
from app.services.scraper import fetch_all_sources
from app.services.audit import log_action, LOG_FEED_FETCH


def main():
    print("Fetching recall feeds...")
    db = SessionLocal()
    try:
        results = asyncio.run(fetch_all_sources(db))
        print(f"  Total: {results['total']}")
        for source, data in results.get("by_source", {}).items():
            print(f"  {source}: {data.get('fetched', 0)} fetched, {data.get('added', 0)} new")
        log_action(db, "system", LOG_FEED_FETCH, None, results)
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    main()