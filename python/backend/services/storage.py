"""Object storage abstraction (supports local filesystem and S3-compatible stores)."""

import logging
import uuid
from pathlib import Path
from typing import Optional

from core.config import settings

# Resolve media dir relative to the backend package (not process cwd).
# Celery is often started from the repo root; Uvicorn from `backend/` — without
# this, workers write to ./media while StaticFiles serves backend/media → 404.
_BACKEND_DIR = Path(__file__).resolve().parent.parent

logger = logging.getLogger(__name__)

# Try to import boto3 for S3-compatible storage; fall back to local FS.
try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError

    _S3_AVAILABLE = True
except ImportError:
    _S3_AVAILABLE = False


class StorageClient:
    """Upload and retrieve generated media files.

    When STORAGE_BUCKET is configured and boto3 is available the client uses
    S3-compatible object storage.  Otherwise files are saved to a local
    ``media/`` directory (useful for development).
    """

    def __init__(self) -> None:
        self.bucket = settings.STORAGE_BUCKET
        self.use_s3 = bool(self.bucket) and _S3_AVAILABLE

        if self.use_s3:
            self._s3 = boto3.client(
                "s3",
                endpoint_url=settings.STORAGE_ENDPOINT or None,
                aws_access_key_id=settings.STORAGE_ACCESS_KEY,
                aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            )

        self._local_root = _BACKEND_DIR / "media"
        if not self.use_s3:
            self._local_root.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def upload_bytes(
        self,
        data: bytes,
        extension: str = "png",
        folder: str = "generated",
    ) -> str:
        """Upload raw bytes and return the storage key."""
        key = f"{folder}/{uuid.uuid4()}.{extension}"
        if self.use_s3:
            self._s3.put_object(Bucket=self.bucket, Key=key, Body=data)
        else:
            dest = self._local_root / key
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
        return key

    def get_url(self, key: str, expires_in: int = 3600) -> str:
        """Return a (pre-signed) URL for the given storage key."""
        if self.use_s3:
            return self._s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        return f"/media/{key}"

    def delete(self, key: str) -> None:
        """Delete an object from storage."""
        if self.use_s3:
            self._s3.delete_object(Bucket=self.bucket, Key=key)
        else:
            path = self._local_root / key
            if path.exists():
                path.unlink()


storage_client = StorageClient()


def _local_upload(file_bytes: bytes, filename: str) -> str:
    """Save bytes to local media/generated/ and return the local URL."""
    ext = Path(filename).suffix.lstrip(".") or "jpg"
    key = storage_client.upload_bytes(file_bytes, extension=ext)
    return storage_client.get_url(key)


def upload_to_oss(
    file_bytes: bytes,
    filename: str,
    content_type: str = "image/jpeg",
) -> str:
    """Upload bytes and return a public URL.

    Uses LOCAL storage while OSS_BUCKET_NAME is not configured.
    Set OSS_* env vars and uncomment the OSS PRODUCTION block below
    to switch to Alibaba OSS.
    """
    # ── LOCAL STORAGE (default for tests/development) ────────────────────────
    if not settings.OSS_BUCKET_NAME:
        logger.debug("OSS_BUCKET_NAME not set — saving to local media/generated/.")
        return _local_upload(file_bytes, filename)

    # --- OSS PRODUCTION ---
    # Uncomment this block when OSS credentials are configured in .env:
    #   OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET_NAME,
    #   OSS_ENDPOINT, OSS_PUBLIC_URL_BASE
    #
    # if not _S3_AVAILABLE:
    #     logger.warning("boto3 not installed; falling back to local storage.")
    #     return _local_upload(file_bytes, filename)
    # try:
    #     oss_client = boto3.client(
    #         "s3",
    #         aws_access_key_id=settings.OSS_ACCESS_KEY_ID,
    #         aws_secret_access_key=settings.OSS_ACCESS_KEY_SECRET,
    #         endpoint_url=settings.OSS_ENDPOINT,
    #         config=Config(signature_version="s3v4"),
    #     )
    #     oss_client.put_object(
    #         Bucket=settings.OSS_BUCKET_NAME,
    #         Key=filename,
    #         Body=file_bytes,
    #         ContentType=content_type,
    #     )
    #     public_url = f"{settings.OSS_PUBLIC_URL_BASE.rstrip('/')}/{filename}"
    #     logger.info("Uploaded to OSS: %s", public_url)
    #     return public_url
    # except Exception as exc:
    #     logger.error("OSS upload failed for %s: %s. Falling back to local.", filename, exc)
    #     return _local_upload(file_bytes, filename)
    # --- END OSS PRODUCTION ---

    # Should not reach here unless OSS block above is not yet uncommented.
    logger.warning("OSS_BUCKET_NAME set but OSS block is commented — falling back to local storage.")
    return _local_upload(file_bytes, filename)
