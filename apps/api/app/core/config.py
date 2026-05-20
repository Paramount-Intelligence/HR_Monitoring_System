from pydantic import field_validator
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
