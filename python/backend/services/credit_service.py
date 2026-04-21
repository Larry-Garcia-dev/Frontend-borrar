"""Credit management service: expiry, validation, and plan assignment."""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from models.user import User

CREDIT_EXPIRY_DAYS = 30


def check_and_expire_credits(user: User, db: Session) -> None:
    """Reset used_quota if the credit expiry date has passed."""
    now = datetime.now(timezone.utc)
    if user.quota_reset_at and now >= user.quota_reset_at:
        user.used_quota = 0
        user.quota_reset_at = now + timedelta(days=CREDIT_EXPIRY_DAYS)
        db.commit()


def validate_and_consume_credit(user: User, db: Session) -> None:
    """Check expiry, validate quota, and deduct 1 credit.

    Raises:
        ValueError("quota_exceeded"): when the user has no credits left.
    """
    if user.is_unlimited:
        return
    check_and_expire_credits(user, db)
    if user.used_quota >= user.daily_limit:
        raise ValueError("quota_exceeded")
    user.used_quota += 1
    db.commit()


def assign_plan(user: User, db: Session, new_limit: int) -> None:
    """Assign a new plan to the user.

    - Updates daily_limit.
    - Resets used_quota to 0.
    - Sets quota_reset_at = now + 30 days.
    """
    user.daily_limit = new_limit
    user.used_quota = 0
    user.quota_reset_at = datetime.now(timezone.utc) + timedelta(days=CREDIT_EXPIRY_DAYS)
    db.commit()
