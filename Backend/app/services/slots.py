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


def generate_slots(db: Session, doctor: Doctor, day: date) -> list[dict]:
    """يرجّع كل المواعيد في اليوم مع is_available لكل واحد (الماضي مستبعد)."""
    if not doctor.is_active:
        return []

    now = now_local()
    today = now.date()
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
        cursor = datetime.combine(day, sch.start_time)
        end = datetime.combine(day, sch.end_time)
        while cursor + step <= end:
            start_t = cursor.time().replace(second=0, microsecond=0)
            if not (day == today and start_t <= now.time()):
                slots.append(
                    {
                        "start_time": start_t,
                        "end_time": (cursor + step).time(),
                        "is_available": start_t not in booked,
                    }
                )
            cursor += step
    return slots


def validate_slot(db: Session, doctor: Doctor, day: date, start: time) -> time:
    """يتأكد إن الموعد صالح ومتاح، ويرجّع وقت النهاية."""
    start = start.replace(second=0, microsecond=0)
    for slot in generate_slots(db, doctor, day):
        if slot["start_time"] == start:
            if not slot["is_available"]:
                raise HTTPException(status_code=409, detail="This time slot is already booked")
            return slot["end_time"]
    raise HTTPException(status_code=400, detail="This time is not available for this doctor")
