# backend/main.py

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from api.endpoints.admin.router import router as admin_router
from api.endpoints.admin.prompts_router import router as prompts_router
from api.endpoints.generation.reports_router import router as reports_router
from api.endpoints.vendor.router import router as vendor_router
from api.endpoints.notifications.router import router as notifications_router
from api.endpoints.billing.router import router as billing_router
from api.endpoints.models.router import router as models_router
from api.router import api_router
from core.config import settings
from core.database import init_db

# Usamos el lifespan de FastAPI para ejecutar código al iniciar el servidor
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializamos la base de datos de forma limpia
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(prompts_router, prefix="/api/admin", tags=["admin-prompts"])
app.include_router(reports_router, prefix=f"{settings.API_V1_STR}/generation", tags=["reports"])
app.include_router(vendor_router, prefix="/api/vendor", tags=["vendor"])
app.include_router(notifications_router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(billing_router, prefix=f"{settings.API_V1_STR}/billing", tags=["billing"])
app.include_router(models_router, prefix=f"{settings.API_V1_STR}/models", tags=["models"])

# Static files for generated media
app.mount(
    "/media",
    StaticFiles(directory=str((Path(__file__).parent / "media").resolve())),
    name="media",
)

@app.get("/health", tags=["health"])
async def health_check() -> dict:
    return {"status": "ok"}
