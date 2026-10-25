from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_doctor, require_roles
from ..models import Appointment, Doctor, MedicalRecord, Patient, Role, User
from ..schemas import MedicalRecordCreate, MedicalRecordOut, MedicalRecordUpdate
from ..services.access import doctor_has_patient, get_doctor_profile, get_patient_profile
from ..services.notifications import audit, notify

router = APIRouter(prefix="/medical-records", tags=["Medical Records"])

# الأدمن ممنوع من قراءة المحتوى الطبي (privacy) — فقط المريض صاحب السجل والأطباء المصرّح لهم
viewer = require_roles(Role.patient, Role.doctor)


def _check_view_access(db: Session, user: User, record: MedicalRecord) -> None:
    if user.role == Role.patient.value:
        if record.patient.user_id != user.id:
            raise HTTPException(status_code=403, detail="You cannot access another patient's records")
        return
    doctor = get_doctor_profile(db, user)
    if record.doctor_id != doctor.id and not doctor_has_patient(db, doctor.id, record.patient_id):
        raise HTTPException(status_code=403, detail="You are not authorized to view this record")


@router.post("", response_model=MedicalRecordOut, status_code=status.HTTP_201_CREATED)
def create_record(
    payload: MedicalRecordCreate,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    patient = db.get(Patient, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    if not doctor_has_patient(db, doctor.id, patient.id):
        raise HTTPException(status_code=403, detail="You have no appointment with this patient")

    if payload.appointment_id:
        appt = db.get(Appointment, payload.appointment_id)
        if appt is None or appt.doctor_id != doctor.id or appt.patient_id != patient.id:
            raise HTTPException(status_code=400, detail="Appointment does not match this doctor and patient")

    record = MedicalRecord(doctor_id=doctor.id, **payload.model_dump())
    db.add(record)
    db.flush()
    audit(db, doctor.user, "create", "medical_record", record.id)
    notify(db, patient.user_id, "New medical record",
           f"Dr. {doctor.full_name} added a new medical record to your file.", "medical_record")
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=list[MedicalRecordOut])
def list_records(
    patient_id: int | None = Query(None, description="للدكتور: سجلات مريض معين"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(viewer),
    db: Session = Depends(get_db),
):
    stmt = select(MedicalRecord)
    if user.role == Role.patient.value:
        stmt = stmt.where(MedicalRecord.patient_id == get_patient_profile(db, user).id)
    else:
        doctor = get_doctor_profile(db, user)
        if patient_id is None:
            raise HTTPException(status_code=400, detail="patient_id is required for doctors")
        if not doctor_has_patient(db, doctor.id, patient_id):
            raise HTTPException(status_code=403, detail="You are not authorized to view this patient's records")
        stmt = stmt.where(MedicalRecord.patient_id == patient_id)

    records = db.scalars(stmt.order_by(MedicalRecord.created_at.desc()).limit(limit).offset(offset)).unique().all()
    audit(db, user, "list", "medical_record", None)
    db.commit()
    return records


@router.get("/{record_id}", response_model=MedicalRecordOut)
def get_record(record_id: int, user: User = Depends(viewer), db: Session = Depends(get_db)):
    record = db.get(MedicalRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    _check_view_access(db, user, record)
    audit(db, user, "view", "medical_record", record.id)
    db.commit()
    return record


@router.put("/{record_id}", response_model=MedicalRecordOut)
def update_record(
    record_id: int,
    payload: MedicalRecordUpdate,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    record = db.get(MedicalRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    if record.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Only the doctor who created the record can edit it")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    audit(db, doctor.user, "update", "medical_record", record.id)
    db.commit()
    db.refresh(record)
    return record
