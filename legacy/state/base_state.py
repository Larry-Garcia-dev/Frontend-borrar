"""Application state for generation and gallery features."""

import asyncio

import httpx
import reflex as rx

from state.auth_state import AuthState, BACKEND_URL

# Interval in seconds between task-status polls.
POLL_INTERVAL = 3


class BaseState(AuthState):
    """Central application state shared across protected pages."""

    # ------------------------------------------------------------------
    # Generation form state
    # ------------------------------------------------------------------
    prompt: str = ""
    negative_prompt: str = ""
    media_type: str = "image"  # "image" | "video"
    is_generating: bool = False
    generation_error: str = ""

    # Active Celery task being polled
    _active_task_id: str = ""

    # ------------------------------------------------------------------
    # Gallery
    # ------------------------------------------------------------------
    media_items: list[dict] = []

    async def protected_page_on_load(self):
        """Route guard + initial data load for protected pages."""
        if not self.is_authenticated or not self.access_token:
            yield rx.redirect("/")
            return

        await self._load_media()

    # ==================================================================
    # Generation actions
    # ==================================================================

    def set_prompt(self, value: str):
        self.prompt = value

    def set_negative_prompt(self, value: str):
        self.negative_prompt = value

    def set_media_type(self, value: str):
        self.media_type = value

    async def submit_generation(self):
        """Submit a generation request to the FastAPI backend."""
        if not self.is_authenticated:
            self.generation_error = "You must be signed in to generate media."
            return
        if not self.prompt.strip():
            self.generation_error = "Please enter a prompt."
            return

        self.is_generating = True
        self.generation_error = ""

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{BACKEND_URL}/generation/",
                json={
                    "prompt": self.prompt,
                    "negative_prompt": self.negative_prompt,
                    "media_type": self.media_type,
                },
                headers={"Authorization": f"Bearer {self.access_token}"},
            )

        if resp.status_code not in (200, 201):
            self.is_generating = False
            self.generation_error = f"Generation request failed: {resp.text}"
            return

        data = resp.json()
        self._active_task_id = data.get("task_id", "")
        # Start polling
        return BaseState.poll_task_status

    async def poll_task_status(self):
        """Repeatedly poll the backend until the task is finished."""
        if not self._active_task_id:
            return

        while True:
            await asyncio.sleep(POLL_INTERVAL)
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{BACKEND_URL}/generation/{self._active_task_id}",
                    headers={"Authorization": f"Bearer {self.access_token}"},
                )

            if resp.status_code != 200:
                self.is_generating = False
                self.generation_error = "Failed to get task status."
                self._active_task_id = ""
                return

            data = resp.json()
            status = data.get("status", "")

            if status == "success":
                self.is_generating = False
                self._active_task_id = ""
                self.prompt = ""
                self.negative_prompt = ""
                await self._load_media()
                return

            if status in ("failure", "revoked"):
                self.is_generating = False
                self.generation_error = f"Generation failed (status: {status})."
                self._active_task_id = ""
                return

            # Still pending / started - yield to update the UI and keep polling
            yield

    # ==================================================================
    # Gallery
    # ==================================================================

    async def _load_media(self):
        """Fetch the current user's media items from the backend."""
        if not self.is_authenticated:
            return
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{BACKEND_URL}/generation/",
                headers={"Authorization": f"Bearer {self.access_token}"},
            )
        if resp.status_code == 200:
            self.media_items = resp.json()

    def logout(self):
        """Clear local app and auth state."""
        self.prompt = ""
        self.negative_prompt = ""
        self.media_type = "image"
        self.is_generating = False
        self.generation_error = ""
        self._active_task_id = ""
        self.media_items = []
        return super().logout()
