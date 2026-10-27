from collections import defaultdict
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Appointment, AppointmentStatus, Doctor, DoctorSchedule, DoctorTimeOff

TZ = ZoneInfo(settings.TIMEZONE)


def now_local() -> datetime:
    return datetime.now(TZ)


def to_local_dt(day: date, t: time) -> datetime:
    return datetime.combine(day, t, tzinfo=TZ)


def _cutoff() -> datetime:
    """أقرب وقت مسموح بالحجز فيه (بتوقيت القاهرة، من غير tzinfo للمقارنة)."""
    return now_local().replace(tzinfo=None) + timedelta(minutes=settings.MIN_BOOKING_NOTICE_MINUTES)


def effective_clinic_id(schedule: DoctorSchedule, doctor: Doctor) -> int | None:
    """العيادة الفعلية للفترة: اللي الدكتور اختارها، وإلا عيادته الأساسية."""
    return schedule.clinic_id or doctor.clinic_id


def generate_slots(db: Session, doctor: Doctor, day: date, clinic_ids: set[int] | None = None) -> list[dict]:
    """يرجّع كل المواعيد في اليوم مع is_available وclinic_id لكل واحد (الماضي مستبعد).
    لو clinic_ids اتحدد بنرجّع مواعيد العيادات دي بس."""
    if not doctor.is_active:
        return []

    today = now_local().date()
    cutoff = _cutoff()
    if day < today or day > today + timedelta(days=settings.MAX_ADVANCE_BOOKING_DAYS):
        return []

    on_leave = db.scalar(
        select(func.count())
        .select_from(DoctorTimeOff)
        .where(
            DoctorTimeOff.doctor_id == doctor.id,
            DoctorTimeOff.start_date <= day,
            DoctorTimeOff.end_date >= day,
        )
    )
    if on_leave:
        return []

    schedules = db.scalars(
        select(DoctorSchedule)
        .where(
            DoctorSchedule.doctor_id == doctor.id,
            DoctorSchedule.day_of_week == day.weekday(),
            DoctorSchedule.is_active.is_(True),
        )
        .order_by(DoctorSchedule.start_time)
    ).all()
    if not schedules:
        return []

    booked = set(
        db.scalars(
            select(Appointment.start_time).where(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date == day,
                Appointment.status != AppointmentStatus.cancelled.value,
            )
        ).all()
    )

    step = timedelta(minutes=doctor.slot_duration_minutes)
    slots: list[dict] = []
    for sch in schedules:
        clinic_id = effective_clinic_id(sch, doctor)
        if clinic_ids is not None and clinic_id not in clinic_ids:
            continue
        cursor = datetime.combine(day, sch.start_time)
        end = datetime.combine(day, sch.end_time)
        while cursor + step <= end:
            start_t = cursor.time().replace(second=0, microsecond=0)
            if cursor > cutoff:
                slots.append(
                    {
                        "start_time": start_t,
                        "end_time": (cursor + step).time(),
                        "is_available": start_t not in booked,
                        "clinic_id": clinic_id,
                    }
                )
            cursor += step
    return slots


def find_slot(db: Session, doctor: Doctor, day: date, start: time, clinic_id: int | None = None) -> dict:
    """يتأكد إن الموعد صالح ومتاح، ولو clinic_id اتحدد يتأكد إن الدكتور في العيادة دي في الوقت ده.
    (الدكتور مينفعش يبقى في عيادتين في نفس الوقت، فالوقت لوحده بيحدد العيادة.)"""
    start = start.replace(second=0, microsecond=0)
    for slot in generate_slots(db, doctor, day):
        if slot["start_time"] == start:
            if clinic_id is not None and slot["clinic_id"] != clinic_id:
                raise HTTPException(status_code=400, detail="The doctor is not at this clinic at that time")
            if not slot["is_available"]:
                raise HTTPException(status_code=409, detail="This time slot is already booked")
            return slot
    raise HTTPException(status_code=400, detail="This time is not available for this doctor")


def validate_slot(db: Session, doctor: Doctor, day: date, start: time, clinic_id: int | None = None) -> time:
    """يتأكد إن الموعد صالح ومتاح، ويرجّع وقت النهاية."""
    return find_slot(db, doctor, day, start, clinic_id)["end_time"]


def availability_map(
    db: Session, doctors: list[Doctor], start: date, end: date, clinic_ids: set[int] | None = None
) -> dict[int, list[tuple[date, time, int | None]]]:
    """المواعيد المتاحة لعدة دكاترة في فترة، بـ 3 queries بس (للـ Next Available والفلاتر).
    كل عنصر: (التاريخ، الوقت، clinic_id). لو clinic_ids اتحدد بنرجّع مواعيد العيادات دي بس."""
    result: dict[int, list[tuple[date, time, int | None]]] = {d.id: [] for d in doctors}
    active = [d for d in doctors if d.is_active]
    if not active:
        return result
    today = now_local().date()
    start = max(start, today)
    end = min(end, today + timedelta(days=settings.MAX_ADVANCE_BOOKING_DAYS))
    if start > end:
        return result

    ids = [d.id for d in active]
    cutoff = _cutoff()

    schedules: dict[tuple[int, int], list[DoctorSchedule]] = defaultdict(list)
    for sch in db.scalars(
        select(DoctorSchedule)
        .where(DoctorSchedule.doctor_id.in_(ids), DoctorSchedule.is_active.is_(True))
        .order_by(DoctorSchedule.start_time)
    ).all():
        schedules[(sch.doctor_id, sch.day_of_week)].append(sch)

    time_off: dict[int, list[tuple[date, date]]] = defaultdict(list)
    for off in db.scalars(
        select(DoctorTimeOff).where(
            DoctorTimeOff.doctor_id.in_(ids), DoctorTimeOff.start_date <= end, DoctorTimeOff.end_date >= start
        )
    ).all():
        time_off[off.doctor_id].append((off.start_date, off.end_date))

    booked: dict[tuple[int, date], set[time]] = defaultdict(set)
    for did, day, t in db.execute(
        select(Appointment.doctor_id, Appointment.appointment_date, Appointment.start_time).where(
            Appointment.doctor_id.in_(ids),
            Appointment.appointment_date.between(start, end),
            Appointment.status != AppointmentStatus.cancelled.value,
        )
    ).all():
        booked[(did, day)].add(t.replace(second=0, microsecond=0))

    day = start
    while day <= end:
        for doc in active:
            if any(a <= day <= b for a, b in time_off[doc.id]):
                continue
            step = timedelta(minutes=doc.slot_duration_minutes)
            taken = booked.get((doc.id, day), set())
            for sch in schedules.get((doc.id, day.weekday()), []):
                clinic_id = effective_clinic_id(sch, doc)
                if clinic_ids is not None and clinic_id not in clinic_ids:
                    continue
                cursor = datetime.combine(day, sch.start_time)
                stop = datetime.combine(day, sch.end_time)
                while cursor + step <= stop:
                    start_t = cursor.time().replace(second=0, microsecond=0)
                    if cursor > cutoff and start_t not in taken:
                        result[doc.id].append((day, start_t, clinic_id))
                    cursor += step
        day += timedelta(days=1)
    return result


def day_capacity(db: Session, doctor: Doctor, day: date) -> dict:
    """سعة اليوم للدكتور: إجمالي المواعيد، المحجوز، المتبقي، والنسبة المئوية."""
    on_leave = db.scalar(
        select(func.count())
        .select_from(DoctorTimeOff)
        .where(DoctorTimeOff.doctor_id == doctor.id, DoctorTimeOff.start_date <= day, DoctorTimeOff.end_date >= day)
    )
    total = 0
    if not on_leave:
        step = timedelta(minutes=doctor.slot_duration_minutes)
        for sch in db.scalars(
            select(DoctorSchedule).where(
                DoctorSchedule.doctor_id == doctor.id,
                DoctorSchedule.day_of_week == day.weekday(),
                DoctorSchedule.is_active.is_(True),
            )
        ).all():
            span = datetime.combine(day, sch.end_time) - datetime.combine(day, sch.start_time)
            total += int(span / step)
    booked = (
        db.scalar(
            select(func.count(Appointment.id)).where(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date == day,
                Appointment.status != AppointmentStatus.cancelled.value,
            )
        )
        or 0
    )
    remaining = sum(1 for s in generate_slots(db, doctor, day) if s["is_available"])
    return {
        "total_slots": total,
        "booked": booked,
        "remaining": remaining,
        "percent_booked": round(booked / total * 100) if total else 0,
    }
