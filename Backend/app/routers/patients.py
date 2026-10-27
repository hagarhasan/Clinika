from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_patient, get_current_user, require_roles
from ..models import ACTIVE_STATUSES, Appointment, AppointmentStatus, Patient, Role, User
from ..schemas import PatientOut, PatientUpdate
from ..services.access import doctor_has_patient, get_doctor_profile
from ..services.serializers import appointment_out
from ..services.slots import now_local, to_local_dt

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("/me", response_model=PatientOut)
def my_profile(patient: Patient = Depends(get_current_patient)):
    return patient


@router.put("/me", response_model=PatientOut)
def update_my_profile(
    payload: PatientUpdate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True, exclude={"full_name"})
    for field in ("first_name", "last_name", "phone"):
        if field in data:
            setattr(patient.user, field, data.pop(field))
    patient.user.refresh_full_name()
    for field, value in data.items():
        setattr(patient, field, value)
    db.commit()
    return patient


@router.get("/me/stats")
def my_stats(patient: Patient = Depends(get_current_patient), db: Session = Depends(get_db)):
    """عدّادات داشبورد المريض + أقرب موعد قادم."""
    now = now_local()
    rows = db.execute(
        select(Appointment.status, func.count(Appointment.id))
        .where(Appointment.patient_id == patient.id)
        .group_by(Appointment.status)
    ).all()
    by_status = {s.value: 0 for s in AppointmentStatus}
    by_status.update({r[0]: r[1] for r in rows})

    upcoming = [
        a
        for a in db.scalars(
            select(Appointment)
            .where(
                Appointment.patient_id == patient.id,
                Appointment.status.in_(ACTIVE_STATUSES),
                Appointment.appointment_date >= now.date(),
            )
            .order_by(Appointment.appointment_date, Appointment.start_time)
        ).unique().all()
        if to_local_dt(a.appointment_date, a.start_time) >= now
    ]
    return {
        "upcoming": len(upcoming),
        "completed": by_status[AppointmentStatus.completed.value],
        "cancelled": by_status[AppointmentStatus.cancelled.value],
        "total": sum(by_status.values()),
        "next_appointment": appointment_out(db, upcoming[0]) if upcoming else None,
    }


@router.get("", response_model=list[PatientOut])
def list_patients(
    q: str | None = Query(None, description="بحث بالاسم أو التليفون"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_roles(Role.admin, Role.doctor)),
    db: Session = Depends(get_db),
):
    """الأدمن يشوف كل المرضى، الدكتور يشوف مرضاه فقط (اللي ليهم حجوزات معاه)."""
    stmt = select(Patient).join(User, Patient.user_id == User.id)
    if user.role == Role.doctor.value:
        doctor = get_doctor_profile(db, user)
        stmt = stmt.where(
            Patient.id.in_(
                select(Appointment.patient_id).where(
                    Appointment.doctor_id == doctor.id,
                    Appointment.status != AppointmentStatus.cancelled.value,
                )
            )
        )
    if q:
        stmt = stmt.where(User.full_name.ilike(f"%{q}%") | User.phone.ilike(f"%{q}%"))
    return db.scalars(stmt.order_by(User.full_name).limit(limit).offset(offset)).unique().all()


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    if user.role == Role.admin.value:
        return patient
    if user.role == Role.patient.value and patient.user_id == user.id:
        return patient
    if user.role == Role.doctor.value and doctor_has_patient(db, get_doctor_profile(db, user).id, patient.id):
        return patient
    raise HTTPException(status_code=403, detail="You do not have access to this patient")
