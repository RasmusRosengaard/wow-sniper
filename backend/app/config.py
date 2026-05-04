from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    blizzard_client_id: str
    blizzard_client_secret: str
    wow_region: str = "us"

    database_url: str = "postgresql+asyncpg://sniper:sniper@localhost:5432/wowsniper"

    ws_host: str = "0.0.0.0"
    ws_port: int = 8000

    threshold_low: float = 0.80
    threshold_medium: float = 0.60
    threshold_ultra: float = 0.40

    price_history_days: int = 7
    min_price_samples: int = 3


@lru_cache
def get_settings() -> Settings:
    return Settings()
