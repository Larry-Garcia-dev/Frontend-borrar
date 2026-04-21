import uuid
import logging
from datetime import timedelta, datetime, timezone
from fastapi import HTTPException, status, Request
from sqlalchemy.orm import Session

from core.config import settings
from core.security import (
    create_access_token,
    exchange_google_code,
    hash_password,
    verify_password,
)
from models.user import User, UserRole
from models.billing import ActivityLog
from api.endpoints.auth.schemas import LoginRequest, RegisterRequest

logger = logging.getLogger(__name__)

def format_user_response(user: User, picture: str | None = None) -> dict:
    """Formatea la respuesta estándar del usuario."""
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

def log_activity(db: Session, user_id: uuid.UUID | None, action: str, request: Request | None = None, **kwargs):
    """Registra una actividad en el log de auditoría."""
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
    except Exception as e:
        logger.error(f"Error logging activity: {e}")

def authenticate_user(db: Session, data: LoginRequest, request: Request):
    """Lógica de inicio de sesión con email y contraseña."""
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas o cuenta configurada solo para Google."
        )
    
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta desactivada")
    
    token = create_access_token(
        subject=str(user.id), 
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    log_activity(db, user.id, "LOGIN", request, metadata={"method": "password"})
    return token, user

def register_precreated_account(db: Session, data: RegisterRequest, request: Request):
    """Lógica para que un Estudio o Modelo reclame la cuenta que le crearon previamente."""
    # 1. Consulta a la base de datos para hacer match con el correo
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Correo no encontrado. Un administrador debe invitarte y crear tu cuenta primero."
        )
    
    # 2. Check de seguridad: Si ya tiene password o google_id, la cuenta ya fue reclamada
    if user.password_hash or user.google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta cuenta ya fue registrada. Si olvidaste tu contraseña, ponte en contacto con soporte."
        )
    
    # 3. Asignar los datos del formulario de registro a la cuenta pre-creada
    user.password_hash = hash_password(data.password)
    user.name = data.name
    if data.phone:
        user.phone = data.phone
        
    db.commit()
    db.refresh(user)
    
    log_activity(db, user.id, "REGISTER_CLAIMED", request, resource_type="USER", resource_id=user.id)
    
    token = create_access_token(
        subject=str(user.id), 
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return token, user

async def process_google_callback(db: Session, code: str, request: Request):
    """Lógica estricta de validación y login con Google OAuth."""
    try:
        user_info = await exchange_google_code(code)
    except Exception as e:
        logger.error(f"Google OAuth error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error con Google: {str(e)}")

    google_sub = user_info.get("sub")
    email = user_info.get("email")
    picture = user_info.get("picture")
    name = user_info.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="Google no proporcionó un email.")

    # Restricción estricta de dominio para Google Login
    email_domain = email.split("@")[-1].lower() if "@" in email else ""
    if email_domain != "macondosoftwares.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El inicio de sesión con Google está restringido exclusivamente a administradores (@macondosoftwares.com)."
        )

    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Nuevo super administrador
        user = User(
            email=email,
            google_id=google_sub,
            name=name,
            avatar_url=picture,
            role=UserRole.MACONDO_ADMIN,
            is_approved=True,
            is_unlimited=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        log_activity(db, user.id, "REGISTER", request, metadata={"method": "google", "role": "MACONDO_ADMIN"})
    else:
        # Actualizar credenciales Google si no las tenía
        if not user.google_id:
            user.google_id = google_sub
        if not user.avatar_url:
            user.avatar_url = picture
        if not user.name:
            user.name = name
            
        # Asegurar que tiene el rol más alto
        if user.role != UserRole.MACONDO_ADMIN:
            user.role = UserRole.MACONDO_ADMIN
            user.is_unlimited = True
            
        db.commit()
        log_activity(db, user.id, "LOGIN", request, metadata={"method": "google"})

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta desactivada")

    token = create_access_token(
        subject=str(user.id), 
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return token, user, picture