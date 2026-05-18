from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    """Modelo para la petición de login tradicional."""
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    """Modelo para reclamar/registrar una cuenta pre-creada."""
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None