"""Prompt service: helpers for reading and composing dynamic prompts."""

from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy.orm import Session

from models.prompt import PromptTemplate, SystemPrompt


def get_active_system_prompt(db: Session) -> Optional[str]:
    """Return the content of the currently active system prompt, or None."""
    prompt = (
        db.query(SystemPrompt)
        .filter(SystemPrompt.is_active == True)  # noqa: E712
        .order_by(SystemPrompt.updated_at.desc())
        .first()
    )
    return prompt.content if prompt else None


def get_template_content(db: Session, template_id: str) -> Optional[str]:
    """Return the content of an active template by ID, or None if not found."""
    try:
        uid = uuid.UUID(template_id)
    except (ValueError, AttributeError):
        return None
    template = (
        db.query(PromptTemplate)
        .filter(PromptTemplate.id == uid, PromptTemplate.is_active == True)  # noqa: E712
        .first()
    )
    return template.content if template else None


def build_final_prompt(
    system_prompt: Optional[str],
    template_content: Optional[str],
    user_input: str,
) -> str:
    """Concatenate: system_prompt + template_content + user_input."""
    parts = [
        p.strip()
        for p in [system_prompt, template_content, user_input]
        if p and p.strip()
    ]
    return ", ".join(parts)


def activate_system_prompt(db: Session, prompt_id: uuid.UUID) -> SystemPrompt:
    """Atomically deactivate all system prompts and activate the given one."""
    db.query(SystemPrompt).filter(SystemPrompt.is_active == True).update(  # noqa: E712
        {"is_active": False}, synchronize_session="fetch"
    )
    prompt = db.query(SystemPrompt).filter(SystemPrompt.id == prompt_id).first()
    if not prompt:
        raise ValueError(f"SystemPrompt {prompt_id} not found")
    prompt.is_active = True
    db.commit()
    db.refresh(prompt)
    return prompt
