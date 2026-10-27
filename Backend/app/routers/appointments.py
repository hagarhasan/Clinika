from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_patient, get_current_user
from ..models import (
    ACTIVE_STATUSES,
    Appointment,
    AppointmentStatus,
    ConsultationType,
    Doctor,
    Patient,
    Role,
    User,
)
from ..schemas import AppointmentCreate, AppointmentOut, CancelIn, MeetingLinkIn, RescheduleIn, StatusUpdateIn
from ..services.access import get_doctor_profile, get_patient_profile
from ..services.booking import create_booking
from ..services.email import send_appointment_email
from ..services.notifications import log_activity, notify
from ..services.serializers import appointment_out, appointments_out
from ..services.slots import find_slot, now_local, to_local_dt

router = APIRouter(prefix="/appointments", tags=["Appointments"])


# ---------- helpers ----------
def _get_appointment(db: Session, appointment_id: int) -> Appointment:
    appt = db.get(Appointment, appointment_id)
    if appt is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt


def _ensure_access(user: User, appt: Appointment) -> None:
    if user.role == Role.admin.value:
        return
    if user.role == Role.patient.value and appt.patient.user_id == user.id:
        return
    if user.role == Role.doctor.value and appt.doctor.user_id == user.id:
        return
    raise HTTPException(status_code=403, detail="You do not have access to this appointment")


def _label(appt: Appointment) -> str:
    return f"{appt.appointment_date.isoformat()} {appt.start_time.strftime('%H:%M')}"


def _patient_conflict(db: Session, patient_id: int, day: date, start, exclude_id: int | None = None) -> bool:
    stmt = select(Appointment.id).where(
        Appointment.patient_id == patient_id,
        Appointment.appointment_date == day,
        Appointment.start_time == start,
        Appointment.status.in_(ACTIVE_STATUSES),
    )
    if exclude_id:
        stmt = stmt.where(Appointment.id != exclude_id)
    return db.scalar(stmt.limit(1)) is not None


# ---------- create ----------
@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def book_appointment(
    payload: AppointmentCreate,
    user: User = Depends(get_current_user),
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
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
        actor=user,
        clinic_id=payload.clinic_id,
    )
    db.commit()
    db.refresh(appt)

    kind = "Online" if appt.consultation_type == ConsultationType.online.value else "In-person"
    lines = [
        f"Reference: {appt.reference_number}",
        f"Doctor: Dr. {doctor.full_name}",
        f"When: {_label(appt)} ({kind})",
        *([f"Clinic: {appt.clinic.name}" + (f" - {appt.clinic.address}" if appt.clinic.address else "")] if appt.clinic else []),
        f"Fee: {appt.fee_at_booking} EGP - pay at the clinic",
    ]
    if appt.meeting_link:
        lines.append(f"Meeting link: {appt.meeting_link}")
    send_appointment_email(patient.user.email, patient.first_name, "Your Clinika appointment", lines)
    return appointment_out(db, appt)


# ---------- list / details ----------
@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    status_filter: str | None = Query(None, alias="status"),
    date_from: date | None = None,
    date_to: date | None = None,
    doctor_id: int | None = None,
    patient_id: int | None = None,
    upcoming: bool | None = Query(None, description="true = القادمة فقط، false = السابقة فقط"),
    consultation_type: str | None = Query(None, pattern="^(in_person|online)$"),
    q: str | None = Query(None, description="بحث باسم المريض أو الدكتور أو رقم الحجز"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """المريض يشوف حجوزاته، الدكتور يشوف حجوزاته، الأدمن يشوف الكل."""
    stmt = select(Appointment)
    if user.role == Role.patient.value:
        stmt = stmt.where(Appointment.patient_id == get_patient_profile(db, user).id)
        if doctor_id:
            stmt = stmt.where(Appointment.doctor_id == doctor_id)
    elif user.role == Role.doctor.value:
        stmt = stmt.where(Appointment.doctor_id == get_doctor_profile(db, user).id)
        if patient_id:
            stmt = stmt.where(Appointment.patient_id == patient_id)
    else:
        if doctor_id:
            stmt = stmt.where(Appointment.doctor_id == doctor_id)
        if patient_id:
            stmt = stmt.where(Appointment.patient_id == patient_id)

    if status_filter:
        if status_filter not in {s.value for s in AppointmentStatus}:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        stmt = stmt.where(Appointment.status == status_filter)
    if consultation_type:
        stmt = stmt.where(Appointment.consultation_type == consultation_type)
    if q:
        term = f"%{q.strip().lstrip('#')}%"
        patient_ids = select(Patient.id).join(User, Patient.user_id == User.id).where(User.full_name.ilike(term))
        doctor_ids = select(Doctor.id).join(User, Doctor.user_id == User.id).where(User.full_name.ilike(term))
        stmt = stmt.where(
            or_(
                Appointment.reference_number.ilike(term),
                Appointment.patient_id.in_(patient_ids),
                Appointment.doctor_id.in_(doctor_ids),
            )
        )
    if date_from:
        stmt = stmt.where(Appointment.appointment_date >= date_from)
    if date_to:
        stmt = stmt.where(Appointment.appointment_date <= date_to)

    today = now_local().date()
    if upcoming is True:
        stmt = stmt.where(Appointment.appointment_date >= today).order_by(
            Appointment.appointment_date, Appointment.start_time
        )
    elif upcoming is False:
        stmt = stmt.where(Appointment.appointment_date < today).order_by(
            Appointment.appointment_date.desc(), Appointment.start_time.desc()
        )
    else:
        stmt = stmt.order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())

    return appointments_out(db, db.scalars(stmt.limit(limit).offset(offset)).unique().all())


@router.get("/today", response_model=list[AppointmentOut])
def todays_appointments(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """مواعيد اليوم (للدكتور: dashboard اليوم، للمريض: مواعيده اليوم)."""
    today = now_local().date()
    stmt = select(Appointment).where(
        Appointment.appointment_date == today,
        Appointment.status.in_(ACTIVE_STATUSES),
    )
    if user.role == Role.patient.value:
        stmt = stmt.where(Appointment.patient_id == get_patient_profile(db, user).id)
    elif user.role == Role.doctor.value:
        stmt = stmt.where(Appointment.doctor_id == get_doctor_profile(db, user).id)
    return appointments_out(db, db.scalars(stmt.order_by(Appointment.start_time)).unique().all())


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appt = _get_appointment(db, appointment_id)
    _ensure_access(user, appt)
    return appointment_out(db, appt)


# ---------- meeting link (online visits) ----------
@router.patch("/{appointment_id}/meeting-link", response_model=AppointmentOut)
def set_meeting_link(
    appointment_id: int,
    payload: MeetingLinkIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """الدكتور (أو الأدمن) يغيّر لينك المكالمة. الفيديو نفسه بره النظام، إحنا بنحفظ اللينك بس."""
    if user.role == Role.patient.value:
        raise HTTPException(status_code=403, detail="Only doctors and admins can change the meeting link")
    appt = _get_appointment(db, appointment_id)
    _ensure_access(user, appt)
    if appt.consultation_type != ConsultationType.online.value:
        raise HTTPException(status_code=400, detail="This is not an online appointment")
    appt.meeting_link = payload.meeting_link
    if payload.meeting_link:
        notify(db, appt.patient.user_id, "Meeting link updated",
               f"The meeting link for your appointment on {_label(appt)} was updated.", "appointment")
    db.commit()
    return appointment_out(db, appt)


# ---------- cancel ----------
@router.patch("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel_appointment(
    appointment_id: int,
    payload: CancelIn | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = _get_appointment(db, appointment_id)
    _ensure_access(user, appt)

    if appt.status not in ACTIVE_STATUSES:
        raise HTTPException(status_code=400, detail=f"Cannot cancel an appointment that is {appt.status}")

    if user.role == Role.patient.value:
        limit_dt = to_local_dt(appt.appointment_date, appt.start_time) - timedelta(
            hours=settings.CANCEL_MIN_HOURS_BEFORE
        )
        if now_local() > limit_dt:
            raise HTTPException(
                status_code=400,
                detail=f"Appointments can only be cancelled at least {settings.CANCEL_MIN_HOURS_BEFORE} hours before the start time",
            )

    appt.status = AppointmentStatus.cancelled.value
    appt.cancelled_by = user.role
    appt.cancellation_reason = payload.reason if payload else None

    if user.role == Role.patient.value:
        notify(db, appt.doctor.user_id, "Appointment cancelled",
               f"{appt.patient.full_name} cancelled the appointment on {_label(appt)}.", "appointment")
    else:
        notify(db, appt.patient.user_id, "Appointment cancelled",
               f"Your appointment with Dr. {appt.doctor.full_name} on {_label(appt)} was cancelled.", "appointment")
    log_activity(db, user.id, "appointment_cancelled", "appointment", appt.id,
                 f"{appt.reference_number or '#' + str(appt.id)} cancelled by {user.role}")
    db.commit()
    return appointment_out(db, appt)


# ---------- reschedule ----------
@router.patch("/{appointment_id}/reschedule", response_model=AppointmentOut)
def reschedule_appointment(
    appointment_id: int,
    payload: RescheduleIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == Role.doctor.value:
        raise HTTPException(status_code=403, detail="Doctors can cancel appointments, patients reschedule them")
    appt = _get_appointment(db, appointment_id)
    _ensure_access(user, appt)

    if appt.status not in ACTIVE_STATUSES:
        raise HTTPException(status_code=400, detail=f"Cannot reschedule an appointment that is {appt.status}")

    new_start = payload.start_time.replace(second=0, microsecond=0)
    if appt.appointment_date == payload.appointment_date and appt.start_time == new_start:
        raise HTTPException(status_code=400, detail="The new time is the same as the current one")

    if user.role == Role.patient.value:
        limit_dt = to_local_dt(appt.appointment_date, appt.start_time) - timedelta(
            hours=settings.CANCEL_MIN_HOURS_BEFORE
        )
        if now_local() > limit_dt:
            raise HTTPException(
                status_code=400,
                detail=f"Appointments can only be rescheduled at least {settings.CANCEL_MIN_HOURS_BEFORE} hours before the start time",
            )

    # الافتراضي: نفس العيادة اللي المريض حجز فيها، إلا لو اختار عيادة تانية صراحةً
    target_clinic = payload.clinic_id or appt.clinic_id
    slot = find_slot(db, appt.doctor, payload.appointment_date, new_start, target_clinic)
    end = slot["end_time"]
    if _patient_conflict(db, appt.patient_id, payload.appointment_date, new_start, exclude_id=appt.id):
        raise HTTPException(status_code=409, detail="You already have an appointment at this time")

    old_label = _label(appt)
    appt.appointment_date = payload.appointment_date
    appt.start_time = new_start
    appt.end_time = end
    appt.clinic_id = slot["clinic_id"]
    appt.reminder_sent = False
    appt.status = (
        AppointmentStatus.confirmed.value if settings.AUTO_CONFIRM_APPOINTMENTS else AppointmentStatus.pending.value
    )
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This time slot was just booked by someone else")

    notify(db, appt.doctor.user_id, "Appointment rescheduled",
           f"{appt.patient.full_name} moved the appointment from {old_label} to {_label(appt)}.", "appointment")
    notify(db, appt.patient.user_id, "Appointment rescheduled",
           f"Your appointment with Dr. {appt.doctor.full_name} is now on {_label(appt)}.", "appointment")
    log_activity(db, user.id, "appointment_rescheduled", "appointment", appt.id,
                 f"{appt.reference_number or '#' + str(appt.id)} moved to {_label(appt)}")
    db.commit()
    return appointment_out(db, appt)


# ---------- status (doctor/admin) ----------
_ALLOWED_TRANSITIONS = {
    AppointmentStatus.pending.value: {"confirmed"},
    AppointmentStatus.confirmed.value: {"completed", "no_show"},
}


@router.patch("/{appointment_id}/status", response_model=AppointmentOut)
def update_status(
    appointment_id: int,
    payload: StatusUpdateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == Role.patient.value:
        raise HTTPException(status_code=403, detail="Only doctors and admins can change the appointment status")
    appt = _get_appointment(db, appointment_id)
    _ensure_access(user, appt)

    if payload.status not in _ALLOWED_TRANSITIONS.get(appt.status, set()):
        raise HTTPException(status_code=400, detail=f"Cannot change status from {appt.status} to {payload.status}")

    if payload.status in ("completed", "no_show"):
        if to_local_dt(appt.appointment_date, appt.start_time) > now_local():
            raise HTTPException(status_code=400, detail="The appointment has not started yet")

    appt.status = payload.status
    messages = {
        "confirmed": ("Appointment confirmed", f"Dr. {appt.doctor.full_name} confirmed your appointment on {_label(appt)}."),
        "completed": ("Visit completed", f"Your visit with Dr. {appt.doctor.full_name} is marked as completed. You can now rate the doctor."),
        "no_show": ("Missed appointment", f"You missed your appointment with Dr. {appt.doctor.full_name} on {_label(appt)}."),
    }
    title, message = messages[payload.status]
    notify(db, appt.patient.user_id, title, message, "appointment")
    log_activity(db, user.id, f"appointment_{payload.status}", "appointment", appt.id,
                 f"{appt.reference_number or '#' + str(appt.id)} marked {payload.status}")
    db.commit()
    return appointment_out(db, appt)
