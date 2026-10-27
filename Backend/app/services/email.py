"""إرسال الإيميلات عن طريق Resend. لو RESEND_API_KEY مش متظبط بنتجاهل الإرسال بدون ما نكسر أي حاجة."""
import html
import logging

import httpx

from ..config import settings

log = logging.getLogger("clinika.email")


def send_email(to: str, subject: str, html_body: str, text_body: str | None = None) -> bool:
    if not settings.RESEND_API_KEY:
        log.warning("RESEND_API_KEY not set; skipping email to %s (%s)", to, subject)
        return False
    payload = {"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "html": html_body}
    if text_body:
        payload["text"] = text_body
    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json=payload,
            timeout=8.0,
        )
    except httpx.HTTPError:
        log.exception("Resend request failed")
        return False
    if r.status_code >= 300:
        log.error("Resend returned %s: %s", r.status_code, r.text[:300])
        return False
    return True


def _layout(title: str, body: str, button_url: str | None = None, button_label: str | None = None) -> str:
    button = ""
    if button_url and button_label:
        button = (
            f'<p style="margin:24px 0"><a href="{html.escape(button_url, quote=True)}" '
            'style="background:#1a5fff;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;'
            f'font-weight:600">{html.escape(button_label)}</a></p>'
        )
    return (
        '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">'
        f'<h2 style="color:#0b3fb3">Clinika</h2><h3>{html.escape(title)}</h3>{body}{button}'
        '<p style="color:#6b7280;font-size:12px">If you did not expect this email you can ignore it.</p></div>'
    )


def send_password_reset_email(to: str, name: str, raw_token: str, minutes: int, invite: bool = False) -> bool:
    link = f"{settings.frontend_base_url}/reset-password?token={raw_token}"
    if invite:
        title = "Set your Clinika password"
        intro = "An account was created for you on Clinika. Use the button below to choose your password."
    else:
        title = "Reset your password"
        intro = "We received a request to reset your Clinika password."
    body = (
        f"<p>Hi {html.escape(name)},</p><p>{intro}</p>"
        f"<p>This link is valid for {minutes} minutes and can be used once.</p>"
    )
    return send_email(to, title, _layout(title, body, link, "Set password"), f"{intro}\n{link}")


def send_doctor_decision_email(to: str, name: str, approved: bool, reason: str | None = None) -> bool:
    if approved:
        title = "Your Clinika doctor account is approved"
        body = f"<p>Hi Dr. {html.escape(name)},</p><p>Your application was approved. You can now sign in and set your availability.</p>"
        return send_email(to, title, _layout(title, body, f"{settings.frontend_base_url}/login", "Sign in"))
    title = "Update on your Clinika doctor application"
    extra = f"<p>Reason: {html.escape(reason)}</p>" if reason else ""
    body = f"<p>Hi {html.escape(name)},</p><p>Unfortunately we could not approve your application.</p>{extra}"
    return send_email(to, title, _layout(title, body))


def send_appointment_email(to: str, name: str, title: str, lines: list[str]) -> bool:
    items = "".join(f"<li>{html.escape(line)}</li>" for line in lines)
    body = f"<p>Hi {html.escape(name)},</p><ul>{items}</ul>"
    return send_email(to, title, _layout(title, body))


def send_contact_notification(name: str, email: str, subject: str | None, message: str) -> bool:
    if not settings.CONTACT_RECEIVER_EMAIL:
        return False
    body = (
        f"<p><b>From:</b> {html.escape(name)} &lt;{html.escape(email)}&gt;</p>"
        f"<p><b>Subject:</b> {html.escape(subject or '-')}</p><p>{html.escape(message)}</p>"
    )
    return send_email(settings.CONTACT_RECEIVER_EMAIL, "New Clinika contact message", _layout("New contact message", body))
