from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import PasswordResetToken, User
from ..security import generate_reset_token


def aware(dt: datetime) -> datetime:
    """SQLite بيرجّع datetimes من غير timezone؛ بنفترض UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def issue_reset_token(db: Session, user: User, minutes: int) -> str:
    """يبطّل أي توكنات قديمة لسه صالحة ويعمل واحد جديد. بيرجّع التوكن الخام (من غير commit)."""
    now = datetime.now(timezone.utc)
    for old in db.scalars(
        select(PasswordResetToken).where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
    ).all():
        old.used_at = now
    raw, hashed = generate_reset_token()
    db.add(PasswordResetToken(user_id=user.id, token_hash=hashed, expires_at=now + timedelta(minutes=minutes)))
    return raw
