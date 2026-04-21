"""Client for the Alibaba Model Studio (DashScope) API."""

import json
import logging
from typing import Any, Optional

import httpx

from core.config import get_httpx_verify, settings
from services.model_config import (
    MULTIMODAL_ENDPOINT,
    IMAGE_GENERATION_ASYNC_ENDPOINT,
    VIDEO_ENDPOINT,
    IMAGE2IMAGE_MODELS,
)

logger = logging.getLogger(__name__)

# Valid wan2.x image sizes (width, height). Minimum 1280×1280, max ~1440×1440.
# Aspect ratios supported: between 1:4 and 4:1.
_WAN_IMAGE_SIZES: list[tuple[int, int]] = [
    (1280, 1280),  # 1:1
    (1104, 1472),  # 3:4
    (1472, 1104),  # 4:3
    (960, 1696),   # 9:16
    (1696, 960),   # 16:9
    (856, 1536),   # ~9:16 alt
    (1536, 856),   # ~16:9 alt
]


def _map_to_wan_size(width: int, height: int) -> str:
    """Map any requested (width, height) to the nearest valid wan2.x image size."""
    target_ratio = width / max(height, 1)
    best = min(_WAN_IMAGE_SIZES, key=lambda s: abs(s[0] / s[1] - target_ratio))
    return f"{best[0]}*{best[1]}"


class AlibabaAPIClient:
    """Thin async wrapper around the Alibaba Model Studio REST API."""

    def __init__(self) -> None:
        self.base_url = settings.ALIBABA_API_BASE_URL
        self.api_key = settings.ALIBABA_API_KEY
        self._verify = get_httpx_verify()

    @property
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            # Matches the Node.js flow shared by the user.
            "X-DashScope-DataInspection": json.dumps(
                {"input": "disable", "output": "disable"}
            ),
        }

    def _ensure_configured(self) -> None:
        """Fail fast when the DashScope API key is missing or still a placeholder."""
        normalized_key = (self.api_key or "").strip()
        if not normalized_key or normalized_key == "your-alibaba-api-key":
            raise RuntimeError(
                "ALIBABA_API_KEY no está configurada en backend/.env. "
                "Reemplaza el placeholder por una API key real de DashScope y reinicia backend + worker."
            )

    def _merge_reference_urls(
        self,
        reference_image_urls: Optional[list[str]],
        reference_image_url: Optional[str],
    ) -> list[str]:
        ordered: list[str] = []
        seen: set[str] = set()
        for raw in [*(reference_image_urls or []), reference_image_url or ""]:
            u = (raw or "").strip()
            if u and u not in seen:
                seen.add(u)
                ordered.append(u)
        return ordered

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        model: str = "qwen-image-2.0-pro",
        reference_image_urls: Optional[list[str]] = None,
        reference_image_url: Optional[str] = None,
        n: int = 1,
        prompt_extend: bool = True,
        watermark: bool = False,
        **kwargs: Any,
    ) -> dict:
        """Submit a DashScope image generation/edit request."""
        self._ensure_configured()
        ref_urls = self._merge_reference_urls(reference_image_urls, reference_image_url)
        content: list[dict[str, str]] = []
        for image_url in ref_urls:
            content.append({"image": image_url})
        content.append({"text": prompt})

        payload = {
            "model": model,
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": content,
                    }
                ]
            },
            "parameters": {
                "n": max(1, n),
                "negative_prompt": negative_prompt,
                "prompt_extend": prompt_extend,
                "watermark": watermark,
                "size": f"{width}*{height}",
                **kwargs,
            },
        }
        async with httpx.AsyncClient(
            timeout=90,
            follow_redirects=True,
            verify=self._verify,
        ) as client:
            resp = await client.post(
                f"{self.base_url}/services/aigc/multimodal-generation/generation",
                headers=self._headers,
                json=payload,
            )
        if resp.is_error:
            body_preview = (resp.text or "")[:4000]
            logger.error(
                "DashScope multimodal-generation failed: status=%s body=%s",
                resp.status_code,
                body_preview,
            )
            raise RuntimeError(
                f"DashScope error HTTP {resp.status_code}: {body_preview or resp.reason_phrase}"
            )
        return resp.json()

    async def generate_wan_image(
        self,
        prompt: str,
        model: str,
        negative_prompt: str = "",
        width: int = 1280,
        height: int = 1280,
        ref_image_b64: Optional[str] = None,
        n: int = 1,
    ) -> dict:
        """Submit an image generation/editing request to DashScope.

        Two distinct paths depending on whether reference images are present:

        TEXT-TO-IMAGE (wan2.6-image, no ref image):
          - Endpoint: IMAGE_GENERATION_ASYNC_ENDPOINT
          - Header: X-DashScope-Async: enable
          - Parameter: enable_interleave=True, max_images instead of n
          - Returns task_id for polling

        IMAGE-TO-IMAGE (wan2.7-image-pro, ref image provided):
          - Endpoint: MULTIMODAL_ENDPOINT (synchronous/async)
          - Image placed before text in messages content array
          - Uses n for count
        """
        self._ensure_configured()
        size = _map_to_wan_size(width, height)

        if model not in IMAGE2IMAGE_MODELS:
            # ── Text-to-image: wan2.6-image async path ──────────────────────
            content: list[dict[str, str]] = [{"text": prompt}]
            payload: dict[str, Any] = {
                "model": model,
                "input": {
                    "messages": [{"role": "user", "content": content}]
                },
                "parameters": {
                    "size": size,
                    "max_images": max(1, n),
                    "negative_prompt": negative_prompt,
                    "enable_interleave": True,
                    "prompt_extend": False,
                    "watermark": False,
                },
            }
            async_headers = {**self._headers, "X-DashScope-Async": "enable"}
            endpoint = IMAGE_GENERATION_ASYNC_ENDPOINT
            logger.info("Sending t2i async request to %s (model=%s size=%s)", endpoint, model, size)
            async with httpx.AsyncClient(timeout=30, follow_redirects=True, verify=self._verify) as client:
                resp = await client.post(
                    f"{self.base_url}{endpoint}",
                    headers=async_headers,
                    json=payload,
                )
        else:
            # ── Image-to-image: wan2.7-image-pro multimodal path ────────────
            content = []
            if ref_image_b64:
                content.append({"image": ref_image_b64})
            content.append({"text": prompt})
            payload = {
                "model": model,
                "input": {
                    "messages": [{"role": "user", "content": content}]
                },
                "parameters": {
                    "size": size,
                    "n": max(1, n),
                    "negative_prompt": negative_prompt,
                    "prompt_extend": False,
                    "watermark": False,
                },
            }
            endpoint = MULTIMODAL_ENDPOINT
            logger.info("Sending i2i request to %s (model=%s size=%s)", endpoint, model, size)
            async with httpx.AsyncClient(timeout=90, follow_redirects=True, verify=self._verify) as client:
                resp = await client.post(
                    f"{self.base_url}{endpoint}",
                    headers=self._headers,
                    json=payload,
                )

        if resp.is_error:
            body_preview = (resp.text or "")[:4000]
            logger.error("DashScope %s failed: status=%s body=%s", endpoint, resp.status_code, body_preview)
            raise RuntimeError(
                f"DashScope error HTTP {resp.status_code}: {body_preview or resp.reason_phrase}"
            )
        return resp.json()

    async def generate_wan_video(
        self,
        prompt: str,
        model: str,
        negative_prompt: str = "",
        ref_image_b64: Optional[str] = None,
    ) -> dict:
        """Submit a video generation request using the Wan2.7 video endpoint.

        - wan2.7-t2v: text-to-video (no reference image required)
        - wan2.7-i2v: image-to-video (ref_image_b64 required)
        """
        self._ensure_configured()

        input_payload: dict[str, Any] = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
        }
        if ref_image_b64:
            input_payload["img_url"] = ref_image_b64

        payload: dict[str, Any] = {
            "model": model,
            "input": input_payload,
        }

        logger.info("Sending video request to %s (model=%s)", VIDEO_ENDPOINT, model)
        async with httpx.AsyncClient(timeout=30, verify=self._verify) as client:
            resp = await client.post(
                f"{self.base_url}{VIDEO_ENDPOINT}",
                headers=self._headers,
                json=payload,
            )
        if resp.is_error:
            body_preview = (resp.text or "")[:4000]
            logger.error(
                "DashScope video failed: status=%s body=%s", resp.status_code, body_preview
            )
            raise RuntimeError(
                f"DashScope error HTTP {resp.status_code}: {body_preview or resp.reason_phrase}"
            )
        return resp.json()

    async def generate_video(
        self,
        prompt: str,
        negative_prompt: str = "",
        model: str = "wanx-v1",
        **kwargs: Any,
    ) -> dict:
        """Submit a video generation request and return the API response."""
        self._ensure_configured()
        payload = {
            "model": model,
            "input": {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
            },
            "parameters": kwargs,
        }
        async with httpx.AsyncClient(timeout=30, verify=self._verify) as client:
            resp = await client.post(
                f"{self.base_url}/services/aigc/video-generation/generation",
                headers=self._headers,
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_task_result(self, task_id: str) -> dict:
        """Poll the status of an Alibaba async generation task."""
        self._ensure_configured()
        async with httpx.AsyncClient(timeout=15, verify=self._verify) as client:
            resp = await client.get(
                f"{self.base_url}/tasks/{task_id}",
                headers=self._headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def download_bytes(self, url: str, timeout: int = 60) -> bytes:
        """Download bytes from a remote URL (generated media)."""
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            verify=self._verify,
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.content


alibaba_client = AlibabaAPIClient()
