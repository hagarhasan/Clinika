import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from .config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int, role: str, token_version: int = 0, expires_minutes: int | None = None) -> str:
    minutes = expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    # "tv" = token_version: تغيير الباسورد بيزوّدها فكل الجلسات القديمة بتتلغي
    payload = {"sub": str(user_id), "role": role, "tv": token_version, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def generate_reset_token() -> tuple[str, str]:
    """يرجّع (التوكن الخام اللي بيتبعت في الإيميل، الـ hash اللي بيتخزن في الداتابيز)"""
    raw = secrets.token_urlsafe(32)
    return raw, hash_token(raw)
