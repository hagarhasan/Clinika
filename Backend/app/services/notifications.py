from sqlalchemy.orm import Session

from ..models import AuditLog, Notification, User


def notify(db: Session, user_id: int, title: str, message: str, type_: str = "general") -> None:
    """يضيف إشعار (من غير commit — الـ route هو اللي بيعمل commit)"""
    db.add(Notification(user_id=user_id, title=title, message=message, type=type_))


def audit(db: Session, user: User, action: str, entity_type: str, entity_id: int | None) -> None:
    db.add(AuditLog(user_id=user.id, action=action, entity_type=entity_type, entity_id=entity_id))
