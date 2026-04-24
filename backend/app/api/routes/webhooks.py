from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.auth_deps import get_org_id
from app.models.init_db import Organization, Subscription, SubscriptionStatus, SubscriptionPlan, PlanTier

router = APIRouter()
import stripe


@router.post("/stripe")
async def handle_stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhooks."""
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "customer.subscription.created":
        sub_data = event["data"]["object"]
        await handle_subscription_change(db, sub_data, "created")

    elif event["type"] == "customer.subscription.updated":
        sub_data = event["data"]["object"]
        await handle_subscription_change(db, sub_data, "updated")

    elif event["type"] == "customer.subscription.deleted":
        sub_data = event["data"]["object"]
        await handle_subscription_change(db, sub_data, "deleted")

    elif event["type"] == "invoice.payment_succeeded":
        invoice = event["data"]["object"]
        await handle_payment_success(db, invoice)

    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        await handle_payment_failed(db, invoice)

    return {"status": "received"}


async def handle_subscription_change(db: Session, sub_data: dict, action: str):
    """Handle subscription created/updated/deleted."""
    stripe_sub_id = sub_data.get("id")
    customer_id = sub_data.get("customer")
    status = sub_data.get("status")

    if not customer_id:
        return

    org = db.query(Organization).filter(
        Organization.stripe_customer_id == customer_id
    ).first()
    if not org:
        return

    # Find or create subscription
    subscription = db.query(Subscription).filter(
        Subscription.org_id == org.id
    ).first()

    # Map status
    if status == "active":
        db_status = SubscriptionStatus.ACTIVE
    elif status == "past_due":
        db_status = SubscriptionStatus.PAST_DUE
    elif status == "canceled":
        db_status = SubscriptionStatus.CANCELED
    else:
        db_status = SubscriptionStatus.TRIAGING

    # Get plan
    plan_id = sub_data.get("plan", {}).get("id")
    plan = None
    if plan_id:
        plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.stripe_price_id == plan_id
        ).first()

    from datetime import datetime
    from dateutil import parser

    period_end = sub_data.get("current_period_end")
    period_end_dt = parser.parse(period_end) if period_end else None

    if subscription:
        subscription.status = db_status
        subscription.stripe_subscription_id = stripe_sub_id
        if plan:
            subscription.plan_id = plan.id
        if period_end_dt:
            subscription.current_period_end = period_end_dt
    else:
        from uuid import uuid4
        subscription = Subscription(
            id=str(uuid4()),
            org_id=org.id,
            plan_id=plan.id if plan else None,
            stripe_subscription_id=stripe_sub_id,
            status=db_status,
            current_period_end=period_end_dt,
        )
        db.add(subscription)

    db.commit()


async def handle_payment_success(db: Session, invoice: dict):
    """Handle successful payment."""
    customer_id = invoice.get("customer")
    if not customer_id:
        return

    org = db.query(Organization).filter(
        Organization.stripe_customer_id == customer_id
    ).first()
    if not org:
        return

    subscription = db.query(Subscription).filter(
        Subscription.org_id == org.id
    ).first()
    if subscription:
        from dateutil import parser
        period_end = invoice.get("period_end")
        if period_end:
            subscription.current_period_end = parser.parse(period_end)
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.grace_until = None
        db.commit()


async def handle_payment_failed(db: Session, invoice: dict):
    """Handle failed payment."""
    customer_id = invoice.get("customer")
    if not customer_id:
        return

    org = db.query(Organization).filter(
        Organization.stripe_customer_id == customer_id
    ).first()
    if not org:
        return

    subscription = db.query(Subscription).filter(
        Subscription.org_id == org.id
    ).first()
    if subscription:
        from datetime import datetime, timedelta
        subscription.status = SubscriptionStatus.PAST_DUE
        subscription.grace_until = datetime.utcnow() + timedelta(days=7)
        db.commit()


@router.post("/create-checkout")
def create_checkout_session(
    plan: str,
    db: Session = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    """Create Stripe checkout session."""
    from app.core.config import get_settings
    from app.models.init_db import PlanTier

    settings = get_settings()
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    stripe.api_key = settings.STRIPE_SECRET_KEY

    # Map plan tier
    tier_map = {
        "standard": PlanTier.STANDARD,
        "professional": PlanTier.PROFESSIONAL,
        "enterprise": PlanTier.ENTERPRISE,
    }
    plan_tier = tier_map.get(plan.lower())
    if not plan_tier:
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan_record = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.name == plan_tier
    ).first()
    if not plan_record or not plan_record.stripe_price_id:
        raise HTTPException(status_code=400, detail="Plan not configured")

    org = db.query(Organization).filter(Organization.id == org_id).first()

    session = stripe.checkout.Session.create(
        customer=org.stripe_customer_id if org.stripe_customer_id else None,
        payment_method_types=["card"],
        line_items=[
            {
                "price": plan_record.stripe_price_id,
                "quantity": 1,
            }
        ],
        mode="subscription",
        success_url="https://recall.example.com/dashboard?success=true",
        cancel_url="https://recall.example.com/dashboard?canceled=true",
        metadata={"org_id": org_id},
    )

    return {"url": session.url}