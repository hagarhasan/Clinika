from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from ..config import settings
from ..database import get_db
from ..deps import get_current_doctor, require_roles
from ..models import (
    Appointment,
    AppointmentStatus,
    Clinic,
    ConsultationType,
    Doctor,
    DoctorCredential,
    DoctorSchedule,
    DoctorStatus,
    DoctorTimeOff,
    Review,
    Role,
    Specialty,
    User,
)
from ..schemas import (
    CredentialIn,
    CredentialOut,
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
from ..services.doctors import clinics_for, ratings_for, set_doctor_status
from ..services.notifications import log_activity
from ..services.serializers import doctor_to_out
from ..services.slots import availability_map, day_capacity, generate_slots, now_local
from ..services.storage import validate_image_url

router = APIRouter(prefix="/doctors", tags=["Doctors"])


# ---------- helpers ----------
def _ratings_for(db: Session, doctor_ids: list[int]) -> dict[int, tuple[float, int]]:
    return ratings_for(db, doctor_ids)


def _to_out(
    doctor: Doctor,
    ratings: dict[int, tuple[float, int]],
    next_slot: tuple | None = None,
    clinics: list[Clinic] | None = None,
) -> DoctorOut:
    return doctor_to_out(doctor, ratings, next_slot, clinics)


def _works_at(*clinic_conds):
    """شرط SQL: الدكتور بيشتغل فعلًا في عيادة تحقق الشروط دي.
    العيادة الفعلية لكل فترة = عيادة الفترة، وإلا عيادة الدكتور الأساسية.
    الدكتور اللي معندوش جدول لسه بيتحسب على عيادته الأساسية."""
    doc = aliased(Doctor)
    via_schedule = (
        select(DoctorSchedule.doctor_id)
        .join(doc, doc.id == DoctorSchedule.doctor_id)
        .join(Clinic, Clinic.id == func.coalesce(DoctorSchedule.clinic_id, doc.clinic_id))
        .where(DoctorSchedule.is_active.is_(True), Clinic.is_active.is_(True), *clinic_conds)
    )
    primary_no_schedule = and_(
        ~Doctor.id.in_(select(DoctorSchedule.doctor_id)),
        Doctor.clinic_id.in_(select(Clinic.id).where(Clinic.is_active.is_(True), *clinic_conds)),
    )
    return or_(Doctor.id.in_(via_schedule), primary_no_schedule)


def _get_doctor_or_404(db: Session, doctor_id: int) -> Doctor:
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


def _apply_profile_fields(doctor: Doctor, data: dict) -> None:
    """بيطبّق حقول البروفايل الجديدة. photo_url بتتخزن على حساب المستخدم."""
    if "photo_url" in data:
        doctor.user.avatar_url = validate_image_url(data.pop("photo_url"))
    for field, value in data.items():
        if field in ("languages", "focus_areas") and value is not None:
            value = [str(v).strip() for v in value if str(v).strip()][:20]
        setattr(doctor, field, value)


# ---------- public listing / search ----------
@router.get("", response_model=list[DoctorOut])
def search_doctors(
    response: Response,
    q: str | None = Query(None, description="اسم الدكتور أو التخصص أو اسم العيادة"),
    specialty_id: int | None = None,
    specialty_ids: list[int] | None = Query(None, description="أكتر من تخصص"),
    clinic_id: int | None = None,
    city: str | None = None,
    cities: list[str] | None = Query(None, description="أكتر من مدينة"),
    districts: list[str] | None = Query(None, description="أكتر من منطقة (Maadi, Zamalek...)"),
    gender: Literal["male", "female"] | None = None,
    min_rating: float | None = Query(None, ge=1, le=5),
    min_fee: float | None = Query(None, ge=0),
    max_fee: float | None = Query(None, ge=0),
    verified: bool | None = None,
    accepting_new_patients: bool | None = None,
    online: bool | None = Query(None, description="true = بيقدم استشارة أونلاين"),
    availability: Literal["anytime", "today", "tomorrow", "this_week"] | None = None,
    available_on: date | None = Query(None, alias="date", description="متاح في يوم معين YYYY-MM-DD"),
    sort: str = Query("name", pattern="^(name|fee|experience|rating|recommended|next_available)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    base = (
        select(Doctor)
        .join(User, Doctor.user_id == User.id)
        .outerjoin(Specialty, Doctor.specialty_id == Specialty.id)
        .where(Doctor.is_active.is_(True), User.is_active.is_(True))
    )
    if q:
        term = f"%{q}%"
        base = base.where(
            or_(User.full_name.ilike(term), Specialty.name.ilike(term), _works_at(Clinic.name.ilike(term)))
        )
    spec_ids = ([specialty_id] if specialty_id else []) + (specialty_ids or [])
    if spec_ids:
        base = base.where(Doctor.specialty_id.in_(spec_ids))
    # فلاتر المكان: الدكتور يظهر بس لو بيشتغل في عيادة مطابقة (مش عيادته الأساسية بس)
    clinic_conds = []
    if clinic_id:
        clinic_conds.append(Clinic.id == clinic_id)
    if city:
        clinic_conds.append(Clinic.city.ilike(f"%{city}%"))
    if cities:
        clinic_conds.append(func.lower(Clinic.city).in_([c.strip().lower() for c in cities]))
    if districts:
        clinic_conds.append(func.lower(Clinic.district).in_([d.strip().lower() for d in districts]))
    allowed_clinics: set[int] | None = None
    if clinic_conds:
        base = base.where(_works_at(*clinic_conds))
        # المواعيد (Next Available + فلاتر التواجد) بتتحسب في العيادات المختارة بس
        allowed_clinics = set(db.scalars(select(Clinic.id).where(Clinic.is_active.is_(True), *clinic_conds)).all())
    if gender:
        base = base.where(Doctor.gender == gender)
    if min_fee is not None:
        base = base.where(Doctor.consultation_fee >= min_fee)
    if max_fee is not None:
        base = base.where(Doctor.consultation_fee <= max_fee)
    if verified is not None:
        base = base.where(Doctor.is_verified.is_(verified))
    if accepting_new_patients is not None:
        base = base.where(Doctor.accepting_new_patients.is_(accepting_new_patients))
    if online is not None:
        base = base.where(Doctor.offers_online.is_(online))

    # الفلاتر اللي بتتحسب بعد الـ query (تقييم/تواجد) والترتيب بأقرب موعد
    today = now_local().date()
    avail_range: tuple[date, date] | None = None
    if available_on:
        avail_range = (available_on, available_on)
    elif availability == "today":
        avail_range = (today, today)
    elif availability == "tomorrow":
        avail_range = (today + timedelta(days=1), today + timedelta(days=1))
    elif availability == "this_week":
        avail_range = (today, today + timedelta(days=6))
    needs_post = min_rating is not None or avail_range is not None or sort == "next_available"

    ordered = base
    if sort == "fee":
        ordered = ordered.order_by(Doctor.consultation_fee.asc(), User.full_name)
    elif sort == "experience":
        ordered = ordered.order_by(Doctor.years_of_experience.desc(), User.full_name)
    elif sort in ("rating", "recommended"):
        avg_sq = (
            select(Review.doctor_id.label("did"), func.avg(Review.rating).label("avg_r"))
            .group_by(Review.doctor_id)
            .subquery()
        )
        ordered = ordered.outerjoin(avg_sq, avg_sq.c.did == Doctor.id).order_by(avg_sq.c.avg_r.desc().nulls_last())
        if sort == "recommended":
            ordered = ordered.order_by(Doctor.years_of_experience.desc(), User.full_name)
    else:
        ordered = ordered.order_by(User.full_name)

    horizon_end = today + timedelta(days=settings.NEXT_AVAILABLE_HORIZON_DAYS)
    if avail_range:
        horizon_end = max(horizon_end, avail_range[1])

    if needs_post:
        doctors = db.scalars(ordered).unique().all()
        ratings = ratings_for(db, [d.id for d in doctors])
        if min_rating is not None:
            doctors = [d for d in doctors if ratings.get(d.id, (0, 0))[0] >= min_rating]
        slots = availability_map(db, doctors, today, horizon_end, allowed_clinics)
        if avail_range:
            lo, hi = avail_range
            doctors = [d for d in doctors if any(lo <= slot[0] <= hi for slot in slots[d.id])]
        if sort == "next_available":
            doctors.sort(key=lambda d: (not slots[d.id], slots[d.id][0] if slots[d.id] else (date.max, None)))
        total = len(doctors)
        doctors = doctors[offset : offset + limit]
    else:
        total = db.scalar(select(func.count()).select_from(base.order_by(None).subquery())) or 0
        doctors = db.scalars(ordered.limit(limit).offset(offset)).unique().all()
        ratings = ratings_for(db, [d.id for d in doctors])
        slots = availability_map(db, doctors, today, horizon_end, allowed_clinics)

    response.headers["X-Total-Count"] = str(total)
    clinics = clinics_for(db, doctors)
    return [_to_out(d, ratings, slots[d.id][0] if slots.get(d.id) else None, clinics[d.id]) for d in doctors]


# ---------- doctor's own area (must come before /{doctor_id}) ----------
@router.get("/me/profile", response_model=DoctorOut)
def my_profile(doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    return _to_out(doctor, _ratings_for(db, [doctor.id]))


@router.get("/me/stats")
def my_stats(doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    today = now_local().date()
    week_start = today - timedelta(days=today.weekday())
    month_ago = today - timedelta(days=30)

    def count(*conds):
        return db.scalar(select(func.count(Appointment.id)).where(Appointment.doctor_id == doctor.id, *conds)) or 0

    active = (AppointmentStatus.pending.value, AppointmentStatus.confirmed.value)
    ratings = _ratings_for(db, [doctor.id]).get(doctor.id, (None, 0))

    completed_30 = count(Appointment.status == AppointmentStatus.completed.value, Appointment.appointment_date >= month_ago)
    no_show_30 = count(Appointment.status == AppointmentStatus.no_show.value, Appointment.appointment_date >= month_ago)
    attended_base = completed_30 + no_show_30
    not_cancelled_30 = (
        Appointment.status != AppointmentStatus.cancelled.value,
        Appointment.appointment_date >= month_ago,
    )
    return {
        "today_appointments": count(Appointment.appointment_date == today, Appointment.status.in_(active)),
        "upcoming_appointments": count(Appointment.appointment_date >= today, Appointment.status.in_(active)),
        "pending_confirmation": count(Appointment.status == AppointmentStatus.pending.value),
        "completed_total": count(Appointment.status == AppointmentStatus.completed.value),
        "completed_this_week": count(
            Appointment.status == AppointmentStatus.completed.value,
            Appointment.appointment_date >= week_start,
            Appointment.appointment_date <= today,
        ),
        # نسبة الحضور آخر 30 يوم = المكتمل / (المكتمل + لم يحضر)
        "attendance_rate": round(completed_30 / attended_base * 100, 1) if attended_base else None,
        "visit_types_30d": {
            "online": count(Appointment.consultation_type == ConsultationType.online.value, *not_cancelled_30),
            "in_person": count(Appointment.consultation_type == ConsultationType.in_person.value, *not_cancelled_30),
        },
        "today_capacity": day_capacity(db, doctor, today),
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
    admin: User = Depends(require_roles(Role.admin)),
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
            **payload.model_dump(exclude={"email", "password", "first_name", "last_name", "full_name", "phone"}),
        )
        set_doctor_status(doctor, DoctorStatus.active.value)
        db.add(doctor)
        log_activity(db, admin.id, "doctor_created", "doctor", None, f"Admin added Dr. {user.full_name}")
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email is already registered")
    db.refresh(doctor)
    return _to_out(doctor, {})


@router.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = _get_doctor_or_404(db, doctor_id)
    if doctor.status in (DoctorStatus.pending.value, DoctorStatus.rejected.value):
        raise HTTPException(status_code=404, detail="Doctor not found")
    today = now_local().date()
    slots = availability_map(db, [doctor], today, today + timedelta(days=settings.NEXT_AVAILABLE_HORIZON_DAYS))
    return _to_out(
        doctor,
        _ratings_for(db, [doctor.id]),
        slots[doctor.id][0] if slots[doctor.id] else None,
        clinics_for(db, [doctor])[doctor.id],
    )


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
        # الدكتور يعدّل بياناته المهنية فقط، التخصص/العيادة/التفعيل/التوثيق للأدمن
        for forbidden in ("specialty_id", "clinic_id", "is_active", "license_number", "is_verified"):
            data.pop(forbidden, None)
    if data.get("specialty_id") and db.get(Specialty, data["specialty_id"]) is None:
        raise HTTPException(status_code=400, detail="Specialty does not exist")
    if data.get("clinic_id") and db.get(Clinic, data["clinic_id"]) is None:
        raise HTTPException(status_code=400, detail="Clinic does not exist")

    if "is_active" in data:
        new_active = data.pop("is_active")
        if new_active is not None:
            set_doctor_status(doctor, DoctorStatus.active.value if new_active else DoctorStatus.inactive.value)
    _apply_profile_fields(doctor, data)
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
    set_doctor_status(doctor, DoctorStatus.inactive.value)
    doctor.user.is_active = False
    db.commit()


# ---------- credentials (education / certifications) ----------
@router.get("/{doctor_id}/credentials", response_model=list[CredentialOut])
def get_credentials(doctor_id: int, db: Session = Depends(get_db)):
    return _get_doctor_or_404(db, doctor_id).credentials


@router.put("/{doctor_id}/credentials", response_model=list[CredentialOut])
def replace_credentials(
    doctor_id: int,
    items: list[CredentialIn],
    user: User = Depends(require_roles(Role.admin, Role.doctor)),
    db: Session = Depends(get_db),
):
    """يستبدل قايمة التعليم والشهادات بالكامل."""
    doctor = _get_doctor_or_404(db, doctor_id)
    ensure_doctor_owner_or_admin(user, doctor)
    if len(items) > 30:
        raise HTTPException(status_code=400, detail="Too many credentials")
    doctor.credentials.clear()
    db.flush()
    for item in items:
        doctor.credentials.append(DoctorCredential(**item.model_dump()))
    db.commit()
    db.refresh(doctor)
    return doctor.credentials


# ---------- availability ----------
@router.get("/{doctor_id}/slots", response_model=list[SlotOut])
def doctor_slots(
    doctor_id: int,
    day: date = Query(..., alias="date", description="YYYY-MM-DD"),
    clinic_id: int | None = Query(None, description="مواعيد العيادة دي بس"),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db, doctor_id)
    return generate_slots(db, doctor, day, {clinic_id} if clinic_id else None)


@router.get("/{doctor_id}/availability")
def doctor_availability(
    doctor_id: int,
    days: int = Query(14, ge=1, le=60),
    clinic_id: int | None = Query(None, description="أيام وتواجد العيادة دي بس"),
    db: Session = Depends(get_db),
):
    """عدد المواعيد المتاحة لكل يوم في الفترة القادمة (للـ calendar في الفرونت)."""
    doctor = _get_doctor_or_404(db, doctor_id)
    start = now_local().date()
    working_days = {
        sch.day_of_week
        for sch in db.scalars(
            select(DoctorSchedule).where(DoctorSchedule.doctor_id == doctor.id, DoctorSchedule.is_active.is_(True))
        ).all()
        if not clinic_id or (sch.clinic_id or doctor.clinic_id) == clinic_id
    }
    slots = availability_map(
        db, [doctor], start, start + timedelta(days=days - 1), {clinic_id} if clinic_id else None
    )[doctor.id]
    per_day: dict[date, int] = {}
    for slot in slots:
        per_day[slot[0]] = per_day.get(slot[0], 0) + 1
    # is_working_day = true و available_slots = 0  ->  اليوم "Full" في الواجهة
    return [
        {
            "date": start + timedelta(days=i),
            "available_slots": per_day.get(start + timedelta(days=i), 0),
            "is_working_day": (start + timedelta(days=i)).weekday() in working_days,
        }
        for i in range(days)
    ]


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

    for clinic_id in {i.clinic_id for i in items if i.clinic_id}:
        clinic = db.get(Clinic, clinic_id)
        if clinic is None or not clinic.is_active:
            raise HTTPException(status_code=400, detail=f"Clinic {clinic_id} does not exist or is inactive")

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
