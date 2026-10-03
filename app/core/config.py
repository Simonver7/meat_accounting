from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    """Настройки из .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Meat accounting"
    database_url: str
    secret_key: str
    access_token_expire_hours: int = 24
    timezone: str = "Europe/Moscow"
    allowed_origins: str = ""
    debug: bool = False
    log_level: str = "INFO"
    log_json: bool = True

    @property
    def cors_origins(self) -> list[str]:
        """Разрешённыеorigins для CORS."""
        if not self.allowed_origins:
            return []
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
