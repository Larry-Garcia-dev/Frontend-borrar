from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from pydantic import BaseModel
from core.security import get_current_user
from core.request_urls import absolute_base_url
from services.storage import storage_client

router = APIRouter()

class UploadPhotosResponse(BaseModel):
    urls: List[str]

@router.post("/upload-photos", response_model=UploadPhotosResponse, status_code=status.HTTP_201_CREATED)
async def upload_training_photos(
    request: Request,
    files: List[UploadFile] = File(...),
    model_email: Optional[str] = Form(None), # <-- Recibimos el email
    current_user=Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="Se requiere al menos un archivo.")
    
    urls = []
    base = absolute_base_url(request)

    # Limpiamos el email para que sea un nombre de carpeta seguro
    safe_folder = model_email.replace("@", "_at_").replace(".", "_") if model_email else "unassigned"
    folder_path = f"models/training/{safe_folder}" # <-- Carpeta dinámica

    for upload in files:
        ext = Path(upload.filename or "").suffix.lower().lstrip(".") or "jpg"
        data = await upload.read()
        
        # Le pasamos la ruta dinámica a la clase storage
        key = storage_client.upload_bytes(data, extension=ext, folder=folder_path)
        rel = storage_client.get_url(key)
        
        if rel.startswith("/"):
            urls.append(f"{base}{rel}")
        else:
            urls.append(rel)

    return UploadPhotosResponse(urls=urls)