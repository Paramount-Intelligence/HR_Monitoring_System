"""Call recording storage — local dev filesystem or S3-compatible (Railway Bucket)."""
from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "audio/webm",
    "video/webm",
    "audio/ogg",
    "video/ogg",
    "audio/mp4",
    "video/mp4",
}


class CallRecordingStorageConfigError(RuntimeError):
    """Raised when S3 storage is requested but required configuration is missing."""


def log_call_recordings_storage_config() -> None:
    """Log storage driver configuration at startup (never log secrets)."""
    driver = settings.resolved_call_recordings_driver()
    if driver == "s3":
        flags = settings.call_recordings_s3_config_flags()
        logger.info(
            "[CALL_RECORDINGS_STORAGE] driver=s3 endpoint_configured=%s bucket_configured=%s "
            "access_key_configured=%s secret_configured=%s url_style=%s",
            flags["endpoint_configured"],
            flags["bucket_configured"],
            flags["access_key_configured"],
            flags["secret_configured"],
            settings.s3_url_style or "virtual",
        )
    else:
        logger.info("[CALL_RECORDINGS_STORAGE] driver=local")


def _missing_s3_fields() -> list[str]:
    missing: list[str] = []
    flags = settings.call_recordings_s3_config_flags()
    if not flags["endpoint_configured"]:
        missing.append("AWS_ENDPOINT_URL")
    if not flags["bucket_configured"]:
        missing.append("AWS_S3_BUCKET_NAME")
    if not flags["access_key_configured"]:
        missing.append("AWS_ACCESS_KEY_ID")
    if not flags["secret_configured"]:
        missing.append("AWS_SECRET_ACCESS_KEY")
    return missing


class CallRecordingStorageService:
    def __init__(self) -> None:
        self.driver = settings.resolved_call_recordings_driver()
        self.local_dir = Path(settings.call_recordings_local_dir)

        if self.driver == "s3":
            missing = _missing_s3_fields()
            if missing:
                message = (
                    "CALL_RECORDINGS_STORAGE_DRIVER=s3 but required object storage configuration "
                    f"is missing: {', '.join(missing)}"
                )
                logger.error("[CALL_RECORDINGS_STORAGE] %s", message)
                raise CallRecordingStorageConfigError(message)
        else:
            self.local_dir.mkdir(parents=True, exist_ok=True)

    @property
    def is_s3(self) -> bool:
        return self.driver == "s3"

    def validate_upload(self, data: bytes, mime_type: str, file_name: str | None = None) -> None:
        if not data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recording file is empty.")
        if len(data) > settings.call_recordings_max_bytes:
            max_mb = settings.call_recordings_max_bytes // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Recording exceeds maximum size of {max_mb} MB.",
            )
        normalized = (mime_type or "").lower().split(";")[0].strip()
        if normalized not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported recording MIME type: {normalized or 'unknown'}",
            )
        if file_name and (".." in file_name or file_name.startswith("/")):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file name.")

    def build_storage_key(self, call_session_id: uuid.UUID, recording_id: uuid.UUID, ext: str) -> str:
        now = datetime.now(timezone.utc)
        safe_ext = ext.lstrip(".")
        return f"call-recordings/{now.year:04d}/{now.month:02d}/{call_session_id}/{recording_id}.{safe_ext}"

    def save(self, storage_key: str, data: bytes, mime_type: str) -> str:
        if self.is_s3:
            self._save_s3(storage_key, data, mime_type)
        else:
            self._save_local(storage_key, data)
        return storage_key

    def read(
        self,
        storage_key: str,
        byte_range: tuple[int, int] | None = None,
    ) -> tuple[bytes, int, str | None]:
        """Return (content, total_size, content_range_header_value)."""
        if self.is_s3:
            return self._read_s3(storage_key, byte_range)
        return self._read_local(storage_key, byte_range)

    def exists(self, storage_key: str) -> bool:
        if self.is_s3:
            try:
                self._s3_client().head_object(Bucket=settings.s3_bucket, Key=storage_key)
                return True
            except Exception:
                return False
        return self.local_dir.joinpath(*storage_key.split("/")).is_file()

    def delete(self, storage_key: str) -> None:
        if self.is_s3:
            self._delete_s3(storage_key)
            return
        path = self.local_dir.joinpath(*storage_key.split("/"))
        if path.is_file():
            try:
                path.unlink()
            except OSError as exc:
                logger.warning("Failed to delete call recording %s: %s", storage_key, exc)

    def generate_presigned_url(
        self,
        storage_key: str,
        *,
        expires_seconds: int = 300,
        disposition: str = "inline",
        file_name: str | None = None,
    ) -> str:
        if not self.is_s3:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Presigned URLs are only available for object storage.",
            )
        params: dict[str, Any] = {"Bucket": settings.s3_bucket, "Key": storage_key}
        if file_name:
            params["ResponseContentDisposition"] = f'{disposition}; filename="{file_name}"'
        return self._s3_client().generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=expires_seconds,
        )

    def resolve_local_path(self, storage_key: str) -> Path:
        """Legacy helper for local driver only."""
        path = self.local_dir.joinpath(*storage_key.split("/"))
        if not path.is_file():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording file not found.")
        return path.resolve()

    def _save_local(self, storage_key: str, data: bytes) -> None:
        path = self.local_dir.joinpath(*storage_key.split("/"))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def _read_local(
        self,
        storage_key: str,
        byte_range: tuple[int, int] | None,
    ) -> tuple[bytes, int, str | None]:
        path = self.local_dir.joinpath(*storage_key.split("/"))
        if not path.is_file():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording file not found.")
        total = path.stat().st_size
        if byte_range:
            start, end = byte_range
            with path.open("rb") as fh:
                fh.seek(start)
                content = fh.read(end - start + 1)
            return content, total, f"bytes {start}-{end}/{total}"
        return path.read_bytes(), total, None

    def _s3_client(self):
        import boto3
        from botocore.config import Config

        addressing_style = "virtual" if (settings.s3_url_style or "virtual").lower() == "virtual" else "path"
        region = settings.s3_region or "auto"
        return boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url or None,
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
            region_name=region if region != "auto" else None,
            config=Config(signature_version="s3v4", s3={"addressing_style": addressing_style}),
        )

    def _save_s3(self, storage_key: str, data: bytes, mime_type: str) -> None:
        try:
            import boto3
        except ImportError as exc:
            logger.error("[CALL_RECORDINGS_STORAGE] boto3 required for S3 storage: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Object storage client is not installed on this server.",
            ) from exc

        missing = _missing_s3_fields()
        if missing:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "Call recording object storage is misconfigured. "
                    f"Missing: {', '.join(missing)}"
                ),
            )

        try:
            client = self._s3_client()
            logger.info("[CALL_RECORDING_UPLOAD] bucket_save_start storage_key=%s", storage_key)
            client.put_object(
                Bucket=settings.s3_bucket,
                Key=storage_key,
                Body=data,
                ContentType=mime_type,
            )
            head = client.head_object(Bucket=settings.s3_bucket, Key=storage_key)
            saved_size = int(head.get("ContentLength") or 0)
            if saved_size <= 0:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Recording upload verification failed: empty object in bucket.",
                )
            logger.info(
                "[CALL_RECORDING_UPLOAD] bucket_save_success storage_key=%s bytes=%s",
                storage_key,
                saved_size,
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(
                "[CALL_RECORDINGS_STORAGE] save_failed reason=%s storage_key=%s",
                exc,
                storage_key,
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to store recording in object storage.",
            ) from exc

    def _read_s3(
        self,
        storage_key: str,
        byte_range: tuple[int, int] | None,
    ) -> tuple[bytes, int, str | None]:
        try:
            client = self._s3_client()
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Object storage client is not installed on this server.",
            ) from exc

        head = client.head_object(Bucket=settings.s3_bucket, Key=storage_key)
        total = int(head.get("ContentLength") or 0)

        kwargs: dict[str, Any] = {"Bucket": settings.s3_bucket, "Key": storage_key}
        range_header_value = None
        if byte_range:
            start, end = byte_range
            kwargs["Range"] = f"bytes={start}-{end}"
            range_header_value = f"bytes {start}-{end}/{total}"

        obj = client.get_object(**kwargs)
        content = obj["Body"].read()
        if not byte_range:
            total = int(obj.get("ContentLength") or total or len(content))
        return content, total, range_header_value

    def _delete_s3(self, storage_key: str) -> None:
        try:
            client = self._s3_client()
            client.delete_object(Bucket=settings.s3_bucket, Key=storage_key)
        except Exception as exc:
            logger.warning("Failed to delete S3 object %s: %s", storage_key, exc)


def parse_range_header(range_header: str | None, file_size: int) -> tuple[int, int] | None:
    if not range_header or file_size <= 0:
        return None
    match = re.match(r"bytes=(\d+)-(\d*)", range_header.strip())
    if not match:
        return None
    start = int(match.group(1))
    end = int(match.group(2)) if match.group(2) else file_size - 1
    end = min(end, file_size - 1)
    if start > end:
        return None
    return start, end
