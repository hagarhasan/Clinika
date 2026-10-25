from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_roles
from ..models import (
    Appointment,
    AppointmentStatus,
    AuditLog,
    Doctor,
    Patient,
    Role,
    Specialty,
    User,
)
from ..schemas import AdminUserCreate, AdminUserStatusIn, AuditLogOut, UserOut
from ..security import hash_password
from ..services.slots import now_local

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(require_roles(Role.admin))])


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    today = now_local().date()
    month_start = today.replace(day=1)

    def count(model_col, *conds):
        return db.scalar(select(func.count(model_col)).where(*conds)) or 0

    status_rows = db.execute(select(Appointment.status, func.count(Appointment.id)).group_by(Appointment.status)).all()
    by_status = {s.value: 0 for s in AppointmentStatus}
    by_status.update({row[0]: row[1] for row in status_rows})
    total = sum(by_status.values())

    top_specialties = db.execute(
        select(Specialty.name, func.count(Appointment.id).label("c"))
        .join(Doctor, Doctor.specialty_id == Specialty.id)
        .join(Appointment, Appointment.doctor_id == Doctor.id)
        .where(Appointment.status != AppointmentStatus.cancelled.value)
        .group_by(Specialty.name)
        .order_by(func.count(Appointment.id).desc())
        .limit(5)
    ).all()

    return {
        "users": {
            "total": count(User.id),
            "patients": count(Patient.id),
            "doctors": count(Doctor.id, Doctor.is_active.is_(True)),
        },
        "appointments": {
            "total": total,
            "by_status": by_status,
            "today": count(Appointment.id, Appointment.appointment_date == today),
            "this_month": count(Appointment.id, Appointment.appointment_date >= month_start),
            "cancellation_rate": round(by_status["cancelled"] / total * 100, 1) if total else 0.0,
        },
        "top_specialties": [{"name": r[0], "appointments": r[1]} for r in top_specialties],
    }


@router.get("/reports/appointments")
def appointments_report(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
):
    """تقرير الحجوزات: يومي حسب الحالة + حسب الدكتور."""
    today = now_local().date()
    date_to = date_to or today
    date_from = date_from or (date_to - timedelta(days=29))
    if date_from > date_to:
        raise HTTPException(status_code=400, detail="date_from must be before date_to")
    if (date_to - date_from).days > 366:
        raise HTTPException(status_code=400, detail="Maximum report range is one year")

    daily_rows = db.execute(
        select(Appointment.appointment_date, Appointment.status, func.count(Appointment.id))
        .where(Appointment.appointment_date.between(date_from, date_to))
        .group_by(Appointment.appointment_date, Appointment.status)
        .order_by(Appointment.appointment_date)
    ).all()
    daily: dict[date, dict[str, int]] = defaultdict(lambda: {s.value: 0 for s in AppointmentStatus})
    for day, st, c in daily_rows:
        daily[day][st] = c

    doctor_rows = db.execute(
        select(Doctor.id, User.full_name, Appointment.status, func.count(Appointment.id))
        .join(Doctor, Doctor.id == Appointment.doctor_id)
        .join(User, User.id == Doctor.user_id)
        .where(Appointment.appointment_date.between(date_from, date_to))
        .group_by(Doctor.id, User.full_name, Appointment.status)
    ).all()
    per_doctor: dict[int, dict] = {}
    for did, name, st, c in doctor_rows:
        entry = per_doctor.setdefault(did, {"doctor_id": did, "doctor": name, "total": 0})
        entry[st] = c
        entry["total"] += c

    return {
        "date_from": date_from,
        "date_to": date_to,
        "daily": [{"date": d, **counts, "total": sum(counts.values())} for d, counts in sorted(daily.items())],
        "per_doctor": sorted(per_doctor.values(), key=lambda e: e["total"], reverse=True),
    }


@router.get("/users", response_model=list[UserOut])
def list_users(
    role: Role | None = None,
    q: str | None = None,
    is_active: bool | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role.value)
    if is_active is not None:
        stmt = stmt.where(User.is_active.is_(is_active))
    if q:
        stmt = stmt.where(User.full_name.ilike(f"%{q}%") | User.email.ilike(f"%{q}%"))
    return db.scalars(stmt.order_by(User.created_at.desc()).limit(limit).offset(offset)).all()


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_admin(payload: AdminUserCreate, db: Session = Depends(get_db)):
    """إنشاء أدمن جديد (الأطباء بيتعملوا من POST /doctors)."""
    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        full_name=f"{payload.first_name.strip()} {payload.last_name.strip()}",
        phone=payload.phone,
        role=Role.admin.value,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email is already registered")
    return user


@router.patch("/users/{user_id}/status", response_model=UserOut)
def set_user_status(
    user_id: int,
    payload: AdminUserStatusIn,
    admin: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    user.is_active = payload.is_active
    doctor = db.scalar(select(Doctor).where(Doctor.user_id == user.id))
    if doctor:
        doctor.is_active = payload.is_active
    db.commit()
    return user


@router.get("/audit-logs", response_model=list[AuditLogOut])
def audit_logs(
    entity_type: str | None = None,
    user_id: int | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(AuditLog)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    return db.scalars(stmt.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)).all()
