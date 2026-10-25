from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_patient
from ..models import Appointment, AppointmentStatus, Patient, Review
from ..schemas import ReviewCreate, ReviewOut

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: ReviewCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    appt = db.get(Appointment, payload.appointment_id)
    if appt is None or appt.patient_id != patient.id:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status != AppointmentStatus.completed.value:
        raise HTTPException(status_code=400, detail="You can only review completed appointments")
    if db.scalar(select(Review.id).where(Review.appointment_id == appt.id)):
        raise HTTPException(status_code=409, detail="You already reviewed this appointment")

    review = Review(
        patient_id=patient.id,
        doctor_id=appt.doctor_id,
        appointment_id=appt.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="You already reviewed this appointment")
    db.refresh(review)
    return review
