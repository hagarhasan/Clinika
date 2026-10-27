from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Clinic, Doctor, DoctorSchedule, DoctorStatus, Review


def ratings_for(db: Session, doctor_ids: list[int]) -> dict[int, tuple[float, int]]:
    if not doctor_ids:
        return {}
    rows = db.execute(
        select(Review.doctor_id, func.avg(Review.rating), func.count(Review.id))
        .where(Review.doctor_id.in_(doctor_ids))
        .group_by(Review.doctor_id)
    ).all()
    return {r[0]: (round(float(r[1]), 2), int(r[2])) for r in rows}


def set_doctor_status(doctor: Doctor, status: str, reason: str | None = None) -> None:
    """بيزامن status مع is_active (اللي باقي الكود بيفلتر بيه) ويحفظ وقت المراجعة."""
    doctor.status = status
    doctor.is_active = status == DoctorStatus.active.value
    doctor.rejection_reason = reason if status == DoctorStatus.rejected.value else None
    if status in (DoctorStatus.active.value, DoctorStatus.rejected.value):
        doctor.reviewed_at = datetime.now(timezone.utc)


def clinics_for(db: Session, doctors: list[Doctor]) -> dict[int, list[Clinic]]:
    """العيادات اللي كل دكتور بيشتغل فيها (من فترات جدوله الفعّالة)، بـ query واحدة.
    الدكتور اللي لسه معندوش جدول بيرجّع عيادته الأساسية."""
    result: dict[int, list[Clinic]] = {d.id: [] for d in doctors}
    if not doctors:
        return result
    by_id = {d.id: d for d in doctors}
    seen: dict[int, set[int]] = {d.id: set() for d in doctors}
    rows = db.execute(
        select(DoctorSchedule.doctor_id, DoctorSchedule.clinic_id)
        .where(DoctorSchedule.doctor_id.in_(list(by_id)), DoctorSchedule.is_active.is_(True))
        .distinct()
    ).all()
    needed: set[int] = set()
    for did, cid in rows:
        effective = cid or by_id[did].clinic_id
        if effective:
            seen[did].add(effective)
            needed.add(effective)
    for d in doctors:
        if not seen[d.id] and d.clinic_id:
            seen[d.id].add(d.clinic_id)
            needed.add(d.clinic_id)
    clinics = {
        c.id: c for c in db.scalars(select(Clinic).where(Clinic.id.in_(needed), Clinic.is_active.is_(True))).all()
    } if needed else {}
    for did, ids in seen.items():
        result[did] = [clinics[i] for i in sorted(ids) if i in clinics]
    return result
