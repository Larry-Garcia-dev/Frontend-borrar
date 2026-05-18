import logging
from typing import Any, Optional
import httpx

from services.model_config import VIDEO_ENDPOINT

logger = logging.getLogger(__name__)

class AlibabaVideoMixin:
    """Lógica específica para la generación de video."""

    async def generate_wan_video(
        self, prompt: str, model: str, negative_prompt: str = "", ref_image_b64: Optional[str] = None
    ) -> dict:
        self._ensure_configured() # Provisto por BaseClient

        input_payload: dict[str, Any] = {"prompt": prompt, "negative_prompt": negative_prompt}
        if ref_image_b64:
            input_payload["img_url"] = ref_image_b64

        payload: dict[str, Any] = {"model": model, "input": input_payload}

        logger.info("Sending video request to %s (model=%s)", VIDEO_ENDPOINT, model)
        async with httpx.AsyncClient(timeout=30, verify=self._verify) as client:
            resp = await client.post(
                f"{self.base_url}{VIDEO_ENDPOINT}", headers=self._headers, json=payload,
            )
            
        if resp.is_error:
            body_preview = (resp.text or "")[:4000]
            logger.error("DashScope video failed: status=%s body=%s", resp.status_code, body_preview)
            raise RuntimeError(f"DashScope error HTTP {resp.status_code}: {body_preview or resp.reason_phrase}")
        return resp.json()

    async def generate_video(
        self, prompt: str, negative_prompt: str = "", model: str = "wanx-v1", **kwargs: Any
    ) -> dict:
        self._ensure_configured()
        payload = {
            "model": model,
            "input": {"prompt": prompt, "negative_prompt": negative_prompt},
            "parameters": kwargs,
        }
        async with httpx.AsyncClient(timeout=30, verify=self._verify) as client:
            resp = await client.post(
                f"{self.base_url}/services/aigc/video-generation/generation",
                headers=self._headers, json=payload,
            )
            resp.raise_for_status()
            return resp.json()