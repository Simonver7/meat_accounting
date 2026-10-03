from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки из .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Meat accounting"
    database_url: str
    secret_key: str
    access_token_expire_hours: int = 24
    timezone: str = "Europe/Moscow"
    allowed_origins: list[str] = []
    debug: bool = False
    log_level: str = "INFO"
    log_json: bool = True


settings = Settings()
