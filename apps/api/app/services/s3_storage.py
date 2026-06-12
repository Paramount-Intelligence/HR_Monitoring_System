"""Shared S3/Railway Bucket client helpers used by profile pictures and call recordings."""
from __future__ import annotations

from typing import Any

from app.core.config import settings


def s3_config_flags() -> dict[str, bool]:
    return settings.call_recordings_s3_config_flags()


def is_s3_fully_configured() -> bool:
    return all(s3_config_flags().values())


def missing_s3_fields() -> list[str]:
    missing: list[str] = []
    flags = s3_config_flags()
    if not flags["endpoint_configured"]:
        missing.append("AWS_ENDPOINT_URL")
    if not flags["bucket_configured"]:
        missing.append("AWS_S3_BUCKET_NAME")
    if not flags["access_key_configured"]:
        missing.append("AWS_ACCESS_KEY_ID")
    if not flags["secret_configured"]:
        missing.append("AWS_SECRET_ACCESS_KEY")
    return missing


def create_s3_client() -> Any:
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
