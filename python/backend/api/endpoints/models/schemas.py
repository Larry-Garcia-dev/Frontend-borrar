from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

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
    training_photos: List[str] = []  # URLs of uploaded photos (min 5)
    is_explicit: bool = False  # Flag for explicit content
    explicit_training_photos: List[str] = []  # URLs of explicit photos (8 required if is_explicit=True)

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
    is_explicit: bool = False
    explicit_training_photos: List[str] = []
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
    is_explicit: bool = False
    explicit_training_photos: List[str] = []
    model_info: Optional[dict] = None
    status: str
    payment_required: bool
    payment_amount_usd: Optional[float] = None
    payment_completed: bool
    rejection_reason: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True

class StudioInfoResponse(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None
    daily_limit: int
    is_active: bool
    role: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True # Permite leer datos de diccionarios y objetos SQLAlchemy