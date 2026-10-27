from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Appointment, Clinic, Doctor, Review
from ..schemas import AppointmentOut, ClinicOut, DoctorOut, NextSlot
from .doctors import ratings_for


def doctor_to_out(
    doctor: Doctor,
    ratings: dict[int, tuple[float, int]],
    next_slot: tuple | None = None,
    clinics: list[Clinic] | None = None,
) -> DoctorOut:
    out = DoctorOut.model_validate(doctor)
    avg, count = ratings.get(doctor.id, (None, 0))
    out.rating_avg, out.reviews_count = avg, count
    if next_slot:
        out.next_available = NextSlot(
            appointment_date=next_slot[0],
            start_time=next_slot[1],
            clinic_id=next_slot[2] if len(next_slot) > 2 else None,
        )
    # لو العيادات متحسبتش (مثلا في شاشات الأدمن) بنرجّع عيادته الأساسية بس
    if clinics is None:
        clinics = [doctor.clinic] if doctor.clinic else []
    out.clinics = [ClinicOut.model_validate(c) for c in clinics]
    return out


def appointments_out(db: Session, appts: list[Appointment]) -> list[AppointmentOut]:
    """يحوّل الحجوزات لـ AppointmentOut مع تقييم الدكتور وهل المريض قيّم الزيارة (queries مجمّعة)."""
    if not appts:
        return []
    ratings = ratings_for(db, list({a.doctor_id for a in appts}))
    reviewed = set(db.scalars(select(Review.appointment_id).where(Review.appointment_id.in_([a.id for a in appts]))).all())
    result = []
    for appt in appts:
        out = AppointmentOut.model_validate(appt)
        avg, count = ratings.get(appt.doctor_id, (None, 0))
        out.doctor.rating_avg, out.doctor.reviews_count = avg, count
        out.has_review = appt.id in reviewed
        result.append(out)
    return result


def appointment_out(db: Session, appt: Appointment) -> AppointmentOut:
    return appointments_out(db, [appt])[0]
