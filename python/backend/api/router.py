from fastapi import APIRouter

from api.endpoints.auth.router import router as auth_router
from api.endpoints.generation.router import router as generation_router
from api.endpoints.admin.router import router as admin_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(generation_router, prefix="/generation", tags=["generation"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
