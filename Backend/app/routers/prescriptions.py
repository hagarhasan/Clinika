from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_doctor, require_roles
from ..models import Appointment, Doctor, MedicalRecord, Patient, Prescription, PrescriptionItem, Role, User
from ..schemas import PrescriptionCreate, PrescriptionOut
from ..services.access import doctor_has_patient, get_doctor_profile, get_patient_profile
from ..services.notifications import audit, notify

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])
viewer = require_roles(Role.patient, Role.doctor)


@router.post("", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
def create_prescription(
    payload: PrescriptionCreate,
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
    if payload.medical_record_id:
        rec = db.get(MedicalRecord, payload.medical_record_id)
        if rec is None or rec.patient_id != patient.id:
            raise HTTPException(status_code=400, detail="Medical record does not match this patient")

    prescription = Prescription(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appointment_id=payload.appointment_id,
        medical_record_id=payload.medical_record_id,
        notes=payload.notes,
        items=[PrescriptionItem(**item.model_dump()) for item in payload.items],
    )
    db.add(prescription)
    db.flush()
    audit(db, doctor.user, "create", "prescription", prescription.id)
    notify(db, patient.user_id, "New prescription",
           f"Dr. {doctor.full_name} issued a new prescription for you.", "prescription")
    db.commit()
    db.refresh(prescription)
    return prescription


@router.get("", response_model=list[PrescriptionOut])
def list_prescriptions(
    patient_id: int | None = Query(None, description="للدكتور: روشتات مريض معين"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(viewer),
    db: Session = Depends(get_db),
):
    stmt = select(Prescription)
    if user.role == Role.patient.value:
        stmt = stmt.where(Prescription.patient_id == get_patient_profile(db, user).id)
    else:
        doctor = get_doctor_profile(db, user)
        if patient_id is None:
            raise HTTPException(status_code=400, detail="patient_id is required for doctors")
        if not doctor_has_patient(db, doctor.id, patient_id):
            raise HTTPException(status_code=403, detail="You are not authorized to view this patient's prescriptions")
        stmt = stmt.where(Prescription.patient_id == patient_id)
    return db.scalars(stmt.order_by(Prescription.created_at.desc()).limit(limit).offset(offset)).unique().all()


@router.get("/{prescription_id}", response_model=PrescriptionOut)
def get_prescription(prescription_id: int, user: User = Depends(viewer), db: Session = Depends(get_db)):
    obj = db.get(Prescription, prescription_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if user.role == Role.patient.value:
        if obj.patient.user_id != user.id:
            raise HTTPException(status_code=403, detail="You cannot access another patient's prescription")
    else:
        doctor = get_doctor_profile(db, user)
        if obj.doctor_id != doctor.id and not doctor_has_patient(db, doctor.id, obj.patient_id):
            raise HTTPException(status_code=403, detail="You are not authorized to view this prescription")
    audit(db, user, "view", "prescription", obj.id)
    db.commit()
    return obj
