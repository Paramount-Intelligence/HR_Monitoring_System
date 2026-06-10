"""Profile picture file storage (local dev; configurable for production)."""
from __future__ import annotations

import logging
import os
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

IMAGE_SIGNATURES: list[tuple[bytes, str]] = [
    (b"\xff\xd8\xff", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"RIFF", "webp"),
]


class ProfileImageStorageService:
    def __init__(self) -> None:
        self.upload_dir = Path(settings.profile_image_upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

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

    def generate_filename(self, user_id: uuid.UUID, ext: str) -> str:
        from app.core.time_utils import pk_now

        ts = int(pk_now().timestamp())
        safe_ext = re.sub(r"[^a-z0-9]", "", ext.lower())
        return f"{user_id}_{ts}.{safe_ext}"

    def save(self, user_id: uuid.UUID, data: bytes, ext: str) -> tuple[str, str]:
        filename = self.generate_filename(user_id, ext)
        path = self.upload_dir / filename
        with open(path, "wb") as f:
            f.write(data)
        public_url = self.build_public_url(filename)
        return filename, public_url

    def build_public_url(self, filename: str) -> str:
        base = (settings.profile_image_public_base_url or "").strip().rstrip("/")
        if base:
            return f"{base}/media/profile-pictures/{filename}"
        return f"/media/profile-pictures/{filename}"

    def delete_by_filename(self, filename: str | None) -> None:
        if not filename:
            return
        safe_name = Path(filename).name
        if safe_name != filename or ".." in filename:
            return
        path = self.upload_dir / safe_name
        if not path.is_file():
            return
        try:
            path.unlink()
        except OSError as exc:
            logger.warning("Failed to delete profile picture file %s: %s", safe_name, exc)

    def delete_by_url(self, url: str | None) -> None:
        if not url:
            return
        marker = "/media/profile-pictures/"
        if marker not in url:
            return
        filename = url.rsplit(marker, 1)[-1].split("?", 1)[0]
        self.delete_by_filename(filename)
