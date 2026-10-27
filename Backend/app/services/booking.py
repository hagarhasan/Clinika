import secrets
from datetime import date, time

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..models import (
    ACTIVE_STATUSES,
    Appointment,
    AppointmentStatus,
    ConsultationType,
    Doctor,
    Patient,
    User,
)
from .notifications import log_activity, notify
from .slots import find_slot, now_local


def create_booking(
    db: Session,
    *,
    patient: Patient,
    doctor: Doctor,
    appointment_date: date,
    start_time: time,
    reason: str | None,
    consultation_type: str,
    actor: User,
    status: str | None = None,
    clinic_id: int | None = None,
) -> Appointment:
    """منطق الحجز المشترك (المريض بيحجز لنفسه، أو الأدمن بيحجز نيابة عن مريض). من غير commit."""
    if not doctor.is_active:
        raise HTTPException(status_code=400, detail="This doctor is not available for booking")
    if consultation_type == ConsultationType.online.value and not doctor.offers_online:
        raise HTTPException(status_code=400, detail="This doctor does not offer online consultations")

    if not doctor.accepting_new_patients:
        seen_before = db.scalar(
            select(Appointment.id)
            .where(
                Appointment.doctor_id == doctor.id,
                Appointment.patient_id == patient.id,
                Appointment.status != AppointmentStatus.cancelled.value,
            )
            .limit(1)
        )
        if seen_before is None:
            raise HTTPException(status_code=400, detail="This doctor is not accepting new patients")

    # لو المريض اختار عيادة والدكتور في عيادة تانية في الوقت ده → الحجز بيترفض
    slot = find_slot(db, doctor, appointment_date, start_time, clinic_id)
    end_time = slot["end_time"]
    start_time = start_time.replace(second=0, microsecond=0)

    clash = db.scalar(
        select(Appointment.id).where(
            Appointment.patient_id == patient.id,
            Appointment.appointment_date == appointment_date,
            Appointment.start_time == start_time,
            Appointment.status.in_(ACTIVE_STATUSES),
        )
    )
    if clash:
        raise HTTPException(status_code=409, detail="The patient already has an appointment at this time")

    if status is None:
        status = (
            AppointmentStatus.confirmed.value if settings.AUTO_CONFIRM_APPOINTMENTS else AppointmentStatus.pending.value
        )
    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appointment_date=appointment_date,
        start_time=start_time,
        end_time=end_time,
        status=status,
        reason=reason,
        consultation_type=consultation_type,
        fee_at_booking=doctor.consultation_fee,
        clinic_id=slot["clinic_id"],
    )
    db.add(appt)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This time slot is already booked")

    appt.reference_number = f"APT-{now_local().year}-{appt.id:04d}"
    if consultation_type == ConsultationType.online.value:
        # لينك مكالمة جاهز (الدكتور يقدر يغيّره). الفيديو نفسه بره النظام.
        appt.meeting_link = f"{settings.ONLINE_MEETING_BASE_URL.rstrip('/')}/Clinika-{secrets.token_hex(8)}"
    db.flush()

    when = f"{appointment_date.isoformat()} {start_time.strftime('%H:%M')}"
    notify(
        db,
        doctor.user_id,
        "New appointment",
        f"{patient.full_name} booked {when} ({appt.reference_number}).",
        "appointment",
    )
    notify(
        db,
        patient.user_id,
        "Appointment booked",
        f"Your appointment with Dr. {doctor.full_name} on {when} was booked ({appt.reference_number}).",
        "appointment",
    )
    log_activity(
        db, actor.id, "appointment_booked", "appointment", appt.id,
        f"{patient.full_name} booked Dr. {doctor.full_name} on {when}",
    )
    return appt
