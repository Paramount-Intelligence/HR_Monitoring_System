"""Serve uploaded profile pictures through the API (local or S3-backed)."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Response, status

from app.services.profile_image_storage import ProfileImageStorageService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/media/profile-pictures/{file_path:path}",
    summary="Serve a profile picture",
    responses={
        404: {"description": "Profile picture not found"},
        400: {"description": "Invalid path"},
    },
)
def serve_profile_picture(file_path: str) -> Response:
    storage = ProfileImageStorageService()
    logger.info("[PROFILE_PICTURE_SERVE] key=%s storage_driver=%s", file_path, storage.storage_driver_label)

    try:
        data, content_type = storage.read(file_path)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_404_NOT_FOUND:
            logger.info("[PROFILE_PICTURE_SERVE] missing key=%s", file_path)
        raise

    return Response(
        content=data,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
    )
