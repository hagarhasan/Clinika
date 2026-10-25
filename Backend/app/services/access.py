from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Appointment, AppointmentStatus, Doctor, Patient, Role, User


def doctor_has_patient(db: Session, doctor_id: int, patient_id: int) -> bool:
    """الدكتور مسموح له يشوف بيانات المريض لو بينهم حجز غير ملغي."""
    found = db.scalar(
        select(Appointment.id)
        .where(
            Appointment.doctor_id == doctor_id,
            Appointment.patient_id == patient_id,
            Appointment.status != AppointmentStatus.cancelled.value,
        )
        .limit(1)
    )
    return found is not None


def get_doctor_profile(db: Session, user: User) -> Doctor:
    doctor = db.scalar(select(Doctor).where(Doctor.user_id == user.id))
    if doctor is None:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return doctor


def get_patient_profile(db: Session, user: User) -> Patient:
    patient = db.scalar(select(Patient).where(Patient.user_id == user.id))
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient


def ensure_doctor_owner_or_admin(user: User, doctor: Doctor) -> None:
    if user.role == Role.admin.value:
        return
    if user.role == Role.doctor.value and doctor.user_id == user.id:
        return
    raise HTTPException(status_code=403, detail="You do not have permission to modify this doctor")
