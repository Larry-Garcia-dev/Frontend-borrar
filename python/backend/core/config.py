import ssl
from pathlib import Path
from typing import List, Union

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load backend/.env, not cwd/.env (uvicorn may run from repo root).
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
    )

    PROJECT_NAME: str = "AI Model Generator"
    API_V1_STR: str = "/api/v1"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/ai_generator"

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours
    ALGORITHM: str = "HS256"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/callback"
    # Alibaba Model Studio
    ALIBABA_API_KEY: str = Field(
        default="",
        validation_alias=AliasChoices("ALIBABA_API_KEY", "DASHSCOPE_API_KEY"),
    )
    ALIBABA_API_BASE_URL: str = "https://dashscope-intl.aliyuncs.com/api/v1"

    # Outbound HTTPS (httpx) — see get_httpx_verify().
    HTTPX_SSL_VERIFY: bool = True
    # truststore + Celery prefork (fork) on macOS can SIGSEGV (Security.framework). Default off.
    HTTPX_USE_TRUSTSTORE: bool = False
    SSL_CA_BUNDLE: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SSL_CA_BUNDLE",
            "REQUESTS_CA_BUNDLE",
            "SSL_CERT_FILE",
        ),
    )

    # Storage
    STORAGE_BUCKET: str = ""
    STORAGE_ENDPOINT: str = ""
    STORAGE_ACCESS_KEY: str = ""
    STORAGE_SECRET_KEY: str = ""

    # Alibaba OSS (S3-compatible) for generated media
    OSS_ACCESS_KEY_ID: str = ""
    OSS_ACCESS_KEY_SECRET: str = ""
    OSS_BUCKET_NAME: str = ""
    OSS_ENDPOINT: str = ""          # e.g. "https://oss-cn-hangzhou.aliyuncs.com"
    OSS_PUBLIC_URL_BASE: str = ""   # e.g. "https://mi-bucket.oss-cn-hangzhou.aliyuncs.com"


settings = Settings()


def _merged_certifi_and_extra_ca(extra_pem: Path) -> str:
    """Append corporate/extra CAs to Mozilla bundle (TLS inspection / custom roots)."""
    import certifi

    base_path = Path(certifi.where())
    base = base_path.read_bytes().rstrip() + b"\n"
    extra = extra_pem.read_bytes().strip() + b"\n"
    merged_bytes = base + extra

    out_dir = _BACKEND_DIR / ".cache"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "merged-ca-bundle.pem"
    meta = out.with_suffix(".pem.meta")

    sig = f"{extra_pem.resolve()}:{extra_pem.stat().st_mtime}:{base_path}:{base_path.stat().st_mtime}"
    if out.exists() and meta.exists() and meta.read_text(encoding="utf-8").strip() == sig:
        return str(out.resolve())

    out.write_bytes(merged_bytes)
    meta.write_text(sig, encoding="utf-8")
    return str(out.resolve())


def get_httpx_verify() -> Union[bool, str, ssl.SSLContext]:
    """Trust anchors for httpx.

    - ``HTTPX_SSL_VERIFY=false``: no verificar (solo desarrollo).
    - ``SSL_CA_BUNDLE=/ruta.pem``: fusiona ese PEM con **certifi** para confiar en Internet
      y en la CA corporativa (inspección TLS en VPN).
    - Si solo certifi falla en la empresa, pide el PEM raíz a IT o usa ``HTTPX_SSL_VERIFY=false``.
    - ``HTTPX_USE_TRUSTSTORE=true``: solo con ``celery --pool=solo`` en Mac (evita SIGSEGV con prefork).
    """
    if not settings.HTTPX_SSL_VERIFY:
        return False
    bundle = (settings.SSL_CA_BUNDLE or "").strip()
    if bundle:
        extra = Path(bundle).expanduser()
        if extra.is_file():
            try:
                return _merged_certifi_and_extra_ca(extra)
            except ImportError:
                return str(extra.resolve())
        return bundle
    if settings.HTTPX_USE_TRUSTSTORE:
        try:
            import truststore

            return truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        except ImportError:
            pass
    try:
        import certifi

        return certifi.where()
    except ImportError:
        pass
    return True
