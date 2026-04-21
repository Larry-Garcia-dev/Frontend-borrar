"""Admin endpoints for managing system prompts and prompt templates."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from core.database import get_db
from models.prompt import PromptTemplate, SystemPrompt
from services.prompt_service import activate_system_prompt

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class SystemPromptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    content: str
    is_active: bool
    created_by: str


class SystemPromptCreateRequest(BaseModel):
    name: str
    content: str
    created_by: str


class SystemPromptUpdateRequest(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None


class PromptTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    content: str
    description: Optional[str] = None
    is_active: bool
    sort_order: int
    created_by: str


class PromptTemplateCreateRequest(BaseModel):
    name: str
    content: str
    description: Optional[str] = None
    sort_order: int = 0
    created_by: str


class PromptTemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# System Prompts endpoints  (/prompts/)
# ---------------------------------------------------------------------------


@router.get("/prompts/", response_model=list[SystemPromptResponse])
async def list_system_prompts(
    db: Session = Depends(get_db),
) -> list[SystemPromptResponse]:
    """Return all system prompts ordered by creation date (newest first)."""
    prompts = (
        db.query(SystemPrompt)
        .order_by(SystemPrompt.created_at.desc())
        .all()
    )
    return [SystemPromptResponse.model_validate(p) for p in prompts]


@router.post(
    "/prompts/",
    response_model=SystemPromptResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_system_prompt(
    payload: SystemPromptCreateRequest,
    db: Session = Depends(get_db),
) -> SystemPromptResponse:
    """Create a new system prompt (inactive by default)."""
    prompt = SystemPrompt(
        name=payload.name,
        content=payload.content,
        is_active=False,
        created_by=payload.created_by,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return SystemPromptResponse.model_validate(prompt)


@router.patch("/prompts/{prompt_id}", response_model=SystemPromptResponse)
async def update_system_prompt(
    prompt_id: UUID,
    payload: SystemPromptUpdateRequest,
    db: Session = Depends(get_db),
) -> SystemPromptResponse:
    """Partially update a system prompt's name and/or content."""
    prompt = db.get(SystemPrompt, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="System prompt not found")
    if payload.name is not None:
        prompt.name = payload.name
    if payload.content is not None:
        prompt.content = payload.content
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return SystemPromptResponse.model_validate(prompt)


@router.post("/prompts/{prompt_id}/activate", response_model=SystemPromptResponse)
async def activate_prompt(
    prompt_id: UUID,
    db: Session = Depends(get_db),
) -> SystemPromptResponse:
    """Activate the given system prompt and deactivate all others."""
    try:
        prompt = activate_system_prompt(db, prompt_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return SystemPromptResponse.model_validate(prompt)


@router.delete("/prompts/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_system_prompt(
    prompt_id: UUID,
    db: Session = Depends(get_db),
) -> None:
    """Delete a system prompt by ID."""
    prompt = db.get(SystemPrompt, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="System prompt not found")
    db.delete(prompt)
    db.commit()


# ---------------------------------------------------------------------------
# Prompt Templates endpoints  (/prompt-templates/)
# ---------------------------------------------------------------------------


@router.get("/prompt-templates/", response_model=list[PromptTemplateResponse])
async def list_prompt_templates(
    db: Session = Depends(get_db),
) -> list[PromptTemplateResponse]:
    """Return all prompt templates ordered by sort_order ascending."""
    templates = (
        db.query(PromptTemplate)
        .order_by(PromptTemplate.sort_order.asc())
        .all()
    )
    return [PromptTemplateResponse.model_validate(t) for t in templates]


@router.post(
    "/prompt-templates/",
    response_model=PromptTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_prompt_template(
    payload: PromptTemplateCreateRequest,
    db: Session = Depends(get_db),
) -> PromptTemplateResponse:
    """Create a new prompt template."""
    existing = db.query(PromptTemplate).filter(PromptTemplate.name == payload.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A template with that name already exists",
        )
    template = PromptTemplate(
        name=payload.name,
        content=payload.content,
        description=payload.description,
        sort_order=payload.sort_order,
        is_active=True,
        created_by=payload.created_by,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return PromptTemplateResponse.model_validate(template)


@router.patch("/prompt-templates/{template_id}", response_model=PromptTemplateResponse)
async def update_prompt_template(
    template_id: UUID,
    payload: PromptTemplateUpdateRequest,
    db: Session = Depends(get_db),
) -> PromptTemplateResponse:
    """Partially update a prompt template."""
    template = db.get(PromptTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    if payload.name is not None:
        template.name = payload.name
    if payload.content is not None:
        template.content = payload.content
    if payload.description is not None:
        template.description = payload.description
    if payload.sort_order is not None:
        template.sort_order = payload.sort_order
    if payload.is_active is not None:
        template.is_active = payload.is_active
    db.add(template)
    db.commit()
    db.refresh(template)
    return PromptTemplateResponse.model_validate(template)


@router.delete("/prompt-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt_template(
    template_id: UUID,
    db: Session = Depends(get_db),
) -> None:
    """Delete a prompt template by ID."""
    template = db.get(PromptTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    db.delete(template)
    db.commit()
