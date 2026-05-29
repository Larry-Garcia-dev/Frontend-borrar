"""Generation and admin dashboard state for protected routes."""

import asyncio
from pathlib import Path
from typing import Any, TypedDict

import httpx
import reflex as rx

from state.auth_state import AuthState, BACKEND_URL

POLL_INTERVAL = 3
POLL_MAX_ATTEMPTS = 120
BACKEND_ORIGIN = BACKEND_URL.split("/api/v1", 1)[0]
ADMIN_USERS_URL = f"{BACKEND_ORIGIN}/api/admin/users"
ADMIN_STATS_URL = f"{BACKEND_ORIGIN}/api/admin/stats"
ADMIN_USERS_COST_URL = f"{BACKEND_ORIGIN}/api/admin/users-cost"
VENDOR_USERS_URL = f"{BACKEND_ORIGIN}/api/vendor/users"
CUSTOM_SIZE_OPTION = "Personalizado..."
DEFAULT_SIZE_OPTION = "1080x1080 (1:1)"
SIZE_OPTION_BY_VALUE = {
    DEFAULT_SIZE_OPTION: "1080 x 1080 (Carrusel/Cuadrado 1:1)",
    "1080x1350 (4:5)": "1080 x 1350 (Vertical 4:5)",
    "1200x630 (16:9)": "1200 x 630 (Horizontal 16:9)",
    "100x100 (1:1)": "100 x 100 (Destacado/Icono)",
    CUSTOM_SIZE_OPTION: CUSTOM_SIZE_OPTION,
}
GENERATION_SIZE_OPTIONS = list(SIZE_OPTION_BY_VALUE.values())
SIZE_VALUE_BY_OPTION = {option: value for value, option in SIZE_OPTION_BY_VALUE.items()}
SIZE_DIMENSIONS = {
    DEFAULT_SIZE_OPTION: (1080, 1080),
    "1080x1350 (4:5)": (1080, 1350),
    "1200x630 (16:9)": (1200, 630),
    "100x100 (1:1)": (100, 100),
}
REFERENCE_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
REFERENCE_UPLOAD_ID = "reference_image_upload"
REFERENCE_UPLOAD_MAX_FILES = 8
REFERENCE_UPLOAD_URL = f"{BACKEND_URL}/generation/reference-images"
PROMPT_TEMPLATES_URL = f"{BACKEND_URL}/generation/prompt-templates"


class GalleryItem(TypedDict):
    """Typed shape for dashboard gallery records."""

    id: str
    prompt: str
    media_type: str
    url: str
    status: str
    created_at: str
    edit_count: int


class UserCostEntry(TypedDict):
    """Per-user cost record for admin dashboard."""

    user_id: str
    email: str
    total_cost_usd: float
    media_count: int


class AdminUser(TypedDict):
    """Typed shape for admin table records."""

    id: str
    email: str
    role: str
    quota_used: int
    quota_limit: int
    quota_fill: str
    is_unlimited: bool
    total_cost_usd: float


class GenerationState(AuthState):
    """State for AI generation workflows and admin controls."""

    prompt: str = ""
    negative_prompt: str = ""
    reference_image_urls: list[str] = []
    media_type: str = "image"  # fixed to image; video is disabled in UI
    selected_size: str = DEFAULT_SIZE_OPTION
    custom_width: str = "1080"
    custom_height: str = "1080"
    is_loading: bool = False
    generation_error: str = ""
    current_result_url: str = ""
    current_result_media_type: str = "Photo"
    _active_task_id: str = ""
    _poll_attempts: int = 0
    generation_token_cost: int = 1

    # Prompt templates
    available_templates: list[dict] = []
    selected_template_id: str = ""

    gallery: list[GalleryItem] = []

    users: list[AdminUser] = []
    users_error: str = ""
    users_loading: bool = False
    users_search: str = ""
    editing_user_id: str = ""
    editing_user_role: str = "CREATOR"
    editing_user_unlimited: bool = False
    new_daily_limit: int = 0
    is_edit_modal_open: bool = False
    is_saving_user: bool = False
    edit_error: str = ""

    # Create user modal
    is_create_user_modal_open: bool = False
    new_user_email: str = ""
    new_user_role: str = "CREATOR"
    new_user_daily_limit: int = 10
    new_user_is_unlimited: bool = False
    create_user_error: str = ""
    is_creating_user: bool = False

    # Delete confirmation
    confirm_delete_user_id: str = ""
    confirm_delete_user_email: str = ""
    is_delete_modal_open: bool = False
    is_deleting_user: bool = False

    # Admin stats
    admin_stats_total_users: int = 0
    admin_stats_total_media: int = 0
    admin_stats_admin_count: int = 0
    admin_stats_total_cost_usd: float = 0.0

    # Per-user cost table
    users_cost: list[UserCostEntry] = []

    # Vendor panel state
    vendor_users: list[dict] = []
    is_vendor_user_modal_open: bool = False
    vendor_user_draft_email: str = ""
    vendor_user_draft_limit: int = 100

    # Report modal state (Tarea 3)
    report_modal_open: bool = False
    report_target_media_id: str = ""
    report_reason: str = ""
    report_submitting: bool = False
    report_success: str = ""

    # Admin reports state (Tarea 4)
    admin_reports: list[dict] = []

    # Edit image state (Tarea 5)
    parent_media_id: str = ""
    parent_edit_count: int = 0

    # Admin prompt management state (Tarea 6)
    admin_system_prompts: list[dict] = []
    admin_prompt_templates: list[dict] = []
    new_prompt_name: str = ""
    new_prompt_content: str = ""
    new_template_name: str = ""
    new_template_content: str = ""
    new_template_description: str = ""
    new_template_sort_order: int = 0

    def set_prompt(self, value: str):
        self.prompt = value

    def set_negative_prompt(self, value: str):
        self.negative_prompt = value

    def set_media_type(self, value: str):
        self.media_type = value

    def set_selected_size(self, value: str):
        self.selected_size = SIZE_VALUE_BY_OPTION.get(value, DEFAULT_SIZE_OPTION)
        if self.selected_size != CUSTOM_SIZE_OPTION:
            width, height = SIZE_DIMENSIONS.get(self.selected_size, SIZE_DIMENSIONS[DEFAULT_SIZE_OPTION])
            self.custom_width = str(width)
            self.custom_height = str(height)

    def set_custom_width(self, value: str):
        self.custom_width = "".join(character for character in value if character.isdigit())

    def set_custom_height(self, value: str):
        self.custom_height = "".join(character for character in value if character.isdigit())

    @rx.event
    async def handle_reference_image_upload(self, files: list[rx.UploadFile]):
        """Upload reference images to the API and store public URLs for DashScope."""
        if not files:
            return

        if len(files) > REFERENCE_UPLOAD_MAX_FILES:
            self.reference_image_urls = []
            self.generation_error = f"Máximo {REFERENCE_UPLOAD_MAX_FILES} imágenes de referencia."
            return

        for upload_file in files:
            extension = Path(upload_file.name).suffix.lower()
            if extension and extension not in REFERENCE_IMAGE_EXTENSIONS:
                self.reference_image_urls = []
                self.generation_error = "Las imágenes de referencia deben ser PNG, JPG o WEBP."
                return

        if not self.access_token:
            self.generation_error = "Inicia sesión para subir imágenes de referencia."
            return

        multipart: list[tuple[str, tuple[str, bytes, str]]] = []
        for upload_file in files:
            raw = await upload_file.read()
            name = upload_file.name or "reference.png"
            ctype = upload_file.content_type or "application/octet-stream"
            multipart.append(("files", (name, raw, ctype)))

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    REFERENCE_UPLOAD_URL,
                    files=multipart,
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            data = response.json()
            urls = data.get("urls", [])
            if not isinstance(urls, list) or not urls:
                self.reference_image_urls = []
                self.generation_error = "El servidor no devolvió URLs de referencia."
                return
            self.reference_image_urls = [str(u) for u in urls if u]
            self.generation_error = ""
        except httpx.HTTPStatusError as exc:
            self.reference_image_urls = []
            try:
                payload = exc.response.json()
                detail = payload.get("detail", str(exc))
                if isinstance(detail, list):
                    detail = "; ".join(str(item) for item in detail)
            except (ValueError, TypeError):
                detail = exc.response.text or str(exc)
            self.generation_error = f"Error al subir referencias: {detail}"
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            self.reference_image_urls = []
            self.generation_error = f"Error al subir referencias: {exc}"

    def clear_reference_image(self):
        self.reference_image_urls = []
        return rx.clear_selected_files(REFERENCE_UPLOAD_ID)

    @rx.var
    def has_reference_images(self) -> bool:
        return len(self.reference_image_urls) > 0

    @rx.var
    def tokens_remaining(self) -> int:
        """Remaining image balance for the current user."""
        return max(self.tokens_total - self.tokens_used, 0)

    @rx.var
    def selected_size_option(self) -> str:
        """Display label for the current size preset."""
        return SIZE_OPTION_BY_VALUE.get(self.selected_size, SIZE_OPTION_BY_VALUE[DEFAULT_SIZE_OPTION])

    @rx.var
    def quota_progress(self) -> int:
        """Percent of quota consumed."""
        if self.tokens_total <= 0:
            return 0
        return min(int((self.tokens_used / self.tokens_total) * 100), 100)

    async def protected_page_on_load(self):
        """Guard all internal pages and redirect guests to login."""
        redirect_event = self.guard_protected_route()
        if redirect_event:
            yield redirect_event
            return
        await self.refresh_quota()
        await self._load_gallery()
        await self.load_prompt_templates()

    async def admin_page_on_load(self):
        """Guard admin route and send non-admin users to dashboard."""
        redirect_event = self.guard_admin_route()
        if redirect_event:
            yield redirect_event
            return
        await self.fetch_users()
        await self.load_admin_stats()
        await self.load_users_cost()
        await self.load_admin_reports()
        await self.load_admin_system_prompts()
        await self.load_admin_prompt_templates()

    async def fetch_users(self):
        """Load admin users from backend API and adapt them for table UI."""
        self.users_loading = True
        self.users_error = ""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                users_resp = await client.get(ADMIN_USERS_URL, headers=self._auth_headers())
                cost_resp = await client.get(ADMIN_USERS_COST_URL, headers=self._auth_headers())
            users_resp.raise_for_status()
            payload: list[dict[str, Any]] = users_resp.json()

            cost_by_id: dict[str, float] = {}
            if cost_resp.status_code == 200:
                for row in cost_resp.json():
                    cost_by_id[str(row.get("user_id", ""))] = float(row.get("total_cost_usd", 0.0))

            mapped_users: list[AdminUser] = []
            for row in payload:
                daily_limit = int(row.get("daily_limit", 0) or 0)
                used_quota = int(row.get("used_quota", 0) or 0)
                fill = 0 if daily_limit <= 0 else min(int((used_quota / daily_limit) * 100), 100)
                uid = str(row.get("id", ""))
                mapped_users.append(
                    {
                        "id": uid,
                        "email": str(row.get("email", "")),
                        "role": str(row.get("role", "CREATOR")),
                        "quota_used": used_quota,
                        "quota_limit": daily_limit,
                        "quota_fill": f"{fill}%",
                        "is_unlimited": bool(row.get("is_unlimited", False)),
                        "total_cost_usd": cost_by_id.get(uid, 0.0),
                    }
                )
            self.users = mapped_users
        except (httpx.HTTPError, ValueError):
            self.users = []
            self.users_error = "Unable to load users from backend right now."
        finally:
            self.users_loading = False

    def open_edit_modal(self, user: AdminUser):
        """Open modal with selected user's current daily limit."""
        self.editing_user_id = user["id"]
        self.editing_user_role = user["role"]
        self.editing_user_unlimited = user.get("is_unlimited", False)
        self.new_daily_limit = int(user["quota_limit"])
        self.edit_error = ""
        self.is_edit_modal_open = True

    def set_edit_modal_open(self, is_open: bool):
        """Sync controlled dialog open state with Reflex state."""
        self.is_edit_modal_open = is_open
        if not is_open:
            self.edit_error = ""

    def set_new_daily_limit(self, value: str):
        """Handle numeric input changes from the edit dialog."""
        try:
            parsed = int(value)
        except ValueError:
            parsed = 0
        self.new_daily_limit = max(parsed, 0)

    def close_edit_modal(self):
        """Close edit dialog and clear transient error state."""
        self.is_edit_modal_open = False
        self.edit_error = ""

    async def save_user_changes(self):
        """Persist daily limit, role, and is_unlimited through backend PATCH endpoint."""
        if not self.editing_user_id:
            self.edit_error = "No user selected for editing."
            return

        self.is_saving_user = True
        self.edit_error = ""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.patch(
                    f"{ADMIN_USERS_URL}/{self.editing_user_id}",
                    json={
                        "daily_limit": self.new_daily_limit,
                        "role": self.editing_user_role,
                        "is_unlimited": self.editing_user_unlimited,
                    },
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            self.is_edit_modal_open = False
            self.editing_user_id = ""
            await self.fetch_users()
        except (httpx.HTTPError, ValueError):
            self.edit_error = "Failed to save user changes."
        finally:
            self.is_saving_user = False

    # ── Create user ──────────────────────────────────────────────────────────

    def open_create_user_modal(self):
        self.new_user_email = ""
        self.new_user_role = "CREATOR"
        self.new_user_daily_limit = 10
        self.new_user_is_unlimited = False
        self.create_user_error = ""
        self.is_create_user_modal_open = True

    def close_create_user_modal(self):
        self.is_create_user_modal_open = False
        self.create_user_error = ""

    def set_create_user_modal_open(self, is_open: bool):
        self.is_create_user_modal_open = is_open
        if not is_open:
            self.create_user_error = ""

    def set_new_user_email(self, value: str):
        self.new_user_email = value

    def set_new_user_role(self, value: str):
        self.new_user_role = value

    def set_new_user_daily_limit(self, value: str):
        try:
            parsed = int(value)
        except ValueError:
            parsed = 10
        self.new_user_daily_limit = max(parsed, 0)

    def set_new_user_is_unlimited(self, value: bool):
        self.new_user_is_unlimited = value

    async def create_user(self):
        """Create a new user via backend admin endpoint."""
        if not self.new_user_email.strip():
            self.create_user_error = "El email es obligatorio."
            return
        self.is_creating_user = True
        self.create_user_error = ""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    ADMIN_USERS_URL,
                    json={
                        "email": self.new_user_email.strip(),
                        "role": self.new_user_role,
                        "daily_limit": self.new_user_daily_limit,
                        "is_unlimited": self.new_user_is_unlimited,
                    },
                    headers=self._auth_headers(),
                )
            if response.status_code == 409:
                self.create_user_error = "Ese email ya está registrado."
                return
            response.raise_for_status()
            self.is_create_user_modal_open = False
            await self.fetch_users()
        except (httpx.HTTPError, ValueError):
            self.create_user_error = "Error al crear el usuario."
        finally:
            self.is_creating_user = False

    # ── Delete user ──────────────────────────────────────────────────────────

    def open_delete_modal(self, user: AdminUser):
        self.confirm_delete_user_id = user["id"]
        self.confirm_delete_user_email = user["email"]
        self.is_delete_modal_open = True

    def close_delete_modal(self):
        self.is_delete_modal_open = False
        self.confirm_delete_user_id = ""
        self.confirm_delete_user_email = ""

    def set_delete_modal_open(self, is_open: bool):
        self.is_delete_modal_open = is_open
        if not is_open:
            self.confirm_delete_user_id = ""
            self.confirm_delete_user_email = ""

    async def confirm_delete_user(self):
        """Delete a user via backend admin endpoint."""
        if not self.confirm_delete_user_id:
            return
        self.is_deleting_user = True
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.delete(
                    f"{ADMIN_USERS_URL}/{self.confirm_delete_user_id}",
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            self.is_delete_modal_open = False
            self.confirm_delete_user_id = ""
            self.confirm_delete_user_email = ""
            await self.fetch_users()
        except (httpx.HTTPError, ValueError):
            self.users_error = "Error al eliminar el usuario."
        finally:
            self.is_deleting_user = False

    # ── Reset quota ───────────────────────────────────────────────────────────

    async def reset_user_quota(self, user: AdminUser):
        """Reset a user's used_quota to zero via backend."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{ADMIN_USERS_URL}/{user['id']}/reset-quota",
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            await self.fetch_users()
        except (httpx.HTTPError, ValueError):
            self.users_error = "Error al resetear la cuota."

    # ── Admin stats ───────────────────────────────────────────────────────────

    async def load_admin_stats(self):
        """Fetch aggregate stats for the admin dashboard."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(ADMIN_STATS_URL, headers=self._auth_headers())
            response.raise_for_status()
            data = response.json()
            self.admin_stats_total_users = int(data.get("total_users", 0))
            self.admin_stats_total_media = int(data.get("total_media", 0))
            self.admin_stats_admin_count = int(data.get("admin_count", 0))
            self.admin_stats_total_cost_usd = float(data.get("total_cost_usd", 0.0))
        except (httpx.HTTPError, ValueError):
            pass

    async def load_users_cost(self):
        """Fetch per-user cost breakdown from backend."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(ADMIN_USERS_COST_URL, headers=self._auth_headers())
            response.raise_for_status()
            raw: list[dict] = response.json()
            self.users_cost = [
                {
                    "user_id": str(row.get("user_id", "")),
                    "email": str(row.get("email", "")),
                    "total_cost_usd": float(row.get("total_cost_usd", 0.0)),
                    "media_count": int(row.get("media_count", 0)),
                }
                for row in raw
            ]
        except (httpx.HTTPError, ValueError):
            self.users_cost = []

    # ── Computed vars ─────────────────────────────────────────────────────────

    @rx.var
    def admin_stats_total_cost_usd_str(self) -> str:
        """Formatted total cost string for the admin dashboard card."""
        return f"${self.admin_stats_total_cost_usd:.4f}"

    @rx.var
    def filtered_users(self) -> list[AdminUser]:
        """Users filtered by the search input."""
        if not self.users_search:
            return self.users
        q = self.users_search.lower()
        return [u for u in self.users if q in u["email"].lower()]

    # ── Setters for new user edit fields ─────────────────────────────────────

    def set_editing_user_role(self, value: str):
        self.editing_user_role = value

    def set_editing_user_unlimited(self, value: bool):
        self.editing_user_unlimited = value

    def set_users_search(self, value: str):
        self.users_search = value

    async def load_prompt_templates(self):
        """Fetch active prompt templates from the backend."""
        if not self.is_authenticated:
            return
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    PROMPT_TEMPLATES_URL,
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            raw: list[dict] = response.json()
            self.available_templates = [
                {
                    "id": str(item.get("id", "")),
                    "name": str(item.get("name", "")),
                    "description": str(item.get("description") or ""),
                }
                for item in raw
            ]
        except (httpx.HTTPError, ValueError):
            self.available_templates = []

    def set_selected_template(self, template_id: str):
        """Set selected template by ID."""
        self.selected_template_id = template_id

    def set_selected_template_by_name(self, name: str):
        """Resolve a template name to its ID and store it in selected_template_id."""
        if name == "Sin plantilla" or not name:
            self.selected_template_id = ""
            return
        for t in self.available_templates:
            if t["name"] == name:
                self.selected_template_id = t["id"]
                return
        self.selected_template_id = ""

    @rx.var
    def template_options(self) -> list[str]:
        """Display names for the template selector, including a 'no template' option."""
        names = ["Sin plantilla"] + [t["name"] for t in self.available_templates]
        return names

    @rx.var
    def has_prompt_templates(self) -> bool:
        """True when at least one active template is available."""
        return len(self.available_templates) > 0

    async def start_generation(self):
        redirect_event = self.guard_protected_route()
        if redirect_event:
            return redirect_event
        if not self.prompt.strip():
            self.generation_error = "Please add a prompt before generating."
            return
        if self.tokens_remaining < self.generation_token_cost and not self.parent_media_id:
            self.generation_error = "No tienes suficientes imágenes disponibles."
            return

        prompt_value = self.prompt.strip()
        width, height = self._resolve_dimensions()
        self.is_loading = True
        self.generation_error = ""
        self.current_result_media_type = "Photo"

        payload = {
            "prompt": prompt_value,
            "negative_prompt": self.negative_prompt,
            "media_type": "image",
            "width": width,
            "height": height,
            "num_images": 1,
        }
        if self.reference_image_urls:
            payload["reference_image_urls"] = list(self.reference_image_urls)
        if self.selected_template_id:
            payload["template_id"] = self.selected_template_id
        if self.parent_media_id:
            payload["parent_media_id"] = self.parent_media_id

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    f"{BACKEND_URL}/generation/",
                    json=payload,
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            data = response.json()
            self._active_task_id = str(data.get("task_id", ""))
            self._poll_attempts = 0
            if not self._active_task_id:
                raise ValueError("Backend did not return a task_id.")
            return GenerationState.poll_generation_task
        except (httpx.HTTPError, ValueError) as exc:
            self.generation_error = f"Generation request failed: {exc}"
            self.is_loading = False

    async def poll_generation_task(self):
        """Poll generation task until success/failure and refresh gallery."""
        if not self._active_task_id:
            self.is_loading = False
            return

        last_status = ""
        last_detail = ""
        while True:
            await asyncio.sleep(POLL_INTERVAL)
            self._poll_attempts += 1
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.get(
                        f"{BACKEND_URL}/generation/{self._active_task_id}",
                        headers=self._auth_headers(),
                    )
                response.raise_for_status()
                data = response.json()
            except (httpx.HTTPError, ValueError):
                self.is_loading = False
                self.generation_error = "Unable to read generation status."
                self._active_task_id = ""
                return

            task_status = str(data.get("status", "")).lower()
            task_detail = str(data.get("detail", "")).strip()
            last_status = task_status
            last_detail = task_detail
            if task_status == "success":
                self.is_loading = False
                self.generation_error = ""
                self._active_task_id = ""
                self._poll_attempts = 0
                self.prompt = ""
                self.negative_prompt = ""
                await self.refresh_quota()
                await self._load_gallery()
                return

            if task_status in {"failure", "revoked"}:
                self.is_loading = False
                self.generation_error = task_detail or f"Generation failed (status: {task_status})."
                self._active_task_id = ""
                self._poll_attempts = 0
                return

            if self._poll_attempts >= POLL_MAX_ATTEMPTS:
                self.is_loading = False
                if last_status == "pending":
                    self.generation_error = (
                        "La generación sigue en pending. Verifica que el worker de Celery esté corriendo."
                    )
                elif last_status == "retry":
                    self.generation_error = last_detail or "La generación entró en retry. Revisa los logs del worker."
                else:
                    self.generation_error = (
                        last_detail
                        or f"La generación sigue en estado '{last_status or 'unknown'}' después de varios minutos."
                    )
                self._active_task_id = ""
                self._poll_attempts = 0
                return

            yield

    def mock_edit_limit(self):
        """No-op action placeholder for admin limit editing UI."""

    async def _load_gallery(self):
        """Load real generated media from backend for the current user."""
        if not self.is_authenticated:
            return
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{BACKEND_URL}/generation/",
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            payload: list[dict[str, Any]] = response.json()
        except (httpx.HTTPError, ValueError):
            self.gallery = []
            self.current_result_url = ""
            return

        mapped_gallery: list[GalleryItem] = []
        for row in payload:
            backend_media_type = str(row.get("media_type", "PHOTO")).upper()
            media_type = "Video" if backend_media_type == "VIDEO" else "Photo"
            raw_url = str(row.get("storage_url", ""))
            mapped_gallery.append(
                {
                    "id": str(row.get("id", "")),
                    "prompt": str(row.get("prompt", "")),
                    "media_type": media_type,
                    "url": self._resolve_media_url(raw_url),
                    "status": str(row.get("status", "READY")).upper(),
                    "created_at": str(row.get("created_at", "")),
                    "edit_count": int(row.get("edit_count", 0) or 0),
                }
            )

        self.gallery = mapped_gallery
        if mapped_gallery:
            self.current_result_url = mapped_gallery[0]["url"]
            self.current_result_media_type = mapped_gallery[0]["media_type"]
        else:
            self.current_result_url = ""
            self.current_result_media_type = "Photo"

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"} if self.access_token else {}

    def _resolve_media_url(self, raw_url: str) -> str:
        if raw_url.startswith("/"):
            return f"{BACKEND_ORIGIN}{raw_url}"
        return raw_url

    def _resolve_dimensions(self) -> tuple[int, int]:
        if self.selected_size != CUSTOM_SIZE_OPTION:
            return SIZE_DIMENSIONS.get(self.selected_size, SIZE_DIMENSIONS[DEFAULT_SIZE_OPTION])
        return (
            self._parse_dimension(self.custom_width, 1080),
            self._parse_dimension(self.custom_height, 1080),
        )

    def _parse_dimension(self, value: str, fallback: int) -> int:
        try:
            parsed = int(value)
        except ValueError:
            parsed = fallback
        return max(parsed, 1)

    # ── Vendor panel methods (Tarea 2) ────────────────────────────────────────

    async def load_vendor_users(self):
        """Load users created by this vendor from backend."""
        if not self.access_token:
            return
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(VENDOR_USERS_URL, headers=self._auth_headers())
            response.raise_for_status()
            self.vendor_users = response.json()
        except (httpx.HTTPError, ValueError):
            self.vendor_users = []

    def open_vendor_user_modal(self):
        self.vendor_user_draft_email = ""
        self.vendor_user_draft_limit = 100
        self.is_vendor_user_modal_open = True

    def close_vendor_user_modal(self):
        self.is_vendor_user_modal_open = False

    def set_vendor_user_modal_open(self, is_open: bool):
        self.is_vendor_user_modal_open = is_open

    def set_vendor_user_draft_email(self, value: str):
        self.vendor_user_draft_email = value

    def set_vendor_user_draft_limit(self, value: str):
        try:
            parsed = int(value)
        except ValueError:
            parsed = 100
        self.vendor_user_draft_limit = max(parsed, 0)

    async def create_vendor_user(self):
        """Create a new CREATOR user via vendor endpoint."""
        if not self.vendor_user_draft_email.strip():
            return
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    VENDOR_USERS_URL,
                    json={
                        "email": self.vendor_user_draft_email.strip(),
                        "daily_limit": self.vendor_user_draft_limit,
                    },
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            self.is_vendor_user_modal_open = False
            await self.load_vendor_users()
        except (httpx.HTTPError, ValueError):
            pass

    async def delete_vendor_user(self, user_id: str):
        """Delete a vendor-owned user."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.delete(
                    f"{VENDOR_USERS_URL}/{user_id}",
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            await self.load_vendor_users()
        except (httpx.HTTPError, ValueError):
            pass

    async def vendor_page_on_load(self):
        """Guard vendor route and load vendor users."""
        if not self.is_authenticated or not self.access_token:
            yield rx.redirect("/")
            return
        if not self.is_vendor:
            yield rx.redirect("/dashboard")
            return
        yield GenerationState.load_vendor_users

    # ── Report modal methods (Tarea 3) ────────────────────────────────────────

    def open_report_modal(self, media_id: str):
        self.report_target_media_id = media_id
        self.report_reason = ""
        self.report_success = ""
        self.report_modal_open = True

    def close_report_modal(self):
        self.report_modal_open = False
        self.report_target_media_id = ""
        self.report_reason = ""
        self.report_success = ""

    def set_report_reason(self, value: str):
        self.report_reason = value

    def set_report_modal_open(self, is_open: bool):
        self.report_modal_open = is_open
        if not is_open:
            self.report_reason = ""
            self.report_success = ""

    async def submit_report(self):
        """POST a quality report for a generated image."""
        if not self.report_reason.strip():
            return
        self.report_submitting = True
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{BACKEND_URL}/generation/{self.report_target_media_id}/report",
                    json={"reason": self.report_reason.strip()},
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            self.report_modal_open = False
            self.report_reason = ""
            self.report_success = "Reporte enviado correctamente."
        except (httpx.HTTPError, ValueError):
            self.report_success = ""
        finally:
            self.report_submitting = False

    # ── Admin reports methods (Tarea 4) ───────────────────────────────────────

    async def load_admin_reports(self):
        """Fetch pending reports from backend."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{BACKEND_ORIGIN}/api/admin/reports",
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            self.admin_reports = response.json()
        except (httpx.HTTPError, ValueError):
            self.admin_reports = []

    async def approve_report(self, report_id: str):
        """Approve a report and refund the credit."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{BACKEND_ORIGIN}/api/admin/reports/{report_id}/approve",
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            await self.load_admin_reports()
        except (httpx.HTTPError, ValueError):
            pass

    async def reject_report(self, report_id: str):
        """Reject a report."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{BACKEND_ORIGIN}/api/admin/reports/{report_id}/reject",
                    json={},
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            await self.load_admin_reports()
        except (httpx.HTTPError, ValueError):
            pass

    # ── Edit image methods (Tarea 5) ──────────────────────────────────────────

    @rx.var
    def editing_image(self) -> bool:
        """True when an image is selected for editing."""
        return self.parent_media_id != ""

    @rx.var
    def edits_remaining(self) -> int:
        """Free edits remaining (max 2)."""
        return max(0, 2 - self.parent_edit_count)

    @rx.var
    def edit_is_free(self) -> bool:
        """True when the next edit is free (edit_count < 2)."""
        return self.parent_edit_count < 2

    def start_edit(self, media_id: str, edit_count: int):
        """Pre-load an image for editing and add its URL as reference."""
        self.parent_media_id = media_id
        self.parent_edit_count = edit_count

    def cancel_edit(self):
        """Cancel the current edit session."""
        self.parent_media_id = ""
        self.parent_edit_count = 0

    # ── Admin prompt management methods (Tarea 6) ─────────────────────────────

    def set_new_prompt_name(self, value: str):
        self.new_prompt_name = value

    def set_new_prompt_content(self, value: str):
        self.new_prompt_content = value

    def set_new_template_name(self, value: str):
        self.new_template_name = value

    def set_new_template_content(self, value: str):
        self.new_template_content = value

    def set_new_template_description(self, value: str):
        self.new_template_description = value

    def set_new_template_sort_order(self, value: str):
        try:
            self.new_template_sort_order = int(value)
        except ValueError:
            self.new_template_sort_order = 0

    async def load_admin_system_prompts(self):
        """Fetch all system prompts from backend."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{BACKEND_ORIGIN}/api/admin/prompts/",
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            self.admin_system_prompts = response.json()
        except (httpx.HTTPError, ValueError):
            self.admin_system_prompts = []

    async def create_system_prompt(self):
        """Create a new system prompt."""
        if not self.new_prompt_name.strip() or not self.new_prompt_content.strip():
            return
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{BACKEND_ORIGIN}/api/admin/prompts/",
                    json={
                        "name": self.new_prompt_name.strip(),
                        "content": self.new_prompt_content.strip(),
                        "created_by": self.user_email or "admin",
                    },
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            self.new_prompt_name = ""
            self.new_prompt_content = ""
            await self.load_admin_system_prompts()
        except (httpx.HTTPError, ValueError):
            pass

    async def activate_system_prompt(self, prompt_id: str):
        """Activate a system prompt (deactivates all others)."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{BACKEND_ORIGIN}/api/admin/prompts/{prompt_id}/activate",
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            await self.load_admin_system_prompts()
        except (httpx.HTTPError, ValueError):
            pass

    async def delete_system_prompt(self, prompt_id: str):
        """Delete a system prompt."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.delete(
                    f"{BACKEND_ORIGIN}/api/admin/prompts/{prompt_id}",
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            await self.load_admin_system_prompts()
        except (httpx.HTTPError, ValueError):
            pass

    async def load_admin_prompt_templates(self):
        """Fetch all prompt templates from backend."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{BACKEND_ORIGIN}/api/admin/prompt-templates/",
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            self.admin_prompt_templates = response.json()
        except (httpx.HTTPError, ValueError):
            self.admin_prompt_templates = []

    async def create_prompt_template(self):
        """Create a new prompt template."""
        if not self.new_template_name.strip() or not self.new_template_content.strip():
            return
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{BACKEND_ORIGIN}/api/admin/prompt-templates/",
                    json={
                        "name": self.new_template_name.strip(),
                        "content": self.new_template_content.strip(),
                        "description": self.new_template_description.strip() or None,
                        "sort_order": self.new_template_sort_order,
                        "created_by": self.user_email or "admin",
                    },
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            self.new_template_name = ""
            self.new_template_content = ""
            self.new_template_description = ""
            self.new_template_sort_order = 0
            await self.load_admin_prompt_templates()
        except (httpx.HTTPError, ValueError):
            pass

    async def toggle_template_active(self, template_id: str, is_active: bool):
        """Toggle the is_active flag on a prompt template."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.patch(
                    f"{BACKEND_ORIGIN}/api/admin/prompt-templates/{template_id}",
                    json={"is_active": not is_active},
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            await self.load_admin_prompt_templates()
        except (httpx.HTTPError, ValueError):
            pass

    async def delete_prompt_template(self, template_id: str):
        """Delete a prompt template."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.delete(
                    f"{BACKEND_ORIGIN}/api/admin/prompt-templates/{template_id}",
                    headers=self._auth_headers(),
                )
            response.raise_for_status()
            await self.load_admin_prompt_templates()
        except (httpx.HTTPError, ValueError):
            pass

    def logout(self):
        """Clear generation-specific values plus auth state."""
        self.prompt = ""
        self.negative_prompt = ""
        self.reference_image_urls = []
        self.media_type = "image"
        self.selected_size = DEFAULT_SIZE_OPTION
        self.custom_width = "1080"
        self.custom_height = "1080"
        self.is_loading = False
        self.generation_error = ""
        self.current_result_url = ""
        self.current_result_media_type = "Photo"
        self._poll_attempts = 0
        self.gallery = []
        self.available_templates = []
        self.selected_template_id = ""
        return super().logout()
