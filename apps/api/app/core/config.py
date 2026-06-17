from typing import Any
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv(interpolate=False)


def is_unresolved_template(value: str | None) -> bool:
    return bool(value and "${" in value)


def normalize_postgres_url(value: str) -> str:
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql://", 1)
    return value

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="before")
    @classmethod
    def populate_smtp_and_frontend_defaults(cls, data: Any) -> Any:
        import os

        if isinstance(data, dict):
            # SMTP Host
            if "SMTP_HOST" in data and data["SMTP_HOST"] is not None:
                data["smtp_host"] = data["SMTP_HOST"]
            # SMTP Port
            if "SMTP_PORT" in data and data["SMTP_PORT"] is not None:
                try:
                    data["smtp_port"] = int(data["SMTP_PORT"])
                except ValueError:
                    pass
            # SMTP User
            if "SMTP_USERNAME" in data and data["SMTP_USERNAME"] is not None:
                data["smtp_user"] = data["SMTP_USERNAME"]
            elif "SMTP_USER" in data and data["SMTP_USER"] is not None:
                data["smtp_user"] = data["SMTP_USER"]
            # SMTP Password
            if "SMTP_PASSWORD" in data and data["SMTP_PASSWORD"] is not None:
                data["smtp_password"] = data["SMTP_PASSWORD"]
            # SMTP TLS
            if "SMTP_USE_TLS" in data and data["SMTP_USE_TLS"] is not None:
                val = str(data["SMTP_USE_TLS"]).lower()
                data["smtp_tls"] = val in ("true", "1", "yes", "t")
            elif "SMTP_TLS" in data and data["SMTP_TLS"] is not None:
                val = str(data["SMTP_TLS"]).lower()
                data["smtp_tls"] = val in ("true", "1", "yes", "t")
            # Emails From Email
            if "SMTP_FROM_EMAIL" in data and data["SMTP_FROM_EMAIL"] is not None:
                data["emails_from_email"] = data["SMTP_FROM_EMAIL"]
            elif "EMAILS_FROM_EMAIL" in data and data["EMAILS_FROM_EMAIL"] is not None:
                data["emails_from_email"] = data["EMAILS_FROM_EMAIL"]
            # Emails From Name
            if "SMTP_FROM_NAME" in data and data["SMTP_FROM_NAME"] is not None:
                data["emails_from_name"] = data["SMTP_FROM_NAME"]
            elif "EMAILS_FROM_NAME" in data and data["EMAILS_FROM_NAME"] is not None:
                data["emails_from_name"] = data["EMAILS_FROM_NAME"]
            # Frontend URL
            if "FRONTEND_URL" in data and data["FRONTEND_URL"] is not None:
                data["frontend_base_url"] = data["FRONTEND_URL"]
            elif "FRONTEND_BASE_URL" in data and data["FRONTEND_BASE_URL"] is not None:
                data["frontend_base_url"] = data["FRONTEND_BASE_URL"]

            # Call recording storage — read Railway/AWS env vars explicitly
            driver_env = os.getenv("CALL_RECORDINGS_STORAGE_DRIVER")
            if driver_env and str(driver_env).strip():
                data["call_recordings_storage_driver"] = str(driver_env).strip()

            aws_env_map = {
                "s3_endpoint_url": ["AWS_ENDPOINT_URL", "S3_ENDPOINT_URL"],
                "s3_bucket": ["AWS_S3_BUCKET_NAME", "S3_BUCKET"],
                "s3_access_key_id": ["AWS_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID"],
                "s3_secret_access_key": ["AWS_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY"],
                "s3_region": ["AWS_DEFAULT_REGION", "S3_REGION"],
                "s3_url_style": ["AWS_S3_URL_STYLE", "S3_URL_STYLE"],
            }
            for field, env_keys in aws_env_map.items():
                for env_key in env_keys:
                    val = os.getenv(env_key)
                    if val is not None and str(val).strip():
                        data[field] = str(val).strip()
                        break
        return data

    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_secret_key: str = "change-me-in-env"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    database_public_url: str | None = None
    database_url: str | None = None
    
    # Postgres specific (Railway/Heroku style)
    pghost: str | None = None
    pguser: str | None = None
    pgpassword: str | None = None
    pgdatabase: str | None = None
    pgport: str = "5432"
    
    redis_url: str = "redis://localhost:6379/0"
    frontend_base_url: str = "http://localhost:3000"
    smtp_tls: bool = True
    smtp_port: int = 587
    smtp_host: str | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None
    emails_from_email: str | None = None
    emails_from_name: str | None = None
    
    # Production Bootstrap Admin
    bootstrap_admin_email: str = "admin@example.com"
    bootstrap_admin_password: str = "change-this-password"
    bootstrap_admin_name: str = "HR Admin"
    
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = ["*"]

    profile_image_storage: str = ""
    profile_image_upload_dir: str = "storage/profile-pictures"
    profile_image_public_base_url: str = ""

    call_recordings_storage_driver: str = ""
    call_recordings_local_dir: str = "storage/call-recordings"
    call_recordings_max_upload_mb: int = 100
    call_recordings_max_bytes: int = 100 * 1024 * 1024
    s3_endpoint_url: str | None = None
    s3_bucket: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_region: str | None = None
    s3_url_style: str | None = None
    s3_public_base_url: str | None = None

    push_notifications_enabled: bool = True
    expo_push_api_url: str = "https://exp.host/--/api/v2/push/send"
    push_notification_message_preview_enabled: bool = True

    attendance_max_active_hours: int = 16
    attendance_auto_close_grace_minutes: int = 60

    @model_validator(mode="after")
    def apply_storage_and_aws_aliases(self) -> "Settings":
        # Re-read env so Railway/AWS vars always win over defaults or .env placeholders
        import os

        driver_env = os.getenv("CALL_RECORDINGS_STORAGE_DRIVER")
        if driver_env and str(driver_env).strip():
            object.__setattr__(self, "call_recordings_storage_driver", str(driver_env).strip())

        profile_driver_env = os.getenv("PROFILE_IMAGE_STORAGE")
        if profile_driver_env and str(profile_driver_env).strip():
            object.__setattr__(self, "profile_image_storage", str(profile_driver_env).strip())

        alias_map = {
            "s3_endpoint_url": ["AWS_ENDPOINT_URL", "S3_ENDPOINT_URL"],
            "s3_bucket": ["AWS_S3_BUCKET_NAME", "S3_BUCKET"],
            "s3_access_key_id": ["AWS_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID"],
            "s3_secret_access_key": ["AWS_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY"],
            "s3_region": ["AWS_DEFAULT_REGION", "S3_REGION"],
            "s3_url_style": ["AWS_S3_URL_STYLE", "S3_URL_STYLE"],
        }

        for field, env_keys in alias_map.items():
            for key in env_keys:
                val = os.getenv(key)
                if val is not None and str(val).strip():
                    object.__setattr__(self, field, str(val).strip())
                    break

        driver = (self.call_recordings_storage_driver or "local").lower().strip()
        if driver in ("railway_bucket", "railway", "s3"):
            object.__setattr__(self, "call_recordings_storage_driver", "s3")

        if not self.s3_region:
            object.__setattr__(self, "s3_region", "auto")
        if not self.s3_url_style:
            object.__setattr__(self, "s3_url_style", "virtual")

        max_mb_env = os.getenv("CALL_RECORDINGS_MAX_UPLOAD_MB")
        if max_mb_env and str(max_mb_env).strip().isdigit():
            object.__setattr__(self, "call_recordings_max_upload_mb", int(str(max_mb_env).strip()))

        max_mb = self.call_recordings_max_upload_mb or 100
        object.__setattr__(self, "call_recordings_max_bytes", max_mb * 1024 * 1024)
        return self

    def resolved_call_recordings_driver(self) -> str:
        driver = (self.call_recordings_storage_driver or "").lower().strip()
        if driver in ("s3", "railway_bucket", "railway"):
            return "s3"
        if driver == "local":
            return "local"
        if self.call_recordings_s3_config_flags() and all(self.call_recordings_s3_config_flags().values()):
            return "s3"
        return "local"

    def is_production(self) -> bool:
        return (self.app_env or "").lower().strip() not in ("development", "dev", "local", "test")

    def resolved_profile_image_driver(self) -> str:
        driver = (self.profile_image_storage or "").lower().strip()
        if driver in ("s3", "railway_bucket", "railway"):
            return "s3"
        if driver == "local":
            return "local"
        flags = self.call_recordings_s3_config_flags()
        if all(flags.values()):
            return "s3"
        return "local"

    def call_recordings_s3_config_flags(self) -> dict[str, bool]:
        return {
            "endpoint_configured": bool(self.s3_endpoint_url and str(self.s3_endpoint_url).strip()),
            "bucket_configured": bool(self.s3_bucket and str(self.s3_bucket).strip()),
            "access_key_configured": bool(self.s3_access_key_id and str(self.s3_access_key_id).strip()),
            "secret_configured": bool(self.s3_secret_access_key and str(self.s3_secret_access_key).strip()),
        }

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str] | None) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [
                normalize_origin(str(item).strip())
                for item in value
                if str(item).strip() and str(item).strip() != "*"
            ]
        raw = str(value).strip()
        if not raw or raw == "*":
            return []
        if raw.startswith("["):
            import json

            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [normalize_origin(str(item).strip()) for item in parsed if str(item).strip()]
            except json.JSONDecodeError:
                pass
        return [normalize_origin(item) for item in raw.split(",") if item.strip()]

    @field_validator("database_url", mode="before")
    @classmethod
    def fix_postgres_scheme(cls, v: str | None, info) -> str:
        url = None
        if v and isinstance(v, str):
            if is_unresolved_template(v):
                public_url = info.data.get("database_public_url")
                if public_url and not is_unresolved_template(public_url):
                    url = normalize_postgres_url(public_url)
            elif v:
                url = normalize_postgres_url(v)

        if not url:
            data = info.data
            pghost = data.get("pghost")
            pguser = data.get("pguser")
            pgpass = data.get("pgpassword")
            pgdb = data.get("pgdatabase")
            pgport = data.get("pgport", "5432")

            if all([pghost, pguser, pgpass, pgdb]) and not any(
                is_unresolved_template(value) for value in [pghost, pguser, pgpass, pgdb, pgport]
            ):
                url = f"postgresql://{pguser}:{pgpass}@{pghost}:{pgport}/{pgdb}"

        if not url or url.strip() == "":
            raise ValueError(
                "DATABASE_URL is missing. Please configure a PostgreSQL DATABASE_URL in your environment."
            )

        if url.startswith("sqlite"):
            raise ValueError(
                "SQLite is no longer supported. Please configure PostgreSQL DATABASE_URL."
            )

        return url


def normalize_origin(origin: str) -> str:
    return origin.rstrip("/")


def resolve_cors_origins(settings_obj: Settings) -> list[str]:
    """Build deduplicated CORS allowlist for production + local dev."""
    defaults = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "https://diligent-elegance-production-52de.up.railway.app",
        "https://aware-harmony-production-b1c1.up.railway.app",
        "https://workforce-intelligence-os.up.railway.app",
        "https://pims-os.up.railway.app",
    ]
    extra: list[str] = []
    if settings_obj.frontend_base_url:
        extra.append(settings_obj.frontend_base_url)
    for origin in settings_obj.cors_origins or []:
        if origin and origin != "*":
            extra.append(origin)
    merged = [normalize_origin(o) for o in [*defaults, *extra] if o]
    return list(dict.fromkeys(merged))


INSECURE_SECRET_DEFAULTS = frozenset({"change-me-in-env", "changeme", "secret"})


def validate_production_settings(settings_obj: Settings) -> None:
    """Fail fast when production is deployed with known-insecure defaults."""
    if settings_obj.app_env == "development":
        return
    secret = (settings_obj.app_secret_key or "").strip()
    if not secret or secret in INSECURE_SECRET_DEFAULTS:
        raise RuntimeError(
            "APP_SECRET_KEY must be set to a strong value in non-development environments."
        )
    bootstrap_pw = (settings_obj.bootstrap_admin_password or "").strip()
    if bootstrap_pw in {"change-this-password", "changeme", "password"}:
        raise RuntimeError(
            "BOOTSTRAP_ADMIN_PASSWORD must be changed in non-development environments."
        )


settings = Settings()
