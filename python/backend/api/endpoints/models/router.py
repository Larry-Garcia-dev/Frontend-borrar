"""Model Profiles API router - manages model creation and profiles."""

from datetime import datetime, timezone
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user, hash_password
from models.model_profile import ModelProfile, ModelProfileStatus, ModelCreationRequest
from models.user import User, UserRole, UserType
from models.notification import NotificationType
from api.endpoints.notifications.router import create_notification

router = APIRouter()

# --- Importar y conectar el router de subida de archivos ---
from api.endpoints.models.upload import router as upload_router
router.include_router(upload_router)
# -----------------------------------------------------------
class ModelInfoRequest(BaseModel):
    """Model basic info for profile."""
    display_name: str
    bio: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    hair_color: Optional[str] = None
    eye_color: Optional[str] = None
    height_cm: Optional[int] = None


class CreateModelRequest(BaseModel):
    """Request from a studio to create a new model."""
    model_email: EmailStr
    model_name: str
    model_phone: Optional[str] = None
    model_info: Optional[dict] = None
    training_photos: List[str] = []  # URLs of uploaded photos


class ModelProfileResponse(BaseModel):
    """Model profile response."""
    id: str
    user_id: str
    studio_id: Optional[str] = None
    display_name: str
    bio: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    hair_color: Optional[str] = None
    eye_color: Optional[str] = None
    height_cm: Optional[int] = None
    training_photos: List[str] = []
    ai_model_id: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    images_per_order: int
    created_at: str

    class Config:
        from_attributes = True


class ModelCreationRequestResponse(BaseModel):
    """Model creation request response."""
    id: str
    studio_id: str
    model_email: str
    model_name: str
    model_phone: Optional[str] = None
    training_photos: List[str] = []
    model_info: Optional[dict] = None
    status: str
    payment_required: bool
    payment_amount_usd: Optional[float] = None
    payment_completed: bool
    rejection_reason: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


def _profile_to_response(profile: ModelProfile) -> ModelProfileResponse:
    """Convert profile to response."""
    return ModelProfileResponse(
        id=str(profile.id),
        user_id=str(profile.user_id),
        studio_id=str(profile.studio_id) if profile.studio_id else None,
        display_name=profile.display_name,
        bio=profile.bio,
        age=profile.age,
        gender=profile.gender,
        ethnicity=profile.ethnicity,
        hair_color=profile.hair_color,
        eye_color=profile.eye_color,
        height_cm=profile.height_cm,
        training_photos=profile.training_photos or [],
        ai_model_id=profile.ai_model_id,
        status=profile.status.value if hasattr(profile.status, "value") else str(profile.status),
        rejection_reason=profile.rejection_reason,
        images_per_order=profile.images_per_order,
        created_at=profile.created_at.isoformat(),
    )


def _request_to_response(req: ModelCreationRequest) -> ModelCreationRequestResponse:
    """Convert creation request to response."""
    return ModelCreationRequestResponse(
        id=str(req.id),
        studio_id=str(req.studio_id),
        model_email=req.model_email,
        model_name=req.model_name,
        model_phone=req.model_phone,
        training_photos=req.training_photos or [],
        model_info=req.model_info,
        status=req.status,
        payment_required=req.payment_required,
        payment_amount_usd=float(req.payment_amount_usd) if req.payment_amount_usd else None,
        payment_completed=req.payment_completed,
        rejection_reason=req.rejection_reason,
        created_at=req.created_at.isoformat(),
    )


# --- Studio endpoints ---

@router.post("/request-creation", response_model=ModelCreationRequestResponse, status_code=status.HTTP_201_CREATED)
async def request_model_creation(
    data: CreateModelRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Request to create a new model (studio only). Requires approval and payment."""
    user = db.get(User, uuid.UUID(current_user["id"]))
    if not user or user.role != UserRole.ESTUDIO:
        raise HTTPException(status_code=403, detail="Solo estudios pueden crear modelos")
    
    # Check if email already exists
    existing = db.query(User).filter(User.email == data.model_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este email ya esta registrado")
    
    # Check for existing pending request
    existing_request = db.query(ModelCreationRequest).filter(
        ModelCreationRequest.studio_id == user.id,
        ModelCreationRequest.model_email == data.model_email,
        ModelCreationRequest.status.in_(["PENDING", "PAYMENT_PENDING"])
    ).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="Ya existe una solicitud pendiente para este email")
    
    request = ModelCreationRequest(
        studio_id=user.id,
        model_email=data.model_email,
        model_name=data.model_name,
        model_phone=data.model_phone,
        training_photos=data.training_photos,
        model_info=data.model_info,
        payment_required=True,
        payment_amount_usd=50.00,  # Default creation fee
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    
    # Notify admins about new request
    admins = db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])).all()
    for admin in admins:
        create_notification(
            db, admin.id, NotificationType.SYSTEM,
            "Nueva solicitud de modelo",
            f"El estudio {user.name or user.email} solicita crear el modelo {data.model_name}",
            related_entity_type="MODEL_CREATION_REQUEST",
            related_entity_id=request.id,
        )
    
    return _request_to_response(request)


@router.get("/my-requests", response_model=List[ModelCreationRequestResponse])
async def get_my_model_requests(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all model creation requests for the current studio."""
    user = db.get(User, uuid.UUID(current_user["id"]))
    if not user or user.role != UserRole.ESTUDIO:
        raise HTTPException(status_code=403, detail="Solo estudios")
    
    requests = db.query(ModelCreationRequest).filter(
        ModelCreationRequest.studio_id == user.id
    ).order_by(ModelCreationRequest.created_at.desc()).all()
    
    return [_request_to_response(r) for r in requests]


@router.get("/my-models", response_model=List[ModelProfileResponse])
async def get_my_models(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all models belonging to the current studio."""
    user = db.get(User, uuid.UUID(current_user["id"]))
    if not user or user.role != UserRole.ESTUDIO:
        raise HTTPException(status_code=403, detail="Solo estudios")
    
    profiles = db.query(ModelProfile).filter(
        ModelProfile.studio_id == user.id
    ).order_by(ModelProfile.created_at.desc()).all()
    
    return [_profile_to_response(p) for p in profiles]


# --- Model's own profile ---

@router.get("/my-profile", response_model=ModelProfileResponse)
async def get_my_profile(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current model's profile."""
    user_id = uuid.UUID(current_user["id"])
    
    profile = db.query(ModelProfile).filter(ModelProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    return _profile_to_response(profile)


@router.put("/my-profile", response_model=ModelProfileResponse)
async def update_my_profile(
    data: ModelInfoRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current model's profile (limited fields)."""
    user_id = uuid.UUID(current_user["id"])
    
    profile = db.query(ModelProfile).filter(ModelProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    # Only allow updating certain fields
    profile.display_name = data.display_name
    profile.bio = data.bio
    db.commit()
    db.refresh(profile)
    
    return _profile_to_response(profile)


# --- Admin endpoints ---

@router.get("/pending-requests", response_model=List[ModelCreationRequestResponse])
async def get_pending_requests(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all pending model creation requests (admin only)."""
    admin = db.get(User, uuid.UUID(current_user["id"]))
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    requests = db.query(ModelCreationRequest).filter(
        ModelCreationRequest.status.in_(["PENDING", "PAYMENT_PENDING"])
    ).order_by(ModelCreationRequest.created_at.asc()).all()
    
    return [_request_to_response(r) for r in requests]


@router.post("/requests/{request_id}/approve")
async def approve_model_request(
    request_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve a model creation request (admin only)."""
    admin = db.get(User, uuid.UUID(current_user["id"]))
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    request = db.get(ModelCreationRequest, uuid.UUID(request_id))
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if request.status not in ("PENDING", "PAYMENT_PENDING"):
        raise HTTPException(status_code=400, detail="Esta solicitud ya fue procesada")
    
    if request.payment_required and not request.payment_completed:
        request.status = "PAYMENT_PENDING"
        db.commit()
        
        # Notify studio about payment requirement
        create_notification(
            db, request.studio_id, NotificationType.PAYMENT_REQUIRED,
            "Pago requerido para crear modelo",
            f"Su solicitud para crear el modelo {request.model_name} fue aprobada. "
            f"Se requiere un pago de ${request.payment_amount_usd} USD para proceder.",
            related_entity_type="MODEL_CREATION_REQUEST",
            related_entity_id=request.id,
        )
        
        return {"message": "Solicitud aprobada. Pendiente de pago.", "status": "PAYMENT_PENDING"}
    
    # Create the model user
    model_user = User(
        email=request.model_email,
        name=request.model_name,
        phone=request.model_phone,
        password_hash=hash_password("changeme123"),  # Temporary password
        role=UserRole.MODELO,
        user_type=UserType.STUDIO_MODEL,
        studio_id=request.studio_id,
        is_approved=True,
        approved_at=datetime.now(timezone.utc),
        approved_by_id=admin.id,
    )
    db.add(model_user)
    db.flush()
    
    # Create model profile
    profile = ModelProfile(
        user_id=model_user.id,
        studio_id=request.studio_id,
        display_name=request.model_name,
        training_photos=request.training_photos,
        status=ModelProfileStatus.PENDING,  # Will be TRAINING after AI training
    )
    if request.model_info:
        profile.age = request.model_info.get("age")
        profile.gender = request.model_info.get("gender")
        profile.ethnicity = request.model_info.get("ethnicity")
        profile.hair_color = request.model_info.get("hair_color")
        profile.eye_color = request.model_info.get("eye_color")
        profile.height_cm = request.model_info.get("height_cm")
    
    db.add(profile)
    
    # Update request
    request.status = "COMPLETED"
    request.reviewed_by_id = admin.id
    request.reviewed_at = datetime.now(timezone.utc)
    request.created_user_id = model_user.id
    
    db.commit()
    
    # Notify studio
    create_notification(
        db, request.studio_id, NotificationType.MODEL_APPROVED,
        "Modelo creado exitosamente",
        f"El modelo {request.model_name} ha sido creado. "
        f"Credenciales temporales: {request.model_email} / changeme123",
        related_entity_type="USER",
        related_entity_id=model_user.id,
    )
    
    return {"message": "Modelo creado exitosamente", "user_id": str(model_user.id)}


@router.post("/requests/{request_id}/reject")
async def reject_model_request(
    request_id: str,
    reason: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject a model creation request (admin only)."""
    admin = db.get(User, uuid.UUID(current_user["id"]))
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    request = db.get(ModelCreationRequest, uuid.UUID(request_id))
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if not reason or len(reason.strip()) < 10:
        raise HTTPException(status_code=400, detail="Debe proporcionar una razon de al menos 10 caracteres")
    
    request.status = "REJECTED"
    request.rejection_reason = reason
    request.reviewed_by_id = admin.id
    request.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    
    # Notify studio
    create_notification(
        db, request.studio_id, NotificationType.MODEL_REJECTED,
        "Solicitud de modelo rechazada",
        f"Su solicitud para crear el modelo {request.model_name} fue rechazada. Razon: {reason}",
        related_entity_type="MODEL_CREATION_REQUEST",
        related_entity_id=request.id,
    )
    
    return {"message": "Solicitud rechazada"}


@router.post("/requests/{request_id}/confirm-payment")
async def confirm_payment(
    request_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirm payment for a model creation request (admin only)."""
    admin = db.get(User, uuid.UUID(current_user["id"]))
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    request = db.get(ModelCreationRequest, uuid.UUID(request_id))
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if request.status != "PAYMENT_PENDING":
        raise HTTPException(status_code=400, detail="Esta solicitud no esta pendiente de pago")
    
    request.payment_completed = True
    request.payment_completed_at = datetime.now(timezone.utc)
    request.status = "PENDING"  # Back to pending for final approval/creation
    db.commit()
    
    # Notify studio
    create_notification(
        db, request.studio_id, NotificationType.PAYMENT_RECEIVED,
        "Pago recibido",
        f"El pago para crear el modelo {request.model_name} ha sido confirmado. "
        "Procederemos con la creacion del perfil.",
        related_entity_type="MODEL_CREATION_REQUEST",
        related_entity_id=request.id,
    )
    
    return {"message": "Pago confirmado"}


@router.get("/all-profiles", response_model=List[ModelProfileResponse])
async def get_all_profiles(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all model profiles (admin only)."""
    admin = db.get(User, uuid.UUID(current_user["id"]))
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    query = db.query(ModelProfile)
    
    if status:
        try:
            s = ModelProfileStatus(status)
            query = query.filter(ModelProfile.status == s)
        except ValueError:
            pass
    
    profiles = query.order_by(ModelProfile.created_at.desc()).offset(skip).limit(limit).all()
    return [_profile_to_response(p) for p in profiles]
