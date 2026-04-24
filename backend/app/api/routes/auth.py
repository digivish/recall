from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from uuid import uuid4
from app.db.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.auth_deps import get_current_user
from app.models.init_db import Organization, User
from app.models.auth_schemas import RegisterRequest, LoginRequest, TokenResponse
from app.models.refresh_schemas import RefreshRequest
from app.services.audit import log_action, LOG_REGISTER, LOG_LOGIN

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    org = Organization(id=str(uuid4()), name=body.org_name, slug=body.org_name.lower().replace(" ", "-"))
    db.add(org)
    db.flush()

    user = User(
        id=str(uuid4()),
        email=body.email,
        password_hash=get_password_hash(body.password),
        full_name=body.full_name,
        role="OWNER",
        org_id=org.id,
    )
    db.add(user)
    db.commit()
    db.refresh(org)
    db.refresh(user)

    log_action(db, org.id, LOG_REGISTER, user.id, {"email": body.email})

    access_token = create_access_token({"sub": user.id, "org_id": org.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    log_action(db, user.org_id, LOG_LOGIN, user.id, {})

    access_token = create_access_token({"sub": user.id, "org_id": user.org_id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token({"sub": user.id, "org_id": user.org_id})
    return TokenResponse(access_token=access_token, refresh_token=body.refresh_token)


@router.get("/me")
def get_me(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user info including organization."""
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "org_id": user.org_id,
        "org_name": org.name if org else None,
        "plan_tier": org.plan_tier.value if org and org.plan_tier else None,
    }