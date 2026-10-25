from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_doctor, require_roles
from ..models import (
    Appointment,
    AppointmentStatus,
    Clinic,
    Doctor,
    DoctorSchedule,
    DoctorTimeOff,
    Review,
    Role,
    Specialty,
    User,
)
from ..schemas import (
    DoctorCreate,
    DoctorOut,
    DoctorUpdate,
    ReviewOut,
    ScheduleItem,
    ScheduleOut,
    SlotOut,
    TimeOffIn,
    TimeOffOut,
)
from ..security import hash_password
from ..services.access import ensure_doctor_owner_or_admin
from ..services.slots import generate_slots, now_local

router = APIRouter(prefix="/doctors", tags=["Doctors"])


# ---------- helpers ----------
def _ratings_for(db: Session, doctor_ids: list[int]) -> dict[int, tuple[float, int]]:
    if not doctor_ids:
        return {}
    rows = db.execute(
        select(Review.doctor_id, func.avg(Review.rating), func.count(Review.id))
        .where(Review.doctor_id.in_(doctor_ids))
        .group_by(Review.doctor_id)
    ).all()
    return {r[0]: (round(float(r[1]), 2), int(r[2])) for r in rows}


def _to_out(doctor: Doctor, ratings: dict[int, tuple[float, int]]) -> DoctorOut:
    out = DoctorOut.model_validate(doctor)
    avg, count = ratings.get(doctor.id, (None, 0))
    out.rating_avg, out.reviews_count = avg, count
    return out


def _get_doctor_or_404(db: Session, doctor_id: int) -> Doctor:
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


# ---------- public listing / search ----------
@router.get("", response_model=list[DoctorOut])
def search_doctors(
    q: str | None = Query(None, description="اسم الدكتور أو التخصص"),
    specialty_id: int | None = None,
    clinic_id: int | None = None,
    city: str | None = None,
    min_rating: float | None = Query(None, ge=1, le=5),
    max_fee: float | None = Query(None, ge=0),
    sort: str = Query("name", pattern="^(name|fee|experience|rating)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Doctor)
        .join(User, Doctor.user_id == User.id)
        .outerjoin(Specialty, Doctor.specialty_id == Specialty.id)
        .outerjoin(Clinic, Doctor.clinic_id == Clinic.id)
        .where(Doctor.is_active.is_(True), User.is_active.is_(True))
    )
    if q:
        stmt = stmt.where(User.full_name.ilike(f"%{q}%") | Specialty.name.ilike(f"%{q}%"))
    if specialty_id:
        stmt = stmt.where(Doctor.specialty_id == specialty_id)
    if clinic_id:
        stmt = stmt.where(Doctor.clinic_id == clinic_id)
    if city:
        stmt = stmt.where(Clinic.city.ilike(f"%{city}%"))
    if max_fee is not None:
        stmt = stmt.where(Doctor.consultation_fee <= max_fee)

    if sort == "fee":
        stmt = stmt.order_by(Doctor.consultation_fee.asc())
    elif sort == "experience":
        stmt = stmt.order_by(Doctor.years_of_experience.desc())
    elif sort == "rating":
        avg_sq = (
            select(Review.doctor_id.label("did"), func.avg(Review.rating).label("avg_r"))
            .group_by(Review.doctor_id)
            .subquery()
        )
        stmt = stmt.outerjoin(avg_sq, avg_sq.c.did == Doctor.id).order_by(avg_sq.c.avg_r.desc().nulls_last())
    else:
        stmt = stmt.order_by(User.full_name)

    if min_rating is not None:
        # الفلترة بالتقييم بعد جلب النتائج (حجم البيانات صغير)
        doctors = db.scalars(stmt).unique().all()
        ratings = _ratings_for(db, [d.id for d in doctors])
        doctors = [d for d in doctors if ratings.get(d.id, (0, 0))[0] >= min_rating]
        doctors = doctors[offset : offset + limit]
    else:
        doctors = db.scalars(stmt.limit(limit).offset(offset)).unique().all()
        ratings = _ratings_for(db, [d.id for d in doctors])
    return [_to_out(d, ratings) for d in doctors]


# ---------- doctor's own area (must come before /{doctor_id}) ----------
@router.get("/me/profile", response_model=DoctorOut)
def my_profile(doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    return _to_out(doctor, _ratings_for(db, [doctor.id]))


@router.get("/me/stats")
def my_stats(doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    today = now_local().date()

    def count(*conds):
        return db.scalar(select(func.count(Appointment.id)).where(Appointment.doctor_id == doctor.id, *conds)) or 0

    active = (AppointmentStatus.pending.value, AppointmentStatus.confirmed.value)
    ratings = _ratings_for(db, [doctor.id]).get(doctor.id, (None, 0))
    return {
        "today_appointments": count(Appointment.appointment_date == today, Appointment.status.in_(active)),
        "upcoming_appointments": count(Appointment.appointment_date >= today, Appointment.status.in_(active)),
        "pending_confirmation": count(Appointment.status == AppointmentStatus.pending.value),
        "completed_total": count(Appointment.status == AppointmentStatus.completed.value),
        "unique_patients": db.scalar(
            select(func.count(func.distinct(Appointment.patient_id))).where(
                Appointment.doctor_id == doctor.id,
                Appointment.status != AppointmentStatus.cancelled.value,
            )
        )
        or 0,
        "rating_avg": ratings[0],
        "reviews_count": ratings[1],
    }


# ---------- admin: create / update / deactivate ----------
@router.post("", response_model=DoctorOut, status_code=status.HTTP_201_CREATED)
def create_doctor(
    payload: DoctorCreate,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    email = payload.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email is already registered")
    if db.get(Specialty, payload.specialty_id) is None:
        raise HTTPException(status_code=400, detail="Specialty does not exist")
    if payload.clinic_id and db.get(Clinic, payload.clinic_id) is None:
        raise HTTPException(status_code=400, detail="Clinic does not exist")

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        full_name=f"{payload.first_name.strip()} {payload.last_name.strip()}",
        phone=payload.phone,
        role=Role.doctor.value,
    )
    db.add(user)
    try:
        db.flush()
        doctor = Doctor(
            user_id=user.id,
            **payload.model_dump(exclude={"email", "password", "first_name", "last_name", "phone"}),
        )
        db.add(doctor)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email is already registered")
    db.refresh(doctor)
    return _to_out(doctor, {})


@router.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = _get_doctor_or_404(db, doctor_id)
    return _to_out(doctor, _ratings_for(db, [doctor.id]))


@router.put("/{doctor_id}", response_model=DoctorOut)
def update_doctor(
    doctor_id: int,
    payload: DoctorUpdate,
    user: User = Depends(require_roles(Role.admin, Role.doctor)),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db, doctor_id)
    ensure_doctor_owner_or_admin(user, doctor)
    data = payload.model_dump(exclude_unset=True)

    if user.role != Role.admin.value:
        # الدكتور يعدّل بياناته المهنية فقط، التخصص/العيادة/التفعيل للأدمن
        for forbidden in ("specialty_id", "clinic_id", "is_active", "license_number"):
            data.pop(forbidden, None)
    if data.get("specialty_id") and db.get(Specialty, data["specialty_id"]) is None:
        raise HTTPException(status_code=400, detail="Specialty does not exist")
    if data.get("clinic_id") and db.get(Clinic, data["clinic_id"]) is None:
        raise HTTPException(status_code=400, detail="Clinic does not exist")

    for field, value in data.items():
        setattr(doctor, field, value)
    db.commit()
    db.refresh(doctor)
    return _to_out(doctor, _ratings_for(db, [doctor.id]))


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_doctor(
    doctor_id: int,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Soft delete: بنوقف الدكتور والحساب عشان نحافظ على السجلات الطبية القديمة."""
    doctor = _get_doctor_or_404(db, doctor_id)
    doctor.is_active = False
    doctor.user.is_active = False
    db.commit()


# ---------- availability ----------
@router.get("/{doctor_id}/slots", response_model=list[SlotOut])
def doctor_slots(
    doctor_id: int,
    day: date = Query(..., alias="date", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db, doctor_id)
    return generate_slots(db, doctor, day)


@router.get("/{doctor_id}/availability")
def doctor_availability(
    doctor_id: int,
    days: int = Query(14, ge=1, le=60),
    db: Session = Depends(get_db),
):
    """عدد المواعيد المتاحة لكل يوم في الفترة القادمة (للـ calendar في الفرونت)."""
    doctor = _get_doctor_or_404(db, doctor_id)
    start = now_local().date()
    result = []
    for i in range(days):
        day = start + timedelta(days=i)
        available = sum(1 for s in generate_slots(db, doctor, day) if s["is_available"])
        result.append({"date": day, "available_slots": available})
    return result


# ---------- schedules ----------
@router.get("/{doctor_id}/schedules", response_model=list[ScheduleOut])
def get_schedules(doctor_id: int, db: Session = Depends(get_db)):
    _get_doctor_or_404(db, doctor_id)
    return db.scalars(
        select(DoctorSchedule)
        .where(DoctorSchedule.doctor_id == doctor_id)
        .order_by(DoctorSchedule.day_of_week, DoctorSchedule.start_time)
    ).all()


@router.put("/{doctor_id}/schedules", response_model=list[ScheduleOut])
def replace_schedules(
    doctor_id: int,
    items: list[ScheduleItem],
    user: User = Depends(require_roles(Role.admin, Role.doctor)),
    db: Session = Depends(get_db),
):
    """يستبدل الجدول الأسبوعي بالكامل. day_of_week: 0=الاثنين ... 6=الأحد."""
    doctor = _get_doctor_or_404(db, doctor_id)
    ensure_doctor_owner_or_admin(user, doctor)

    by_day: dict[int, list[ScheduleItem]] = {}
    for item in items:
        by_day.setdefault(item.day_of_week, []).append(item)
    for day_items in by_day.values():
        day_items.sort(key=lambda i: i.start_time)
        for prev, nxt in zip(day_items, day_items[1:]):
            if nxt.start_time < prev.end_time:
                raise HTTPException(status_code=400, detail="Schedule periods in the same day overlap")

    for old in db.scalars(select(DoctorSchedule).where(DoctorSchedule.doctor_id == doctor_id)).all():
        db.delete(old)
    db.flush()
    for item in items:
        db.add(DoctorSchedule(doctor_id=doctor_id, **item.model_dump()))
    db.commit()
    return db.scalars(
        select(DoctorSchedule)
        .where(DoctorSchedule.doctor_id == doctor_id)
        .order_by(DoctorSchedule.day_of_week, DoctorSchedule.start_time)
    ).all()


# ---------- time off ----------
@router.get("/{doctor_id}/time-off", response_model=list[TimeOffOut])
def list_time_off(doctor_id: int, db: Session = Depends(get_db)):
    _get_doctor_or_404(db, doctor_id)
    return db.scalars(
        select(DoctorTimeOff)
        .where(DoctorTimeOff.doctor_id == doctor_id, DoctorTimeOff.end_date >= now_local().date())
        .order_by(DoctorTimeOff.start_date)
    ).all()


@router.post("/{doctor_id}/time-off", response_model=TimeOffOut, status_code=status.HTTP_201_CREATED)
def add_time_off(
    doctor_id: int,
    payload: TimeOffIn,
    user: User = Depends(require_roles(Role.admin, Role.doctor)),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db, doctor_id)
    ensure_doctor_owner_or_admin(user, doctor)
    obj = DoctorTimeOff(doctor_id=doctor_id, **payload.model_dump())
    db.add(obj)
    db.commit()
    return obj


@router.delete("/{doctor_id}/time-off/{off_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_time_off(
    doctor_id: int,
    off_id: int,
    user: User = Depends(require_roles(Role.admin, Role.doctor)),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db, doctor_id)
    ensure_doctor_owner_or_admin(user, doctor)
    obj = db.get(DoctorTimeOff, off_id)
    if obj is None or obj.doctor_id != doctor_id:
        raise HTTPException(status_code=404, detail="Time off not found")
    db.delete(obj)
    db.commit()


# ---------- reviews ----------
@router.get("/{doctor_id}/reviews", response_model=list[ReviewOut])
def doctor_reviews(
    doctor_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    _get_doctor_or_404(db, doctor_id)
    return db.scalars(
        select(Review)
        .where(Review.doctor_id == doctor_id)
        .order_by(Review.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).unique().all()
