"""Prompt engineering utilities for the AI generation pipeline."""

import re
from typing import Optional


# ---------------------------------------------------------------------------
# Style presets
# ---------------------------------------------------------------------------

STYLE_PRESETS: dict[str, str] = {
    "photorealistic": "photorealistic, high resolution, 8k, ultra-detailed",
    "anime": "anime style, vibrant colors, clean lines, studio ghibli",
    "oil_painting": "oil painting, impressionist, textured brushstrokes, classical art",
    "cinematic": "cinematic lighting, film grain, anamorphic lens, dramatic shadows",
    "minimalist": "minimalist, clean, simple shapes, flat design, pastel colors",
}

NEGATIVE_PRESET = (
    "blurry, low quality, distorted, deformed, watermark, text, signature, "
    "extra limbs, bad anatomy, jpeg artifacts"
)


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def build_image_prompt(
    user_prompt: str,
    style: Optional[str] = None,
    extra_tags: Optional[list[str]] = None,
) -> str:
    """Enhance a raw user prompt with style tags and quality boosters.

    Args:
        user_prompt: The raw prompt provided by the user.
        style: Optional style preset key (see STYLE_PRESETS).
        extra_tags: Additional comma-separated tags to append.

    Returns:
        An enriched prompt string ready to send to the model.
    """
    parts = [_sanitize(user_prompt)]
    if style and style in STYLE_PRESETS:
        parts.append(STYLE_PRESETS[style])
    if extra_tags:
        parts.extend(extra_tags)
    return ", ".join(parts)


def build_negative_prompt(user_negative: Optional[str] = None) -> str:
    """Merge user-supplied negative tags with the default negative preset."""
    if user_negative:
        return f"{_sanitize(user_negative)}, {NEGATIVE_PRESET}"
    return NEGATIVE_PRESET


def build_video_prompt(
    user_prompt: str,
    motion: Optional[str] = None,
) -> str:
    """Build a video generation prompt with optional motion descriptor."""
    parts = [_sanitize(user_prompt)]
    if motion:
        parts.append(motion)
    parts.append("1ooth motion, high frame rate, cinematic")
    return ", ".join(parts)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _sanitize(text: str) -> str:
    """Strip leading/trailing whitespace and collapse internal whitespace."""
    return re.sub(r"\s+", " ", text).strip()
