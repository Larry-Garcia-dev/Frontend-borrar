from datetime import timedelta
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr

from core.config import settings
from core.security import (
    create_access_token,
    google_oauth_url,
    exchange_google_code,
    get_current_user,
    hash_password,
    verify_password,
)
from core.database import get_db
from models.user import User, UserRole
from models.billing import ActivityLog

router = APIRouter()


class LoginRequest(BaseModel):
    """Traditional login request."""
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    """Registration request for studios/models."""
    email: EmailStr
    password: str
    name: str
    phone: str | None = None
    role: str = "MODELO"  # MODELO or ESTUDIO


def _user_response(user: User, picture: str | None = None) -> dict:
    """Build standard user response dict."""
    return {
        "email": user.email,
        "user_id": str(user.id),
        "name": user.name,
        "picture": picture or user.avatar_url,
        "daily_limit": user.daily_limit,
        "used_quota": user.used_quota,
        "is_unlimited": bool(user.is_unlimited),
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "user_type": user.user_type.value if user.user_type else None,
        "quota_reset_at": user.quota_reset_at.isoformat() if user.quota_reset_at else None,
        "is_approved": user.is_approved,
        "studio_id": str(user.studio_id) if user.studio_id else None,
    }


def _log_activity(db: Session, user_id: uuid.UUID | None, action: str, request: Request | None = None, **kwargs):
    """Log an activity to the activity log."""
    try:
        log = ActivityLog(
            user_id=user_id,
            action=action,
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
            metadata=kwargs.get("metadata"),
            resource_type=kwargs.get("resource_type"),
            resource_id=kwargs.get("resource_id"),
        )
        db.add(log)
        db.commit()
    except Exception:
        pass  # Don't fail the request if logging fails


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Traditional login with email and password."""
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )
    
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Esta cuenta solo permite inicio de sesion con Google",
        )
    
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    
    _log_activity(db, user.id, "LOGIN", request, metadata={"method": "password"})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        **_user_response(user),
    }


@router.post("/register")
async def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Register a new studio or model account."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este email ya esta registrado",
        )
    
    # Validate role
    if data.role not in ("MODELO", "ESTUDIO"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rol invalido. Use MODELO o ESTUDIO",
        )
    
    role = UserRole.MODELO if data.role == "MODELO" else UserRole.ESTUDIO
    
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        phone=data.phone,
        role=role,
        is_approved=False,  # Requires admin approval
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    _log_activity(db, user.id, "REGISTER", request, resource_type="USER", resource_id=user.id)
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        **_user_response(user),
        "message": "Cuenta creada. Pendiente de aprobacion por el administrador.",
    }


@router.get("/google")
async def google_login():
    """Redirige a la pantalla de Google."""
    return RedirectResponse(url=google_oauth_url())


@router.get("/google/callback")
async def google_callback(
    code: str,
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Recibe la respuesta de Google y crea el usuario.
    
    Google OAuth is ONLY allowed for:
    - Emails with @macondosoftware.com domain (admins)
    - Existing users who already have a Google ID linked
    """
    try:
        user_info = await exchange_google_code(code)
    except Exception as e:
        # Log the error for debugging
        import logging
        logging.error(f"Google OAuth error: {str(e)}. Check that GOOGLE_REDIRECT_URI matches exactly what's configured in Google Cloud Console.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al verificar con Google: {str(e)}. Verifique que GOOGLE_REDIRECT_URI coincida con la configuracion de Google Cloud Console."
        )

    google_sub = user_info.get("sub")
    email = user_info.get("email")
    picture = user_info.get("picture")
    name = user_info.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="Google no proporciono un email.")

    # Check if user already exists
    user = db.query(User).filter(User.email == email).first()
    
    # Domain restriction for new users
    email_domain = email.split("@")[-1].lower() if "@" in email else ""
    is_macondo_domain = email_domain == "macondosoftwares.com"
    
    if not user:
        # New user - only allow @macondosoftwares.com domains
        if not is_macondo_domain:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El inicio de sesion con Google solo esta disponible para cuentas @macondosoftwares.com. "
                       "Por favor, registrese con email y contrasena.",
            )
        
        # Create admin user for Macondo domain
        role = UserRole.ADMIN
        if email.strip().lower() == "superadmin@macondosoftwares.com":
            role = UserRole.SUPER_ADMIN
        
        user = User(
            email=email,
            google_id=google_sub,
            name=name,
            avatar_url=picture,
            role=role,
            is_approved=True,  # Auto-approve Macondo admins
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        _log_activity(db, user.id, "REGISTER", request, 
                     resource_type="USER", resource_id=user.id,
                     metadata={"method": "google", "auto_admin": True})
    else:
        # Existing user - allow Google login if they have Google ID or are Macondo domain
        if not user.google_id and not is_macondo_domain:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Esta cuenta no esta vinculada a Google. Use su email y contrasena para iniciar sesion.",
            )
        
        if not user.google_id:
            user.google_id = google_sub
            if not user.avatar_url:
                user.avatar_url = picture
            if not user.name:
                user.name = name
            db.commit()
        
        _log_activity(db, user.id, "LOGIN", request, metadata={"method": "google"})

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        **_user_response(user, picture),
    }


@router.get("/me")
async def me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the current user's quota and profile data."""
    user = db.get(User, uuid.UUID(current_user["id"]))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_response(user)


@router.post("/logout")
async def logout(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Log out the current user (for activity logging)."""
    _log_activity(db, uuid.UUID(current_user["id"]), "LOGOUT", request)
    return {"message": "Sesion cerrada exitosamente"}
