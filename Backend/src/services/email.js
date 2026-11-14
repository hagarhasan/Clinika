'use strict';

const settings = require('../config');

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

async function sendEmail(to, subject, htmlBody, textBody) {
  if (!settings.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set; skipping email to ${to} (${subject})`);
    return false;
  }
  const payload = { from: settings.EMAIL_FROM, to: [to], subject, html: htmlBody };
  if (textBody) payload.text = textBody;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (r.status >= 300) {
      console.error(`Resend returned ${r.status}: ${(await r.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Resend request failed:', e.message);
    return false;
  }
}

function layout(title, body, buttonUrl, buttonLabel) {
  let button = '';
  if (buttonUrl && buttonLabel) {
    button =
      `<p style="margin:24px 0"><a href="${esc(buttonUrl)}" ` +
      'style="background:#1a5fff;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;' +
      `font-weight:600">${esc(buttonLabel)}</a></p>`;
  }
  return (
    '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">' +
    `<h2 style="color:#0b3fb3">Clinika</h2><h3>${esc(title)}</h3>${body}${button}` +
    '<p style="color:#6b7280;font-size:12px">If you did not expect this email you can ignore it.</p></div>'
  );
}

function sendPasswordResetEmail(to, name, rawToken, minutes, invite = false) {
  const link = `${settings.frontendBaseUrl}/reset-password?token=${rawToken}`;
  let title;
  let intro;
  if (invite) {
    title = 'Set your Clinika password';
    intro = 'An account was created for you on Clinika. Use the button below to choose your password.';
  } else {
    title = 'Reset your password';
    intro = 'We received a request to reset your Clinika password.';
  }
  const body = `<p>Hi ${esc(name)},</p><p>${intro}</p><p>This link is valid for ${minutes} minutes and can be used once.</p>`;
  return sendEmail(to, title, layout(title, body, link, 'Set password'), `${intro}\n${link}`);
}

function sendDoctorDecisionEmail(to, name, approved, reason) {
  if (approved) {
    const title = 'Your Clinika doctor account is approved';
    const body = `<p>Hi Dr. ${esc(name)},</p><p>Your application was approved. You can now sign in and set your availability.</p>`;
    return sendEmail(to, title, layout(title, body, `${settings.frontendBaseUrl}/login`, 'Sign in'));
  }
  const title = 'Update on your Clinika doctor application';
  const extra = reason ? `<p>Reason: ${esc(reason)}</p>` : '';
  const body = `<p>Hi ${esc(name)},</p><p>Unfortunately we could not approve your application.</p>${extra}`;
  return sendEmail(to, title, layout(title, body));
}

function sendAppointmentEmail(to, name, title, lines) {
  const items = lines.map((l) => `<li>${esc(l)}</li>`).join('');
  return sendEmail(to, title, layout(title, `<p>Hi ${esc(name)},</p><ul>${items}</ul>`));
}

function sendContactNotification(name, email, subject, message) {
  if (!settings.CONTACT_RECEIVER_EMAIL) return Promise.resolve(false);
  const body =
    `<p><b>From:</b> ${esc(name)} &lt;${esc(email)}&gt;</p>` +
    `<p><b>Subject:</b> ${esc(subject || '-')}</p><p>${esc(message)}</p>`;
  return sendEmail(settings.CONTACT_RECEIVER_EMAIL, 'New Clinika contact message', layout('New contact message', body));
}

module.exports = { sendEmail, sendPasswordResetEmail, sendDoctorDecisionEmail, sendAppointmentEmail, sendContactNotification };
