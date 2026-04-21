"""Billing API router."""

from datetime import datetime, timezone
import uuid
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from core.database import get_db
from core.security import get_current_user
from models.billing import BillingRecord, BillingRecordType, UserBalance, ActivityLog
from models.user import User, UserRole
from models.media import Media

router = APIRouter()


class BillingRecordResponse(BaseModel):
    """Billing record response model."""
    id: str
    record_type: str
    description: str
    amount_usd: float
    media_id: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: str

    class Config:
        from_attributes = True


class BalanceResponse(BaseModel):
    """User balance response model."""
    user_id: str
    balance_usd: float
    total_costs_usd: float
    total_payments_usd: float
    total_images_generated: int
    total_ai_trainings: int
    last_updated_at: str


class BillingSummaryResponse(BaseModel):
    """Billing summary response."""
    user: dict
    balance: BalanceResponse
    recent_records: List[BillingRecordResponse]
    period_costs: float
    period_payments: float


class CreatePaymentRequest(BaseModel):
    """Request to record a payment (admin only)."""
    user_id: str
    amount_usd: float
    description: str
    metadata: Optional[dict] = None


class CreateAdjustmentRequest(BaseModel):
    """Request to create a billing adjustment (admin only)."""
    user_id: str
    amount_usd: float
    description: str
    metadata: Optional[dict] = None


def _record_to_response(record: BillingRecord) -> BillingRecordResponse:
    """Convert billing record to response."""
    return BillingRecordResponse(
        id=str(record.id),
        record_type=record.record_type.value if hasattr(record.record_type, "value") else str(record.record_type),
        description=record.description,
        amount_usd=float(record.amount_usd),
        media_id=str(record.media_id) if record.media_id else None,
        metadata=record.metadata,
        created_at=record.created_at.isoformat(),
    )


def _balance_to_response(balance: UserBalance) -> BalanceResponse:
    """Convert user balance to response."""
    return BalanceResponse(
        user_id=str(balance.user_id),
        balance_usd=float(balance.balance_usd),
        total_costs_usd=float(balance.total_costs_usd),
        total_payments_usd=float(balance.total_payments_usd),
        total_images_generated=balance.total_images_generated,
        total_ai_trainings=balance.total_ai_trainings,
        last_updated_at=balance.last_updated_at.isoformat(),
    )


def get_or_create_balance(db: Session, user_id: uuid.UUID) -> UserBalance:
    """Get or create a user balance record."""
    balance = db.query(UserBalance).filter(UserBalance.user_id == user_id).first()
    if not balance:
        balance = UserBalance(user_id=user_id)
        db.add(balance)
        db.commit()
        db.refresh(balance)
    return balance


def update_balance(db: Session, user_id: uuid.UUID):
    """Recalculate and update user balance from billing records."""
    balance = get_or_create_balance(db, user_id)
    
    # Calculate totals from records
    costs = db.query(func.sum(BillingRecord.amount_usd)).filter(
        BillingRecord.user_id == user_id,
        BillingRecord.amount_usd > 0
    ).scalar() or Decimal(0)
    
    payments = db.query(func.sum(func.abs(BillingRecord.amount_usd))).filter(
        BillingRecord.user_id == user_id,
        BillingRecord.amount_usd < 0
    ).scalar() or Decimal(0)
    
    image_count = db.query(BillingRecord).filter(
        BillingRecord.user_id == user_id,
        BillingRecord.record_type == BillingRecordType.IMAGE_GENERATION
    ).count()
    
    training_count = db.query(BillingRecord).filter(
        BillingRecord.user_id == user_id,
        BillingRecord.record_type == BillingRecordType.AI_TRAINING
    ).count()
    
    balance.total_costs_usd = float(costs)
    balance.total_payments_usd = float(payments)
    balance.balance_usd = float(payments - costs)  # Positive means credit, negative means owes
    balance.total_images_generated = image_count
    balance.total_ai_trainings = training_count
    balance.last_updated_at = datetime.now(timezone.utc)
    
    db.commit()
    return balance


@router.get("/my-balance", response_model=BalanceResponse)
async def get_my_balance(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's balance."""
    user_id = uuid.UUID(current_user["id"])
    balance = get_or_create_balance(db, user_id)
    return _balance_to_response(balance)


@router.get("/my-records", response_model=List[BillingRecordResponse])
async def get_my_records(
    skip: int = 0,
    limit: int = 50,
    record_type: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's billing records."""
    user_id = uuid.UUID(current_user["id"])
    
    query = db.query(BillingRecord).filter(BillingRecord.user_id == user_id)
    
    if record_type:
        try:
            rt = BillingRecordType(record_type)
            query = query.filter(BillingRecord.record_type == rt)
        except ValueError:
            pass
    
    records = query.order_by(BillingRecord.created_at.desc()).offset(skip).limit(limit).all()
    return [_record_to_response(r) for r in records]


# --- Admin endpoints ---

@router.get("/users/{user_id}/summary", response_model=BillingSummaryResponse)
async def get_user_billing_summary(
    user_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get billing summary for a specific user (admin only)."""
    admin = db.get(User, uuid.UUID(current_user["id"]))
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    target_user = db.get(User, uuid.UUID(user_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    balance = update_balance(db, target_user.id)
    
    records = db.query(BillingRecord).filter(
        BillingRecord.user_id == target_user.id
    ).order_by(BillingRecord.created_at.desc()).limit(20).all()
    
    return BillingSummaryResponse(
        user={
            "id": str(target_user.id),
            "email": target_user.email,
            "name": target_user.name,
            "role": target_user.role.value,
        },
        balance=_balance_to_response(balance),
        recent_records=[_record_to_response(r) for r in records],
        period_costs=float(balance.total_costs_usd),
        period_payments=float(balance.total_payments_usd),
    )


@router.get("/all-balances", response_model=List[dict])
async def get_all_balances(
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all user balances (super admin only)."""
    admin = db.get(User, uuid.UUID(current_user["id"]))
    if not admin or admin.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Solo Super Admin")
    
    balances = db.query(UserBalance).join(User).order_by(
        UserBalance.balance_usd.asc()
    ).offset(skip).limit(limit).all()
    
    result = []
    for balance in balances:
        user = db.get(User, balance.user_id)
        result.append({
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
            },
            "balance": _balance_to_response(balance),
        })
    
    return result


@router.post("/record-payment", status_code=status.HTTP_201_CREATED)
async def record_payment(
    data: CreatePaymentRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a payment from a user (admin only)."""
    admin = db.get(User, uuid.UUID(current_user["id"]))
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    target_user = db.get(User, uuid.UUID(data.user_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    record = BillingRecord(
        user_id=target_user.id,
        studio_id=target_user.studio_id,
        record_type=BillingRecordType.PAYMENT,
        description=data.description,
        amount_usd=-abs(data.amount_usd),  # Payments are negative (credit)
        created_by_id=admin.id,
        metadata=data.metadata,
    )
    db.add(record)
    db.commit()
    
    update_balance(db, target_user.id)
    
    return _record_to_response(record)


@router.post("/record-adjustment", status_code=status.HTTP_201_CREATED)
async def record_adjustment(
    data: CreateAdjustmentRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a billing adjustment (super admin only)."""
    admin = db.get(User, uuid.UUID(current_user["id"]))
    if not admin or admin.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Solo Super Admin")
    
    target_user = db.get(User, uuid.UUID(data.user_id))
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    record = BillingRecord(
        user_id=target_user.id,
        studio_id=target_user.studio_id,
        record_type=BillingRecordType.ADJUSTMENT,
        description=data.description,
        amount_usd=data.amount_usd,
        created_by_id=admin.id,
        metadata=data.metadata,
    )
    db.add(record)
    db.commit()
    
    update_balance(db, target_user.id)
    
    return _record_to_response(record)


# --- Activity log endpoints (super admin only) ---

@router.get("/activity-log", response_model=List[dict])
async def get_activity_log(
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get platform activity log (super admin only)."""
    admin = db.get(User, uuid.UUID(current_user["id"]))
    if not admin or admin.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Solo Super Admin")
    
    query = db.query(ActivityLog)
    
    if action:
        query = query.filter(ActivityLog.action == action)
    
    if user_id:
        query = query.filter(ActivityLog.user_id == uuid.UUID(user_id))
    
    logs = query.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return [{
        "id": str(log.id),
        "user_id": str(log.user_id) if log.user_id else None,
        "action": log.action,
        "resource_type": log.resource_type,
        "resource_id": str(log.resource_id) if log.resource_id else None,
        "old_value": log.old_value,
        "new_value": log.new_value,
        "ip_address": log.ip_address,
        "metadata": log.metadata,
        "created_at": log.created_at.isoformat(),
    } for log in logs]


# --- Helper function to record costs from other modules ---

def record_image_cost(
    db: Session,
    user_id: uuid.UUID,
    media_id: uuid.UUID,
    cost_usd: float,
    model_used: str,
    studio_id: Optional[uuid.UUID] = None,
) -> BillingRecord:
    """Record the cost of an image generation."""
    record = BillingRecord(
        user_id=user_id,
        studio_id=studio_id,
        record_type=BillingRecordType.IMAGE_GENERATION,
        description=f"Generacion de imagen con {model_used}",
        amount_usd=cost_usd,
        media_id=media_id,
        metadata={"model_used": model_used},
    )
    db.add(record)
    db.commit()
    
    # Update balance asynchronously (or could be done in a background task)
    update_balance(db, user_id)
    
    return record
