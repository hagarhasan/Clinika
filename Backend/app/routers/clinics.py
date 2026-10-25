from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_roles
from ..models import Clinic, Doctor, Role
from ..schemas import ClinicIn, ClinicOut, ClinicUpdate

router = APIRouter(prefix="/clinics", tags=["Clinics"])
admin_only = require_roles(Role.admin)


@router.get("", response_model=list[ClinicOut])
def list_clinics(
    city: str | None = None,
    q: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(Clinic).where(Clinic.is_active.is_(True))
    if city:
        stmt = stmt.where(Clinic.city.ilike(f"%{city}%"))
    if q:
        stmt = stmt.where(Clinic.name.ilike(f"%{q}%"))
    return db.scalars(stmt.order_by(Clinic.name).limit(limit).offset(offset)).all()


@router.get("/{clinic_id}", response_model=ClinicOut)
def get_clinic(clinic_id: int, db: Session = Depends(get_db)):
    obj = db.get(Clinic, clinic_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return obj


@router.post("", response_model=ClinicOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(admin_only)])
def create_clinic(payload: ClinicIn, db: Session = Depends(get_db)):
    obj = Clinic(**payload.model_dump())
    db.add(obj)
    db.commit()
    return obj


@router.put("/{clinic_id}", response_model=ClinicOut, dependencies=[Depends(admin_only)])
def update_clinic(clinic_id: int, payload: ClinicUpdate, db: Session = Depends(get_db)):
    obj = db.get(Clinic, clinic_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Clinic not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    return obj


@router.delete("/{clinic_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_only)])
def delete_clinic(clinic_id: int, db: Session = Depends(get_db)):
    obj = db.get(Clinic, clinic_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Clinic not found")
    if db.scalar(select(Doctor.id).where(Doctor.clinic_id == clinic_id).limit(1)):
        obj.is_active = False  # عيادة عليها أطباء: نعمل deactivate بدل الحذف
    else:
        db.delete(obj)
    db.commit()
