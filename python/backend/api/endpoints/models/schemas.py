from typing import List, Optional
from pydantic import BaseModel, EmailStr

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