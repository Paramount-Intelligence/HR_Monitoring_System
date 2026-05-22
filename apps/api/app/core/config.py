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

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("database_url", mode="before")
    @classmethod
    def fix_postgres_scheme(cls, v: str | None, info) -> str:
        url = None
        # 1. If DATABASE_URL is provided, normalize the scheme
        if v and isinstance(v, str):
            if is_unresolved_template(v):
                public_url = info.data.get("database_public_url")
                if public_url and not is_unresolved_template(public_url):
                    url = normalize_postgres_url(public_url)
            elif v:
                url = normalize_postgres_url(v)
            
        # 2. Fallback: Try to construct from individual PG variables
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
            
        # 3. Validations
        if not url or url.strip() == "":
            raise ValueError(
                "DATABASE_URL is missing. Please configure a PostgreSQL DATABASE_URL in your environment."
            )
            
        if url.startswith("sqlite"):
            raise ValueError(
                "SQLite is no longer supported. Please configure PostgreSQL DATABASE_URL."
            )
            
        return url


settings = Settings()
