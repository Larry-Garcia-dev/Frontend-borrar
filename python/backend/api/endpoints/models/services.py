import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from models.model_profile import ModelProfile, ModelProfileStatus, ModelCreationRequest
from models.user import User, UserRole, UserType
from models.notification import NotificationType
from api.endpoints.notifications.router import create_notification
from api.endpoints.models.schemas import (
    CreateModelRequest,
    ModelInfoRequest,
    ModelProfileResponse,
    ModelCreationRequestResponse
)

# --- Serializadores ---
def format_profile_response(profile: ModelProfile) -> ModelProfileResponse:
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

def format_request_response(req: ModelCreationRequest) -> ModelCreationRequestResponse:
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

# --- Lógica de Negocio ---
def create_model_request(db: Session, current_user_id: str, data: CreateModelRequest):
    user = db.get(User, uuid.UUID(current_user_id))
    if not user or user.role not in [UserRole.ESTUDIO_ADMIN, UserRole.MACONDO_ADMIN]:
        raise HTTPException(status_code=403, detail="Solo estudios o administradores")
    
    existing = db.query(User).filter(User.email == data.model_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este email ya está registrado")
    
    # 1. VALIDACIÓN ESTRICTA DE CRÉDITOS
    assigned_limit = int(data.model_info.get("assigned_daily_limit", 10)) if data.model_info else 10
    
    current_models_sum = db.execute(
        select(func.sum(User.daily_limit)).where(User.studio_id == user.id)
    ).scalar() or 0
    
    pending_requests = db.query(ModelCreationRequest).filter(
        ModelCreationRequest.studio_id == user.id,
        ModelCreationRequest.status.in_(["PENDING", "PAYMENT_PENDING"])
    ).all()
    
    pending_sum = 0
    for r in pending_requests:
        val = r.model_info.get("assigned_daily_limit", 10) if isinstance(r.model_info, dict) else 10
        pending_sum += int(val)
        
    total_requested = current_models_sum + pending_sum + assigned_limit
    if total_requested > user.daily_limit:
        raise HTTPException(
            status_code=400,
            detail=f"Créditos insuficientes. Límite de estudio: {user.daily_limit}. En uso/pendiente: {current_models_sum + pending_sum}. Intentas asignar: {assigned_limit}."
        )
    # FIN VALIDACIÓN
    
    request = ModelCreationRequest(
        studio_id=user.id,
        model_email=data.model_email,
        model_name=data.model_name,
        model_phone=data.model_phone,
        training_photos=data.training_photos,
        model_info=data.model_info,
        payment_required=True,
        payment_amount_usd=50.00,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    
    admins = db.query(User).filter(User.role.in_([UserRole.MACONDO_ADMIN])).all()
    for admin in admins:
        create_notification(
            db, admin.id, NotificationType.SYSTEM,
            "Nueva solicitud de modelo",
            f"El estudio {user.name or user.email} solicita crear el perfil de {data.model_name}",
            related_entity_type="MODEL_CREATION_REQUEST",
            related_entity_id=request.id,
        )
    return format_request_response(request)

def get_studio_requests(db: Session, current_user_id: str):
    user = db.get(User, uuid.UUID(current_user_id))
    if not user or user.role not in [UserRole.ESTUDIO_ADMIN, UserRole.MACONDO_ADMIN]:
        raise HTTPException(status_code=403, detail="Solo estudios")
    
    requests = db.query(ModelCreationRequest).filter(
        ModelCreationRequest.studio_id == user.id
    ).order_by(ModelCreationRequest.created_at.desc()).all()
    
    return [format_request_response(r) for r in requests]

def get_studio_models(db: Session, current_user_id: str):
    user = db.get(User, uuid.UUID(current_user_id))
    if not user or user.role not in [UserRole.ESTUDIO_ADMIN, UserRole.MACONDO_ADMIN]:
        raise HTTPException(status_code=403, detail="Solo estudios")
    
    profiles = db.query(ModelProfile).filter(
        ModelProfile.studio_id == user.id
    ).order_by(ModelProfile.created_at.desc()).all()
    
    return [format_profile_response(p) for p in profiles]

def get_my_profile(db: Session, current_user_id: str):
    user_id = uuid.UUID(current_user_id)
    profile = db.query(ModelProfile).filter(ModelProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return format_profile_response(profile)

def update_my_profile(db: Session, current_user_id: str, data: ModelInfoRequest):
    user_id = uuid.UUID(current_user_id)
    profile = db.query(ModelProfile).filter(ModelProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    profile.display_name = data.display_name
    profile.bio = data.bio
    db.commit()
    db.refresh(profile)
    return format_profile_response(profile)

def get_all_pending_requests(db: Session, admin_id: str):
    admin = db.get(User, uuid.UUID(admin_id))
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    requests = db.query(ModelCreationRequest).filter(
        ModelCreationRequest.status.in_(["PENDING", "PAYMENT_PENDING"])
    ).order_by(ModelCreationRequest.created_at.asc()).all()
    return [format_request_response(r) for r in requests]

def approve_model_request_service(db: Session, admin_id: str, request_id: str):
    admin = db.get(User, uuid.UUID(admin_id))
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
        create_notification(
            db, request.studio_id, NotificationType.PAYMENT_REQUIRED,
            "Pago requerido para crear modelo",
            f"Su solicitud para crear el modelo {request.model_name} fue aprobada. "
            f"Se requiere un pago de ${request.payment_amount_usd} USD para proceder.",
            related_entity_type="MODEL_CREATION_REQUEST",
            related_entity_id=request.id,
        )
        return {"message": "Solicitud aprobada. Pendiente de pago.", "status": "PAYMENT_PENDING"}
    
    # 2. AL APROBAR, EXTRAEMOS LOS CRÉDITOS ASIGNADOS
    assigned_limit = int(request.model_info.get("assigned_daily_limit", 10)) if isinstance(request.model_info, dict) else 10
    
    model_user = User(
        email=request.model_email,
        name=request.model_name,
        phone=request.model_phone,
        password_hash=None, 
        role=UserRole.MODELO,
        user_type=UserType.STUDIO_MODEL,
        studio_id=request.studio_id,
        daily_limit=assigned_limit,  # <-- Se asignan al User
        is_approved=True,
        approved_at=datetime.now(timezone.utc),
        approved_by_id=admin.id,
    )
    db.add(model_user)
    db.flush()
    
    profile = ModelProfile(
        user_id=model_user.id,
        studio_id=request.studio_id,
        display_name=request.model_name,
        training_photos=request.training_photos,
        images_per_order=assigned_limit, # <-- Se asignan al Perfil
        status=ModelProfileStatus.APPROVED,
    )
    if request.model_info:
        profile.age = request.model_info.get("age")
        profile.gender = request.model_info.get("gender")
        profile.ethnicity = request.model_info.get("ethnicity")
        profile.hair_color = request.model_info.get("hair_color")
        profile.eye_color = request.model_info.get("eye_color")
        profile.height_cm = request.model_info.get("height_cm")
    db.add(profile)
    
    request.status = "COMPLETED"
    request.reviewed_by_id = admin.id
    request.reviewed_at = datetime.now(timezone.utc)
    request.created_user_id = model_user.id
    db.commit()
    
    # Notificación actualizada para el estudio
    create_notification(
        db, request.studio_id, NotificationType.MODEL_APPROVED,
        "Modelo creada exitosamente",
        f"El perfil de {request.model_name} ha sido creado y aprobado. La modelo ya puede ingresar a la página de Registro para crear su contraseña usando el correo {request.model_email}.",
        related_entity_type="USER",
        related_entity_id=model_user.id,
    )
    return {"message": "Modelo creado exitosamente", "user_id": str(model_user.id)}

def reject_model_request_service(db: Session, admin_id: str, request_id: str, reason: str):
    admin = db.get(User, uuid.UUID(admin_id))
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
    
    create_notification(
        db, request.studio_id, NotificationType.MODEL_REJECTED,
        "Solicitud de modelo rechazada",
        f"Su solicitud para crear el modelo {request.model_name} fue rechazada. Razon: {reason}",
        related_entity_type="MODEL_CREATION_REQUEST",
        related_entity_id=request.id,
    )
    return {"message": "Solicitud rechazada"}

def confirm_payment_service(db: Session, admin_id: str, request_id: str):
    admin = db.get(User, uuid.UUID(admin_id))
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    request = db.get(ModelCreationRequest, uuid.UUID(request_id))
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if request.status != "PAYMENT_PENDING":
        raise HTTPException(status_code=400, detail="Esta solicitud no esta pendiente de pago")
    
    request.payment_completed = True
    request.payment_completed_at = datetime.now(timezone.utc)
    request.status = "PENDING"
    db.commit()
    
    create_notification(
        db, request.studio_id, NotificationType.PAYMENT_RECEIVED,
        "Pago recibido",
        f"El pago para crear el modelo {request.model_name} ha sido confirmado. Procederemos con la creacion del perfil.",
        related_entity_type="MODEL_CREATION_REQUEST",
        related_entity_id=request.id,
    )
    return {"message": "Pago confirmado"}

def get_all_model_profiles(db: Session, admin_id: str, skip: int, limit: int, status: Optional[str]):
    admin = db.get(User, uuid.UUID(admin_id))
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
    return [format_profile_response(p) for p in profiles]

def toggle_model_status_service(db: Session, studio_id: str, profile_id: str):
    """Pausa o Activa una modelo (Congelar)."""
    profile = db.get(ModelProfile, uuid.UUID(profile_id))
    if not profile or str(profile.studio_id) != studio_id:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    
    if profile.status in [ModelProfileStatus.ACTIVE, ModelProfileStatus.APPROVED, ModelProfileStatus.READY]:
        profile.status = ModelProfileStatus.SUSPENDED
    elif profile.status == ModelProfileStatus.SUSPENDED:
        profile.status = ModelProfileStatus.ACTIVE
    else:
        raise HTTPException(status_code=400, detail=f"No se puede cambiar el estado actual ({profile.status.value})")
        
    user = db.get(User, profile.user_id)
    if user:
        user.is_active = profile.status in [ModelProfileStatus.ACTIVE, ModelProfileStatus.APPROVED, ModelProfileStatus.READY]
    
    db.commit()
    db.refresh(profile)
    return format_profile_response(profile)
