import csv
import io
import secrets
from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_roles
from ..config import settings
from ..models import (
    ActivityLog,
    Appointment,
    AppointmentStatus,
    AuditLog,
    ContactMessage,
    Doctor,
    DoctorStatus,
    Patient,
    Role,
    Specialty,
    User,
)
from ..schemas import (
    ActivityOut,
    AdminAppointmentCreate,
    AdminPatientCreate,
    AdminUserCreate,
    AdminUserStatusIn,
    AppointmentOut,
    AuditLogOut,
    ContactOut,
    ContactStatusIn,
    DoctorOut,
    DoctorReviewIn,
    DoctorVerifyIn,
    PatientOut,
    UserOut,
)
from ..security import hash_password
from ..services.booking import create_booking
from ..services.doctors import ratings_for, set_doctor_status
from ..services.email import send_doctor_decision_email, send_password_reset_email
from ..services.notifications import log_activity, notify
from ..services.passwords import issue_reset_token
from ..services.serializers import appointment_out, doctor_to_out
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

    doctor_status_rows = db.execute(select(Doctor.status, func.count(Doctor.id)).group_by(Doctor.status)).all()
    doctors_by_status = {st.value: 0 for st in DoctorStatus}
    doctors_by_status.update({row[0]: row[1] for row in doctor_status_rows})

    return {
        "users": {
            "total": count(User.id),
            "patients": count(Patient.id),
            "doctors": count(Doctor.id, Doctor.is_active.is_(True)),
        },
        "doctors_by_status": doctors_by_status,
        "pending_doctor_requests": doctors_by_status[DoctorStatus.pending.value],
        "new_contact_messages": count(ContactMessage.id, ContactMessage.status == "new"),
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
        if payload.is_active and doctor.status in (DoctorStatus.pending.value, DoctorStatus.rejected.value):
            # تفعيل الحساب مش بيعدّي طلب انضمام؛ الموافقة بتتم من /admin/doctors/{id}/review
            pass
        else:
            set_doctor_status(doctor, DoctorStatus.active.value if payload.is_active else DoctorStatus.inactive.value)
    log_activity(db, admin.id, "user_status_changed", "user", user.id,
                 f"{user.full_name} {'activated' if payload.is_active else 'deactivated'}")
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


# ======================= Doctor requests / roster =======================
def _escape_csv(value) -> str:
    text = "" if value is None else str(value)
    # حماية من CSV injection لما الملف يتفتح في Excel
    return "'" + text if text[:1] in ("=", "+", "-", "@") else text


@router.get("/doctors", response_model=list[DoctorOut])
def list_doctors(
    response: Response,
    status_filter: str | None = Query(None, alias="status", pattern="^(pending|active|inactive|rejected)$"),
    q: str | None = None,
    specialty_id: int | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """كل الدكاترة بكل الحالات (للوحة الأدمن). X-Total-Count فيه العدد الكلي بعد الفلاتر."""
    stmt = select(Doctor).join(User, Doctor.user_id == User.id)
    if status_filter:
        stmt = stmt.where(Doctor.status == status_filter)
    if specialty_id:
        stmt = stmt.where(Doctor.specialty_id == specialty_id)
    if q:
        stmt = stmt.where(or_(User.full_name.ilike(f"%{q}%"), User.email.ilike(f"%{q}%")))
    response.headers["X-Total-Count"] = str(db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0)
    doctors = db.scalars(stmt.order_by(User.created_at.desc()).limit(limit).offset(offset)).unique().all()
    ratings = ratings_for(db, [d.id for d in doctors])
    return [doctor_to_out(d, ratings) for d in doctors]


@router.get("/doctors/counts")
def doctor_counts(db: Session = Depends(get_db)):
    """عدّاد لكل حالة (pending / active / inactive / rejected) للتابات."""
    rows = db.execute(select(Doctor.status, func.count(Doctor.id)).group_by(Doctor.status)).all()
    counts = {st.value: 0 for st in DoctorStatus}
    counts.update({r[0]: r[1] for r in rows})
    counts["all"] = sum(counts.values())
    return counts


@router.get("/doctors/export")
def export_doctors(
    status_filter: str | None = Query(None, alias="status", pattern="^(pending|active|inactive|rejected)$"),
    db: Session = Depends(get_db),
):
    """Export Roster: ملف CSV بكل الدكاترة."""
    stmt = select(Doctor).join(User, Doctor.user_id == User.id)
    if status_filter:
        stmt = stmt.where(Doctor.status == status_filter)
    doctors = db.scalars(stmt.order_by(User.full_name)).unique().all()
    ratings = ratings_for(db, [d.id for d in doctors])

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["ID", "Name", "Email", "Phone", "Specialty", "Clinic", "City", "Status", "License",
                     "Years of experience", "Fee (EGP)", "Rating", "Reviews", "Verified", "Joined"])
    for d in doctors:
        avg, count = ratings.get(d.id, (None, 0))
        writer.writerow([
            d.id, _escape_csv(d.full_name), _escape_csv(d.email), _escape_csv(d.phone),
            _escape_csv(d.specialty_name), _escape_csv(d.clinic_name),
            _escape_csv(d.clinic.city if d.clinic else None), d.status, _escape_csv(d.license_number),
            d.years_of_experience, d.consultation_fee, avg if avg is not None else "", count,
            "yes" if d.is_verified else "no", d.user.created_at.date().isoformat(),
        ])
    filename = f"clinika-doctors-{now_local().date().isoformat()}.csv"
    return Response(
        content="\ufeff" + buffer.getvalue(),  # BOM عشان Excel يقرا العربي صح
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/doctors/{doctor_id}", response_model=DoctorOut)
def get_doctor_admin(doctor_id: int, db: Session = Depends(get_db)):
    """تفاصيل الدكتور لمراجعة الطلب (بيشتغل مع كل الحالات)."""
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor_to_out(doctor, ratings_for(db, [doctor.id]))


@router.patch("/doctors/{doctor_id}/review", response_model=DoctorOut)
def review_doctor(
    doctor_id: int,
    payload: DoctorReviewIn,
    admin: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """موافقة أو رفض طلب انضمام دكتور."""
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if doctor.status not in (DoctorStatus.pending.value, DoctorStatus.rejected.value):
        raise HTTPException(status_code=400, detail=f"This doctor is already {doctor.status}")

    approved = payload.action == "approve"
    set_doctor_status(doctor, DoctorStatus.active.value if approved else DoctorStatus.rejected.value, payload.reason)
    doctor.user.is_active = True if approved else doctor.user.is_active
    notify(
        db,
        doctor.user_id,
        "Application approved" if approved else "Application not approved",
        "You can now sign in and set your availability." if approved
        else (payload.reason or "Your application was not approved."),
        "doctor_request",
    )
    log_activity(db, admin.id, "doctor_approved" if approved else "doctor_rejected", "doctor", doctor.id,
                 f"Dr. {doctor.full_name} {'approved' if approved else 'rejected'}")
    db.commit()
    send_doctor_decision_email(doctor.email, doctor.full_name, approved, payload.reason)
    return doctor_to_out(doctor, ratings_for(db, [doctor.id]))


@router.patch("/doctors/{doctor_id}/verify", response_model=DoctorOut)
def verify_doctor(
    doctor_id: int,
    payload: DoctorVerifyIn,
    admin: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor.is_verified = payload.is_verified
    log_activity(db, admin.id, "doctor_verified" if payload.is_verified else "doctor_unverified", "doctor",
                 doctor.id, f"Dr. {doctor.full_name} {'verified' if payload.is_verified else 'unverified'}")
    db.commit()
    return doctor_to_out(doctor, ratings_for(db, [doctor.id]))


# ======================= Add patient / book on behalf =======================
@router.post("/patients", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: AdminPatientCreate,
    admin: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    email = payload.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email is already registered")

    invite = payload.password is None
    user = User(
        email=email,
        hashed_password=hash_password(payload.password or secrets.token_urlsafe(24)),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        full_name=f"{payload.first_name.strip()} {payload.last_name.strip()}",
        phone=payload.phone,
        role=Role.patient.value,
    )
    db.add(user)
    db.flush()
    patient = Patient(user_id=user.id, date_of_birth=payload.date_of_birth, gender=payload.gender)
    db.add(patient)
    raw = issue_reset_token(db, user, 60 * 24) if invite else None
    log_activity(db, admin.id, "patient_created", "patient", None, f"Admin added patient {user.full_name}")
    db.commit()
    if raw:
        send_password_reset_email(user.email, user.first_name, raw, 60 * 24, invite=True)
    return patient


@router.post("/appointments", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment_for_patient(
    payload: AdminAppointmentCreate,
    admin: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    patient = db.get(Patient, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    doctor = db.get(Doctor, payload.doctor_id)
    if doctor is None or not doctor.is_active:
        raise HTTPException(status_code=404, detail="Doctor not found")
    appt = create_booking(
        db,
        patient=patient,
        doctor=doctor,
        appointment_date=payload.appointment_date,
        start_time=payload.start_time,
        reason=payload.reason,
        consultation_type=payload.consultation_type,
        actor=admin,
        status=payload.status,
        clinic_id=payload.clinic_id,
    )
    db.commit()
    db.refresh(appt)
    return appointment_out(db, appt)


# ======================= Recent activity / contact messages =======================
@router.get("/activity", response_model=list[ActivityOut])
def recent_activity(limit: int = Query(10, ge=1, le=100), offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    rows = db.execute(
        select(ActivityLog, User.full_name)
        .outerjoin(User, User.id == ActivityLog.actor_user_id)
        .order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    result = []
    for log, actor_name in rows:
        out = ActivityOut.model_validate(log)
        out.actor_name = actor_name
        result.append(out)
    return result


@router.get("/contact-messages", response_model=list[ContactOut])
def list_contact_messages(
    response: Response,
    status_filter: str | None = Query(None, alias="status", pattern="^(new|read|resolved)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(ContactMessage)
    if status_filter:
        stmt = stmt.where(ContactMessage.status == status_filter)
    response.headers["X-Total-Count"] = str(db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0)
    return db.scalars(stmt.order_by(ContactMessage.created_at.desc()).limit(limit).offset(offset)).all()


@router.patch("/contact-messages/{message_id}", response_model=ContactOut)
def update_contact_message(message_id: int, payload: ContactStatusIn, db: Session = Depends(get_db)):
    msg = db.get(ContactMessage, message_id)
    if msg is None:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.status = payload.status
    db.commit()
    return msg
