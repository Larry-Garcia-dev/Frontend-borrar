from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class VendorUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    name: Optional[str] = None
    role: str
    daily_limit: int
    used_quota: int
    is_unlimited: bool
    quota_reset_at: Optional[str] = None

class VendorUserCreateRequest(BaseModel):
    email: str
    name: Optional[str] = None
    daily_limit: int = 100

class VendorUserUpdateRequest(BaseModel):
    daily_limit: int