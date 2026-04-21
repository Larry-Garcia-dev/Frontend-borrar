"""Centralised model identifiers and pricing for DashScope (Wan2.x / Qwen)."""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Model identifiers
# ---------------------------------------------------------------------------

# Text-to-image: no reference images provided.
# wan2.6-image — photorealistic textures, accurate text rendering, flexible style.
TEXT_TO_IMAGE_MODEL = "wan2.6-image"

# Image-edit / image-to-image: at least one reference image provided.
# wan2.7-image-pro — modifies content via natural language, local/style edits,
# preserves geometric and contextual consistency.
IMAGE_TO_IMAGE_MODEL = "wan2.7-image-pro"

# Text-to-video: no reference images, media_type == video.
# wan2.7-t2v — smooth motion, cinematic aesthetics, precise instruction adherence.
TEXT_TO_VIDEO_MODEL = "wan2.7-t2v"

# Image-to-video: reference image present, media_type == video.
# wan2.7-i2v — generates video from an image while preserving subject/style.
IMAGE_TO_VIDEO_MODEL = "wan2.7-i2v"

# ---------------------------------------------------------------------------
# DashScope API endpoints
# ---------------------------------------------------------------------------

# All Wan2.x image models use the unified multimodal endpoint.
MULTIMODAL_ENDPOINT = "/services/aigc/multimodal-generation/generation"

# Async endpoint for wan2.6-image text-to-image (no reference images).
# Requires X-DashScope-Async: enable header. Returns task_id for polling.
IMAGE_GENERATION_ASYNC_ENDPOINT = "/services/aigc/image-generation/generation"

# Kept for reference only — not used by wan2.x image models.
TEXT2IMAGE_ENDPOINT = "/services/aigc/text2image/image-synthesis"
IMAGE2IMAGE_ENDPOINT = "/services/aigc/image2image/image-synthesis"

# Endpoint used by wan2.7-t2v and wan2.7-i2v
VIDEO_ENDPOINT = "/services/aigc/video-generation/generation"

# Which models belong to which family (used for routing decisions)
TEXT2IMAGE_MODELS: frozenset[str] = frozenset({TEXT_TO_IMAGE_MODEL})
IMAGE2IMAGE_MODELS: frozenset[str] = frozenset({IMAGE_TO_IMAGE_MODEL})
VIDEO_MODELS: frozenset[str] = frozenset({TEXT_TO_VIDEO_MODEL, IMAGE_TO_VIDEO_MODEL})

# ---------------------------------------------------------------------------
# Pricing (USD per successful generation)
# ---------------------------------------------------------------------------

MODEL_COST_USD: dict[str, float] = {
    TEXT_TO_IMAGE_MODEL:  0.040,  # wan2.6-image
    IMAGE_TO_IMAGE_MODEL: 0.060,  # wan2.7-image-pro
    TEXT_TO_VIDEO_MODEL:  0.140,  # wan2.7-t2v
    IMAGE_TO_VIDEO_MODEL: 0.140,  # wan2.7-i2v
    # legacy / fallback
    "qwen-image-2.0-pro": 0.014,
}

_DEFAULT_COST_USD = 0.040  # used when the model is not in the dict

# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def get_image_model(has_reference_images: bool) -> str:
    """Return the correct image model based on whether references exist."""
    return IMAGE_TO_IMAGE_MODEL if has_reference_images else TEXT_TO_IMAGE_MODEL


def get_video_model(has_reference_images: bool) -> str:
    """Return the correct video model based on whether references exist."""
    return IMAGE_TO_VIDEO_MODEL if has_reference_images else TEXT_TO_VIDEO_MODEL


def get_cost_usd(model: str) -> float:
    """Return the cost in USD for a given model identifier."""
    return MODEL_COST_USD.get(model, _DEFAULT_COST_USD)
