from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, integrations, catalog, dashboard, recalls, reports, webhooks, matching, scrapers, inventory, shopify_integration, amazon_integration, debug
from app.db.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Recall Hero API",
    description="Automated recall detection and alerting for e-commerce sellers",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["integrations"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["catalog"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(recalls.router, prefix="/api/recalls", tags=["recalls"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["webhooks"])
app.include_router(matching.router, prefix="/api/matching", tags=["matching"])
app.include_router(scrapers.router, prefix="/api/scrapers", tags=["scrapers"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(shopify_integration.router, prefix="/api/integrations/shopify", tags=["shopify"])
app.include_router(amazon_integration.router, prefix="/api/integrations/amazon", tags=["amazon"])
app.include_router(debug.router, prefix="/api/debug", tags=["debug"])
app.include_router(shopify_integration.router, prefix="/api/debug", tags=["debug"])


@app.get("/health")
def health():
    return {"status": "ok"}