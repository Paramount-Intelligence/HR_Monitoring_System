"""Profile picture storage — local dev filesystem or S3-compatible (Railway Bucket)."""
from __future__ import annotations

import logging
import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB

LEGACY_URL_MARKER = "/media/profile-pictures/"
API_URL_MARKER = "/api/v1/media/profile-pictures/"


class ProfileImageStorageConfigError(RuntimeError):
    """Raised when S3 storage is requested but required configuration is missing."""


def log_profile_image_storage_config() -> None:
    driver = settings.resolved_profile_image_driver()
    if driver == "s3":
        flags = s3_storage.s3_config_flags()
        logger.info(
            "[PROFILE_PICTURE_STORAGE] driver=s3 endpoint_configured=%s bucket_configured=%s "
            "access_key_configured=%s secret_configured=%s",
            flags["endpoint_configured"],
            flags["bucket_configured"],
            flags["access_key_configured"],
            flags["secret_configured"],
        )
    else:
        logger.info(
            "[PROFILE_PICTURE_STORAGE] driver=local upload_dir=%s",
            settings.profile_image_upload_dir,
        )


from app.services import s3_storage


class ProfileImageStorageService:
    def __init__(self) -> None:
        self.driver = settings.resolved_profile_image_driver()
        self.upload_dir = Path(settings.profile_image_upload_dir)

        if self.driver == "s3":
            missing = s3_storage.missing_s3_fields()
            if missing:
                message = (
                    "PROFILE_IMAGE_STORAGE=s3 but required object storage configuration "
                    f"is missing: {', '.join(missing)}"
                )
                logger.error("[PROFILE_PICTURE_STORAGE] %s", message)
                raise ProfileImageStorageConfigError(message)
        else:
            self.upload_dir.mkdir(parents=True, exist_ok=True)

    @property
    def is_s3(self) -> bool:
        return self.driver == "s3"

    @property
    def storage_driver_label(self) -> str:
        return "s3" if self.is_s3 else "local"

    def _resolve_extension(self, content_type: str | None, filename: str | None) -> str:
        normalized = (content_type or "").lower().split(";")[0].strip()
        if normalized in ALLOWED_CONTENT_TYPES:
            ext = ALLOWED_CONTENT_TYPES[normalized]
            return "jpg" if ext == "jpeg" else ext

        name = filename or ""
        ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
        if ext == "jpeg":
            ext = "jpg"
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported image type. Allowed: JPEG, PNG, WebP.",
            )
        return ext

    def _validate_image_bytes(self, data: bytes, ext: str) -> None:
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )
        if ext == "jpg" and data.startswith(b"\xff\xd8\xff"):
            return
        if ext == "png" and data.startswith(b"\x89PNG\r\n\x1a\n"):
            return
        if ext == "webp" and data[:4] == b"RIFF" and len(data) >= 12 and data[8:12] == b"WEBP":
            return
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match a valid JPEG, PNG, or WebP image.",
        )

    async def read_and_validate(self, file: UploadFile) -> tuple[bytes, str, str]:
        if not file or not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file uploaded.",
            )

        ext = self._resolve_extension(file.content_type, file.filename)
        content_type = "image/jpeg" if ext == "jpg" else f"image/{ext}"

        data = await file.read()
        if len(data) > MAX_PROFILE_IMAGE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File is too large. Maximum size is {MAX_PROFILE_IMAGE_BYTES // (1024 * 1024)} MB.",
            )

        self._validate_image_bytes(data, ext)
        return data, ext, content_type

    def generate_storage_key(self, user_id: uuid.UUID, ext: str) -> str:
        safe_ext = re.sub(r"[^a-z0-9]", "", ext.lower())
        file_id = uuid.uuid4()
        return f"profile-pictures/{user_id}/{file_id}.{safe_ext}"

    def save(self, user_id: uuid.UUID, data: bytes, ext: str, content_type: str) -> tuple[str, str]:
        storage_key = self.generate_storage_key(user_id, ext)
        if self.is_s3:
            self._save_s3(storage_key, data, content_type)
        else:
            self._save_local(storage_key, data)
        public_url = self.build_public_url(storage_key)
        return storage_key, public_url

    def build_public_url(self, storage_key: str) -> str:
        path_suffix = storage_key
        if storage_key.startswith("profile-pictures/"):
            path_suffix = storage_key[len("profile-pictures/") :]
        api_path = f"{settings.api_v1_prefix}/media/profile-pictures/{path_suffix}"
        base = (settings.profile_image_public_base_url or "").strip().rstrip("/")
        if base:
            return f"{base}{api_path}"
        return api_path

    def read(self, file_path: str) -> tuple[bytes, str]:
        """Load image bytes and content-type for a public media path segment."""
        safe_path = self._sanitize_file_path(file_path)
        storage_key = self._storage_key_from_path(safe_path)

        if self.is_s3:
            return self._read_s3(storage_key)
        return self._read_local(storage_key, safe_path)

    def exists(self, file_path: str) -> bool:
        safe_path = self._sanitize_file_path(file_path)
        storage_key = self._storage_key_from_path(safe_path)
        if self.is_s3:
            try:
                self._s3_client().head_object(Bucket=settings.s3_bucket, Key=storage_key)
                return True
            except Exception:
                return False
        return self._local_path_for_key(storage_key, safe_path).is_file()

    def delete_by_storage_key(self, storage_key: str | None) -> None:
        if not storage_key:
            return
        if self.is_s3:
            self._delete_s3(storage_key)
            return
        path = self._local_path_for_key(storage_key, storage_key.split("/")[-1])
        if path.is_file():
            try:
                path.unlink()
            except OSError as exc:
                logger.warning("Failed to delete profile picture %s: %s", storage_key, exc)

    def delete_by_filename(self, storage_key: str | None) -> None:
        """Backward-compatible alias — value is the storage key or legacy flat filename."""
        if not storage_key:
            return
        if storage_key.startswith("profile-pictures/"):
            self.delete_by_storage_key(storage_key)
            return
        # Legacy flat filename stored at upload_dir root
        if self.is_s3:
            self.delete_by_storage_key(f"profile-pictures/{storage_key}")
            return
        path = self.upload_dir / Path(storage_key).name
        if path.is_file():
            try:
                path.unlink()
            except OSError as exc:
                logger.warning("Failed to delete legacy profile picture %s: %s", storage_key, exc)

    def delete_by_url(self, url: str | None) -> None:
        if not url:
            return
        for marker in (API_URL_MARKER, LEGACY_URL_MARKER):
            if marker in url:
                segment = url.rsplit(marker, 1)[-1].split("?", 1)[0]
                if marker == LEGACY_URL_MARKER:
                    self.delete_by_filename(segment)
                else:
                    self.delete_by_storage_key(f"profile-pictures/{segment}")
                return

    def _sanitize_file_path(self, file_path: str) -> str:
        cleaned = file_path.strip().strip("/")
        if not cleaned or ".." in cleaned or "\\" in cleaned:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid profile picture path.",
            )
        return cleaned

    def _storage_key_from_path(self, file_path: str) -> str:
        if file_path.startswith("profile-pictures/"):
            return file_path
        return f"profile-pictures/{file_path}"

    def _local_path_for_key(self, storage_key: str, file_path: str) -> Path:
        if "/" not in file_path and not storage_key.count("/") > 1:
            return self.upload_dir / Path(file_path).name
        relative = storage_key
        if relative.startswith("profile-pictures/"):
            relative = relative[len("profile-pictures/") :]
        return self.upload_dir.joinpath(*relative.split("/"))

    def _save_local(self, storage_key: str, data: bytes) -> None:
        path = self._local_path_for_key(storage_key, storage_key.split("/")[-1])
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def _read_local(self, storage_key: str, file_path: str) -> tuple[bytes, str]:
        path = self._local_path_for_key(storage_key, file_path)
        if not path.is_file():
            legacy = self.upload_dir / Path(file_path).name
            if legacy.is_file():
                path = legacy
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Profile picture not found.",
                )
        content_type = self._guess_content_type(path.suffix)
        return path.read_bytes(), content_type

    def _guess_content_type(self, suffix: str) -> str:
        ext = suffix.lstrip(".").lower()
        if ext == "jpg" or ext == "jpeg":
            return "image/jpeg"
        if ext == "png":
            return "image/png"
        if ext == "webp":
            return "image/webp"
        return "application/octet-stream"

    def _s3_client(self):
        return s3_storage.create_s3_client()

    def _save_s3(self, storage_key: str, data: bytes, content_type: str) -> None:
        try:
            import boto3  # noqa: F401
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Object storage client is not installed on this server.",
            ) from exc

        missing = s3_storage.missing_s3_fields()
        if missing:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Profile picture object storage is misconfigured. Missing: {', '.join(missing)}",
            )

        try:
            client = self._s3_client()
            client.put_object(
                Bucket=settings.s3_bucket,
                Key=storage_key,
                Body=data,
                ContentType=content_type,
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("[PROFILE_PICTURE_UPLOAD] bucket_save_failed key=%s reason=%s", storage_key, exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to store profile picture in object storage.",
            ) from exc

    def _read_s3(self, storage_key: str) -> tuple[bytes, str]:
        try:
            client = self._s3_client()
            obj = client.get_object(Bucket=settings.s3_bucket, Key=storage_key)
            body = obj["Body"].read()
            content_type = obj.get("ContentType") or self._guess_content_type(
                Path(storage_key).suffix
            )
            return body, content_type
        except HTTPException:
            raise
        except Exception as exc:
            error_code = getattr(exc, "response", {}).get("Error", {}).get("Code") if hasattr(exc, "response") else None
            if error_code in ("404", "NoSuchKey", "NotFound"):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Profile picture not found.",
                ) from exc
            logger.error("[PROFILE_PICTURE_SERVE] read_failed key=%s reason=%s", storage_key, exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to load profile picture from storage.",
            ) from exc

    def _delete_s3(self, storage_key: str) -> None:
        try:
            client = self._s3_client()
            client.delete_object(Bucket=settings.s3_bucket, Key=storage_key)
        except Exception as exc:
            logger.warning("Failed to delete S3 profile picture %s: %s", storage_key, exc)
