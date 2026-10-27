from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Appointment,
    AppointmentStatus,
    Clinic,
    ContactMessage,
    Doctor,
    Patient,
    Review,
    Specialty,
)
from ..schemas import ContactIn
from ..services.email import send_contact_notification
from ..services.notifications import log_activity, notify_admins
from ..services.slots import now_local

router = APIRouter(tags=["Public"])


@router.get("/public/stats")
def public_stats(db: Session = Depends(get_db)):
    """أرقام الصفحة الرئيسية (48+ دكتور...). كلها حقيقية من الداتابيز."""
    today = now_local().date()
    month_start = today.replace(day=1)
    avg, reviews = db.execute(select(func.avg(Review.rating), func.count(Review.id))).one()
    return {
        "doctors": db.scalar(select(func.count(Doctor.id)).where(Doctor.is_active.is_(True))) or 0,
        "patients": db.scalar(select(func.count(Patient.id))) or 0,
        "specialties": db.scalar(select(func.count(Specialty.id))) or 0,
        "clinics": db.scalar(select(func.count(Clinic.id)).where(Clinic.is_active.is_(True))) or 0,
        "appointments_total": db.scalar(
            select(func.count(Appointment.id)).where(Appointment.status != AppointmentStatus.cancelled.value)
        )
        or 0,
        "appointments_this_month": db.scalar(
            select(func.count(Appointment.id)).where(
                Appointment.appointment_date >= month_start,
                Appointment.status != AppointmentStatus.cancelled.value,
            )
        )
        or 0,
        "average_rating": round(float(avg), 2) if avg is not None else None,
        "reviews_count": int(reviews or 0),
    }


@router.get("/public/locations")
def public_locations(db: Session = Depends(get_db)):
    """قايمة المدن والمناطق (اللي فيها دكاترة فعلًا) لفلاتر البحث."""
    rows = db.execute(
        select(Clinic.city, Clinic.district, func.count(Doctor.id))
        .join(Doctor, Doctor.clinic_id == Clinic.id)
        .where(Doctor.is_active.is_(True), Clinic.is_active.is_(True), Clinic.city.is_not(None))
        .group_by(Clinic.city, Clinic.district)
        .order_by(Clinic.city, Clinic.district)
    ).all()
    cities: dict[str, dict] = {}
    for city, district, n in rows:
        entry = cities.setdefault(city, {"city": city, "doctors": 0, "districts": []})
        entry["doctors"] += n
        if district:
            entry["districts"].append({"district": district, "doctors": n})
    return {"cities": list(cities.values())}


@router.post("/contact", status_code=status.HTTP_201_CREATED)
def send_contact_message(payload: ContactIn, db: Session = Depends(get_db)):
    """فورم Contact Us (من غير تسجيل دخول)."""
    email = payload.email.lower()
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    recent = db.scalar(
        select(func.count(ContactMessage.id)).where(ContactMessage.email == email, ContactMessage.created_at > since)
    )
    if (recent or 0) >= 5:
        raise HTTPException(status_code=429, detail="Too many messages. Please try again later.")

    msg = ContactMessage(
        name=payload.name.strip(), email=email,
        subject=payload.subject.strip() if payload.subject else None, message=payload.message.strip(),
    )
    db.add(msg)
    db.flush()
    notify_admins(db, "New contact message", f"{msg.name}: {msg.subject or msg.message[:60]}", "contact")
    log_activity(db, None, "contact_message", "contact_message", msg.id, f"Contact message from {msg.name}")
    db.commit()
    send_contact_notification(msg.name, msg.email, msg.subject, msg.message)
    return {"message": "Thanks! We received your message and will get back to you soon."}
