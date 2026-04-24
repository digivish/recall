from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.auth_deps import get_current_user, get_org_id
from app.models.init_db import Sku

router = APIRouter()


@router.delete("/skus")
def delete_all_skus(
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
    user=Depends(get_current_user),
):
    """Delete all SKUs for this org - for testing only."""
    count = db.query(Sku).filter(Sku.org_id == org_id).delete()
    db.commit()
    return {"deleted": count}