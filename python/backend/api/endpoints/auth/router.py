import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse

from core.security import google_oauth_url, get_current_user
from core.database import get_db
from models.user import User

# Importar los schemas y servicios que acabamos de crear
from api.endpoints.auth.schemas import LoginRequest, RegisterRequest
from api.endpoints.auth.services import (
    authenticate_user,
    register_precreated_account,
    process_google_callback,
    format_user_response,
    log_activity
)

router = APIRouter()

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Traditional login with email and password."""
    login_req = LoginRequest(email=form_data.username, password=form_data.password)
    token, user = authenticate_user(db, login_req, request)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        **format_user_response(user),
    }

@router.post("/register")
async def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Reclama una cuenta que fue previamente creada por un administrador o estudio."""
    token, user = register_precreated_account(db, data, request)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        **format_user_response(user),
        "message": "Cuenta activada y registrada exitosamente.",
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
    """Recibe la respuesta de Google y hace el login/registro de Macondo Admins."""
    token, user, picture = await process_google_callback(db, code, request)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        **format_user_response(user, picture),
    }

@router.get("/me")
async def me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the current user's profile data."""
    user = db.get(User, uuid.UUID(current_user["id"]))
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return format_user_response(user)

@router.post("/logout")
async def logout(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None,
):
    """Log out the current user (for activity logging)."""
    log_activity(db, uuid.UUID(current_user["id"]), "LOGOUT", request)
    return {"message": "Sesión cerrada exitosamente"}