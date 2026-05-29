import logging
from typing import Any, Optional
import httpx

from services.model_config import (
    MULTIMODAL_ENDPOINT,
    IMAGE_GENERATION_ASYNC_ENDPOINT,
    IMAGE2IMAGE_MODELS,
)

logger = logging.getLogger(__name__)

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
    target_ratio = width / max(height, 1)
    best = min(_WAN_IMAGE_SIZES, key=lambda s: abs(s[0] / s[1] - target_ratio))
    return f"{best[0]}*{best[1]}"

class AlibabaImageMixin:
    """Lógica específica para la generación de imágenes."""

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
        self, prompt: str, negative_prompt: str = "", width: int = 1024, height: int = 1024,
        model: str = "qwen-image-2.0-pro", reference_image_urls: Optional[list[str]] = None,
        reference_image_url: Optional[str] = None, n: int = 1, prompt_extend: bool = True, 
        watermark: bool = False, **kwargs: Any
    ) -> dict:
        self._ensure_configured() # Provisto por BaseClient
        ref_urls = self._merge_reference_urls(reference_image_urls, reference_image_url)
        content: list[dict[str, str]] = []
        for image_url in ref_urls:
            content.append({"image": image_url})
        content.append({"text": prompt})

        payload = {
            "model": model,
            "input": {"messages": [{"role": "user", "content": content}]},
            "parameters": {
                "n": max(1, n), "negative_prompt": negative_prompt, "prompt_extend": prompt_extend,
                "watermark": watermark, "size": f"{width}*{height}", **kwargs
            },
        }
        async with httpx.AsyncClient(timeout=90, follow_redirects=True, verify=self._verify) as client:
            resp = await client.post(
                f"{self.base_url}/services/aigc/multimodal-generation/generation",
                headers=self._headers, json=payload,
            )
        if resp.is_error:
            body_preview = (resp.text or "")[:4000]
            logger.error("DashScope multimodal failed: status=%s body=%s", resp.status_code, body_preview)
            raise RuntimeError(f"DashScope error HTTP {resp.status_code}: {body_preview or resp.reason_phrase}")
        return resp.json()

    async def generate_wan_image(
        self, prompt: str, model: str, negative_prompt: str = "", width: int = 1280, height: int = 1280,
        ref_images_b64: Optional[list[str]] = None, n: int = 1,
    ) -> dict:
        """Generador Wan2.x. AHORA ACEPTA Y PROCESA UNA LISTA DE IMÁGENES BASE64"""
        self._ensure_configured()
        size = _map_to_wan_size(width, height)

        if model not in IMAGE2IMAGE_MODELS:
            # ── Text-to-image fallback path (currently unused since all image
            #    generation uses wan2.7-image-pro via IMAGE2IMAGE_MODELS) ─────
            content: list[dict[str, str]] = [{"text": prompt}]
            payload: dict[str, Any] = {
                "model": model,
                "input": {"messages": [{"role": "user", "content": content}]},
                "parameters": {
                    "size": size, "max_images": max(1, n), "negative_prompt": negative_prompt,
                    "enable_interleave": True, "prompt_extend": False, "watermark": False,
                },
            }
            async_headers = {**self._headers, "X-DashScope-Async": "enable"}
            endpoint = IMAGE_GENERATION_ASYNC_ENDPOINT
            logger.info("Sending t2i async request to %s (model=%s size=%s)", endpoint, model, size)
            
            async with httpx.AsyncClient(timeout=30, follow_redirects=True, verify=self._verify) as client:
                resp = await client.post(f"{self.base_url}{endpoint}", headers=async_headers, json=payload)
        else:
            # ── wan2.7-image-pro: unified multimodal path (text-to-image & image-to-image) ──
            content = []
            
            # NUEVO COMPORTAMIENTO: Iteramos la lista de referencias
            # Las imágenes base64 deben tener el prefijo data:image para ser reconocidas
            if ref_images_b64:
                for img_b64 in ref_images_b64:
                    # Si ya tiene prefijo data: usamos tal cual, si no lo agregamos
                    if img_b64.startswith("data:"):
                        content.append({"image": img_b64})
                    else:
                        # Agregar prefijo data URI para que DashScope reconozca como inline data
                        content.append({"image": f"data:image/jpeg;base64,{img_b64}"})
                    
            content.append({"text": prompt})
            
            payload = {
                "model": model,
                "input": {"messages": [{"role": "user", "content": content}]},
                "parameters": {
                    "size": size, "n": max(1, n), "negative_prompt": negative_prompt,
                    "prompt_extend": False, "watermark": False,
                },
            }
            endpoint = MULTIMODAL_ENDPOINT
            logger.info("Sending i2i request to %s (model=%s size=%s)", endpoint, model, size)
            async with httpx.AsyncClient(timeout=90, follow_redirects=True, verify=self._verify) as client:
                resp = await client.post(f"{self.base_url}{endpoint}", headers=self._headers, json=payload)

        if resp.is_error:
            body_preview = (resp.text or "")[:4000]
            logger.error("DashScope %s failed: status=%s body=%s", endpoint, resp.status_code, body_preview)
            raise RuntimeError(f"DashScope error HTTP {resp.status_code}: {body_preview or resp.reason_phrase}")
        
        return resp.json()
