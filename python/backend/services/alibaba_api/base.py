import json
import logging
import httpx

from core.config import get_httpx_verify, settings

logger = logging.getLogger(__name__)

class AlibabaBaseClient:
    """Configuración base y utilidades compartidas para la API de Alibaba."""

    def __init__(self) -> None:
        self.base_url = settings.ALIBABA_API_BASE_URL
        self.api_key = settings.ALIBABA_API_KEY
        self._verify = get_httpx_verify()

    @property
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-DashScope-DataInspection": json.dumps(
                {"input": "disable", "output": "disable"}
            ),
        }

    def _ensure_configured(self) -> None:
        """Falla rápido si la API Key no está configurada correctamente."""
        normalized_key = (self.api_key or "").strip()
        if not normalized_key or normalized_key == "your-alibaba-api-key":
            raise RuntimeError(
                "ALIBABA_API_KEY no está configurada en backend/.env. "
                "Reemplaza el placeholder por una API key real de DashScope y reinicia backend + worker."
            )

    async def get_task_result(self, task_id: str) -> dict:
        """Consulta el estado de una tarea asíncrona de generación."""
        self._ensure_configured()
        async with httpx.AsyncClient(timeout=15, verify=self._verify) as client:
            resp = await client.get(
                f"{self.base_url}/tasks/{task_id}",
                headers=self._headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def download_bytes(self, url: str, timeout: int = 60) -> bytes:
        """Descarga bytes (media generada) desde una URL remota."""
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            verify=self._verify,
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.content