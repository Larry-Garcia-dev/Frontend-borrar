from typing import List
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from pydantic import BaseModel

from core.security import get_current_user
from core.request_urls import absolute_base_url
from services.storage import storage_client

# Creamos un router específico para las subidas
router = APIRouter()

class UploadPhotosResponse(BaseModel):
    urls: List[str]

@router.post("/upload-photos", response_model=UploadPhotosResponse, status_code=status.HTTP_201_CREATED)
async def upload_training_photos(
    request: Request,
    files: List[UploadFile] = File(...),
    current_user=Depends(get_current_user),
):
    """Upload training photos for a new model."""
    if not files:
        raise HTTPException(status_code=400, detail="Se requiere al menos un archivo.")
    
    urls = []
    base = absolute_base_url(request)

    for upload in files:
        ext = Path(upload.filename or "").suffix.lower().lstrip(".") or "jpg"
        data = await upload.read()
        
        key = storage_client.upload_bytes(data, extension=ext, folder="models/training")
        rel = storage_client.get_url(key)
        
        if rel.startswith("/"):
            urls.append(f"{base}{rel}")
        else:
            urls.append(rel)

    return UploadPhotosResponse(urls=urls)