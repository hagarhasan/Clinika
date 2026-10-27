from sqlalchemy.orm import Session

from ..models import ActivityLog, AuditLog, Notification, User


def notify(db: Session, user_id: int, title: str, message: str, type_: str = "general") -> None:
    """يضيف إشعار (من غير commit — الـ route هو اللي بيعمل commit)"""
    db.add(Notification(user_id=user_id, title=title, message=message, type=type_))


def audit(db: Session, user: User, action: str, entity_type: str, entity_id: int | None) -> None:
    db.add(AuditLog(user_id=user.id, action=action, entity_type=entity_type, entity_id=entity_id))


def log_activity(
    db: Session, actor_user_id: int | None, action: str, entity_type: str, entity_id: int | None, description: str
) -> None:
    """يسجل حدث في Recent Activity للأدمن (من غير commit)"""
    db.add(
        ActivityLog(
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description[:255],
        )
    )


def notify_admins(db: Session, title: str, message: str, type_: str = "general") -> None:
    from sqlalchemy import select

    for admin_id in db.scalars(select(User.id).where(User.role == "admin", User.is_active.is_(True))).all():
        notify(db, admin_id, title, message, type_)
