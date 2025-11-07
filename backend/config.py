from pydantic import AnyUrl
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Async URL for runtime (databases/asyncpg)
    DATABASE_URL: AnyUrl = "postgresql+asyncpg://postgres:password@localhost:5432/GMS_database"

    # Alembic / sync tooling (optional). If not set, we’ll derive it from DATABASE_URL.
    SYNC_DATABASE_URL: Optional[AnyUrl] = None

    # CORS
    CORS_ORIGINS: str = "*"  # comma-separated or "*" in dev
    APP_NAME: str = "GMS Project Management System"
    APP_VERSION: str = "1.0.0"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
