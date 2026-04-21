from datetime import timedelta
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse

from core.config import settings
from core.security import (
    create_access_token,
    google_oauth_url,
    exchange_google_code,
    get_current_user,
)
from core.database import get_db
from models.user import User, UserRole

router = APIRouter()

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Login con contraseña no implementado. Usa Google OAuth.",
    )

@router.get("/google")
async def google_login():
    """Redirige a la pantalla de Google."""
    return RedirectResponse(url=google_oauth_url())

@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Recibe la respuesta de Google y crea el usuario."""
    try:
        user_info = await exchange_google_code(code)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al verificar con Google: {str(e)}"
        )

    google_sub = user_info.get("sub")
    email = user_info.get("email")
    picture = user_info.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Google no proporcionó un email.")

    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Demo bootstrap rule: first admin account by fixed email.
        role = UserRole.ADMIN if email.strip().lower() == "admin@macondo.ai" else UserRole.CREATOR
        user = User(
            email=email,
            google_id=google_sub,
            role=role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.google_id:
            user.google_id = google_sub
            db.commit()

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "email": user.email,
        "user_id": str(user.id),
        "picture": picture,
        "daily_limit": user.daily_limit,
        "used_quota": user.used_quota,
        "is_unlimited": bool(user.is_unlimited),
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "quota_reset_at": user.quota_reset_at.isoformat() if user.quota_reset_at else None,
    }


@router.get("/me")
async def me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the current user's quota and profile data."""
    user = db.get(User, uuid.UUID(current_user["id"]))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "email": user.email,
        "user_id": str(user.id),
        "daily_limit": user.daily_limit,
        "used_quota": user.used_quota,
        "is_unlimited": bool(user.is_unlimited),
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "quota_reset_at": user.quota_reset_at.isoformat() if user.quota_reset_at else None,
    }
