from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_roles
from ..models import Doctor, Role, Specialty
from ..schemas import SpecialtyIn, SpecialtyOut

router = APIRouter(prefix="/specialties", tags=["Specialties"])
admin_only = require_roles(Role.admin)


@router.get("", response_model=list[SpecialtyOut])
def list_specialties(db: Session = Depends(get_db)):
    return db.scalars(select(Specialty).order_by(Specialty.name)).all()


@router.get("/{specialty_id}", response_model=SpecialtyOut)
def get_specialty(specialty_id: int, db: Session = Depends(get_db)):
    obj = db.get(Specialty, specialty_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Specialty not found")
    return obj


@router.post("", response_model=SpecialtyOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(admin_only)])
def create_specialty(payload: SpecialtyIn, db: Session = Depends(get_db)):
    obj = Specialty(**payload.model_dump())
    db.add(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Specialty already exists")
    return obj


@router.put("/{specialty_id}", response_model=SpecialtyOut, dependencies=[Depends(admin_only)])
def update_specialty(specialty_id: int, payload: SpecialtyIn, db: Session = Depends(get_db)):
    obj = db.get(Specialty, specialty_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Specialty not found")
    obj.name, obj.description = payload.name, payload.description
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Specialty name already exists")
    return obj


@router.delete("/{specialty_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_only)])
def delete_specialty(specialty_id: int, db: Session = Depends(get_db)):
    obj = db.get(Specialty, specialty_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Specialty not found")
    if db.scalar(select(Doctor.id).where(Doctor.specialty_id == specialty_id).limit(1)):
        raise HTTPException(status_code=400, detail="Cannot delete a specialty that has doctors")
    db.delete(obj)
    db.commit()
