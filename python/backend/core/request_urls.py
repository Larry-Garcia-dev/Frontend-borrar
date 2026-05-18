"""Build absolute URLs from inbound HTTP requests (reverse proxy / ngrok aware)."""

from starlette.requests import Request


def absolute_base_url(request: Request) -> str:
    """Public origin for this API as seen by the client (Forwarded-* aware)."""
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")
    scheme = (forwarded_proto or request.url.scheme or "http").split(",")[0].strip()
    host = (forwarded_host or request.headers.get("host") or "").split(",")[0].strip()
    if not host:
        host = request.url.netloc or "localhost:8000"
    return f"{scheme}://{host}".rstrip("/")
