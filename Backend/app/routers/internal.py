from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import ACTIVE_STATUSES, Appointment
from ..services.notifications import notify
from ..services.slots import now_local

router = APIRouter(prefix="/internal", tags=["Internal"], include_in_schema=False)


@router.get("/send-reminders")
def send_reminders(authorization: str | None = Header(None), db: Session = Depends(get_db)):
    """Vercel Cron بينادي الـ endpoint ده يوميا ويبعت Authorization: Bearer <CRON_SECRET>."""
    if not settings.CRON_SECRET or authorization != f"Bearer {settings.CRON_SECRET}":
        raise HTTPException(status_code=403, detail="Forbidden")

    tomorrow = now_local().date() + timedelta(days=1)
    appointments = db.scalars(
        select(Appointment).where(
            Appointment.appointment_date == tomorrow,
            Appointment.status.in_(ACTIVE_STATUSES),
            Appointment.reminder_sent.is_(False),
        )
    ).unique().all()

    for appt in appointments:
        notify(
            db,
            appt.patient.user_id,
            "Appointment reminder",
            f"Reminder: you have an appointment with Dr. {appt.doctor.full_name} tomorrow at {appt.start_time.strftime('%H:%M')}.",
            "reminder",
        )
        appt.reminder_sent = True
    db.commit()
    return {"reminders_sent": len(appointments)}
