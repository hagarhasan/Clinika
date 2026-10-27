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

    # --- Frontend / password reset ---
    FRONTEND_URL: str = ""  # لو فاضي بنستخدم أول CORS origin
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15
    REMEMBER_ME_EXPIRE_DAYS: int = 30

    # --- Email (Resend) ---
    RESEND_API_KEY: str = ""  # لو فاضي الإيميلات بتتجاهل ومفيش خطأ
    EMAIL_FROM: str = "Clinika <onboarding@resend.dev>"
    CONTACT_RECEIVER_EMAIL: str = ""

    # --- Image uploads (Cloudinary) ---
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    MAX_UPLOAD_MB: int = 3

    # --- Booking ---
    MIN_BOOKING_NOTICE_MINUTES: int = 0  # 120 = ممنوع الحجز قبل الموعد بأقل من ساعتين
    NEXT_AVAILABLE_HORIZON_DAYS: int = 21
    ONLINE_MEETING_BASE_URL: str = "https://meet.jit.si"

    ADMIN_EMAIL: str = "admin@clinika.com"
    ADMIN_PASSWORD: str = "Admin@12345"

    @property
    def frontend_base_url(self) -> str:
        if self.FRONTEND_URL:
            return self.FRONTEND_URL.rstrip("/")
        origins = self.cors_origins_list
        return origins[0].rstrip("/") if origins else "http://localhost:5173"

    @property
    def cloudinary_enabled(self) -> bool:
        return bool(self.CLOUDINARY_CLOUD_NAME and self.CLOUDINARY_API_KEY and self.CLOUDINARY_API_SECRET)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
