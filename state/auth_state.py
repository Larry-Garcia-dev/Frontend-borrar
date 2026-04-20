"""Authentication state and route guards for the Reflex frontend."""

import httpx
import reflex as rx

# The FastAPI backend base URL (can be overridden via rxconfig.py / environment).
BACKEND_URL = "http://localhost:8000/api/v1"


class AuthState(rx.State):
    """Authentication state shared by protected pages."""

    # Reflex 0.5.x Cookie does not expose an httponly option.
    # Use secure + same_site at the framework level for now.
    access_token: str = rx.Cookie(
        "",
        name="mf_access_token",
        secure=True,
        same_site="lax",
    )

    user_email: str = ""
    user_id: str = ""
    user_avatar: str = ""
    is_authenticated: bool = False
    is_admin: bool = False
    user_role: str = ""
    auth_error: str = ""

    # Quota synced from backend on login and on each refresh
    tokens_total: int = 10
    tokens_used: int = 0
    is_unlimited: bool = False
    quota_reset_at: str = ""

    def redirect_to_google_login(self):
        """Redirect user to backend Google OAuth endpoint."""
        return rx.redirect(f"{BACKEND_URL}/auth/google")

    @rx.var
    def is_vendor(self) -> bool:
        """True when the logged-in user has role VENDOR."""
        return self.user_role.upper() == "VENDOR"

    @rx.var
    def credits_expired(self) -> bool:
        """True when quota_reset_at is set and has already passed."""
        if not self.quota_reset_at:
            return False
        try:
            from datetime import datetime, timezone
            reset = datetime.fromisoformat(self.quota_reset_at.replace("Z", "+00:00"))
            return datetime.now(timezone.utc) >= reset
        except (ValueError, TypeError):
            return False

    @rx.var
    def quota_reset_display(self) -> str:
        """Format quota_reset_at as DD/MM/YYYY for display."""
        if not self.quota_reset_at:
            return ""
        try:
            from datetime import datetime
            reset = datetime.fromisoformat(self.quota_reset_at.replace("Z", "+00:00"))
            return reset.strftime("%d/%m/%Y")
        except (ValueError, TypeError):
            return ""

    def guard_protected_route(self):
        """Redirect unauthenticated users to the login page."""
        if not self.is_authenticated or not self.access_token:
            return rx.redirect("/")

    def guard_public_route(self):
        """Redirect already-authenticated users away from login route."""
        if self.is_authenticated and self.access_token:
            return rx.redirect("/dashboard")

    def guard_admin_route(self):
        """Protect admin route and redirect non-admin users."""
        if not self.is_authenticated or not self.access_token:
            return rx.redirect("/")
        if not self.is_admin:
            return rx.redirect("/dashboard")

    async def handle_google_callback(self):
        """Exchange Google OAuth code for JWT and user information."""
        params = self.router.page.params
        code = params.get("code", "")
        if not code:
            self.auth_error = "Missing OAuth code in callback URL."
            yield rx.redirect("/")
            return

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{BACKEND_URL}/auth/google/callback",
                params={"code": code},
            )

        if resp.status_code != 200:
            self.auth_error = f"Authentication failed: {resp.text}"
            yield rx.redirect("/")
            return

        data = resp.json()
        self.access_token = data.get("access_token", "")
        self.user_email = data.get("email", "")
        self.user_id = data.get("user_id", "")
        self.user_avatar = data.get("avatar_url", "") or data.get("picture", "")
        self.is_authenticated = bool(self.access_token)
        self.is_admin = self.user_email.strip().lower() in [
            "santoles5@gmail.com",
            "larry.garcia@macondosoftwares.com"
        ]
   
        self.user_role = data.get("role", "CREATOR")

        # Sync real quota from backend
        self.tokens_total = int(data.get("daily_limit", 10) or 10)
        self.tokens_used = int(data.get("used_quota", 0) or 0)
        self.is_unlimited = bool(data.get("is_unlimited", False))
        self.quota_reset_at = data.get("quota_reset_at", "") or ""

        if not self.is_authenticated:
            self.auth_error = "Authentication failed: empty token."
            yield rx.redirect("/")
            return

        self.auth_error = ""
        yield rx.redirect("/dashboard")

    async def refresh_quota(self):
        """Re-fetch the current user's quota from the backend."""
        if not self.access_token:
            return
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{BACKEND_URL}/auth/me",
                    headers={"Authorization": f"Bearer {self.access_token}"},
                )
            if resp.status_code == 200:
                data = resp.json()
                self.tokens_total = int(data.get("daily_limit", self.tokens_total) or self.tokens_total)
                self.tokens_used = int(data.get("used_quota", self.tokens_used) or self.tokens_used)
                self.is_unlimited = bool(data.get("is_unlimited", self.is_unlimited))
                self.quota_reset_at = data.get("quota_reset_at", self.quota_reset_at) or self.quota_reset_at
                if data.get("role"):
                    self.user_role = data["role"]
        except (httpx.HTTPError, ValueError):
            pass

    def logout(self):
        """Clear auth state and return to login page."""
        self.access_token = ""
        self.user_email = ""
        self.user_id = ""
        self.user_avatar = ""
        self.is_authenticated = False
        self.is_admin = False
        self.user_role = ""
        self.tokens_total = 10
        self.tokens_used = 0
        self.is_unlimited = False
        self.quota_reset_at = ""
        return rx.redirect("/")
