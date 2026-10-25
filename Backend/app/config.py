from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Clinika API"
    DATABASE_URL: str = "sqlite:///./clinika.db"  # للتجربة المحلية فقط
    SECRET_KEY: str = "dev-secret-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    JWT_ALGORITHM: str = "HS256"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    TIMEZONE: str = "Africa/Cairo"

    MAX_ADVANCE_BOOKING_DAYS: int = 60
    CANCEL_MIN_HOURS_BEFORE: int = 2
    AUTO_CONFIRM_APPOINTMENTS: bool = False
    AUTO_CREATE_TABLES: bool = False

    CRON_SECRET: str = ""

    ADMIN_EMAIL: str = "admin@clinika.com"
    ADMIN_PASSWORD: str = "Admin@12345"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
