from functools import lru_cache
from typing import Literal, Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_DEFAULT_SECRET = "dev-insecure-secret-change-me-please-32b"


class Settings(BaseSettings):
    """Configuração lida de variáveis de ambiente (ver .env.example)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+psycopg://safepass:safepass_local@127.0.0.1:55432/safepass"

    jwt_secret: str = INSECURE_DEFAULT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    password_reset_minutes: int = 30

    cookie_secure: bool = False
    cors_origins: list[str] = ["http://localhost:3000"]
    frontend_url: str = "http://localhost:3000"
    trust_forwarded_for: bool = False

    payment_gateway: Literal["simulated"] = "simulated"

    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_starttls: bool = False
    mail_from: str = "SAFEpass <no-reply@safepass.local>"

    admin_email: str | None = None
    admin_password: str | None = None
    seed_demo_data: bool = False

    @model_validator(mode="after")
    def _require_safe_values_in_production(self) -> Self:
        if self.environment != "production":
            return self
        if self.jwt_secret == INSECURE_DEFAULT_SECRET:
            raise ValueError("JWT_SECRET precisa ser definido em produção.")
        if not self.cookie_secure:
            raise ValueError("COOKIE_SECURE precisa ser true em produção (HTTPS).")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
