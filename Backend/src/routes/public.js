'use strict';
const express = require('express');
const { HttpError } = require('../errors');
const { query: dbq, one, scalar, tx, insert } = require('../db');
const { ah } = require('../middleware/auth');
const { parseBody } = require('../utils/validate');
const S = require('../schemas');
const { sendContactNotification } = require('../services/email');
const { logActivity, notifyAdmins } = require('../services/notifications');
const { nowLocal } = require('../utils/time');

const router = express.Router();

router.get('/public/stats', ah(async (_req, res) => {
  const today = nowLocal().date;
  const monthStart = `${today.slice(0, 8)}01`;
  const r = await one('SELECT AVG(rating) AS avg, COUNT(id) AS cnt FROM reviews');
  res.json({
    doctors: (await scalar('SELECT COUNT(id) FROM doctors WHERE is_active = true')) || 0,
    patients: (await scalar('SELECT COUNT(id) FROM patients')) || 0,
    specialties: (await scalar('SELECT COUNT(id) FROM specialties')) || 0,
    clinics: (await scalar('SELECT COUNT(id) FROM clinics WHERE is_active = true')) || 0,
    appointments_total: (await scalar(`SELECT COUNT(id) FROM appointments WHERE status <> 'cancelled'`)) || 0,
    appointments_this_month:
      (await scalar(`SELECT COUNT(id) FROM appointments WHERE appointment_date >= $1::date AND status <> 'cancelled'`, [monthStart])) || 0,
    average_rating: r && r.avg !== null ? Math.round(parseFloat(r.avg) * 100) / 100 : null,
    reviews_count: r ? parseInt(r.cnt, 10) : 0,
  });
}));

// قايمة المدن والمناطق (اللي فيها دكاترة فعلًا) لفلاتر البحث
router.get('/public/locations', ah(async (_req, res) => {
  const rows = await dbq(
    `SELECT c.city, c.district, COUNT(d.id) AS n
     FROM clinics c JOIN doctors d ON d.clinic_id = c.id
     WHERE d.is_active = true AND c.is_active = true AND c.city IS NOT NULL
     GROUP BY c.city, c.district ORDER BY c.city, c.district`
  );
  const cities = new Map();
  for (const r of rows) {
    if (!cities.has(r.city)) cities.set(r.city, { city: r.city, doctors: 0, districts: [] });
    const e = cities.get(r.city);
    e.doctors += r.n;
    if (r.district) e.districts.push({ district: r.district, doctors: r.n });
  }
  res.json({ cities: [...cities.values()] });
}));

// فورم Contact Us (من غير تسجيل دخول)
router.post('/contact', ah(async (req, res) => {
  const p = parseBody(S.ContactIn, req.body);
  const email = p.email.toLowerCase();
  const recent = await scalar('SELECT COUNT(id) FROM contact_messages WHERE email = $1 AND created_at > $2', [email, new Date(Date.now() - 3600000)]);
  if ((recent || 0) >= 5) throw new HttpError(429, 'Too many messages. Please try again later.');

  const msg = await tx(async (c) => {
    const m = await insert('contact_messages', {
      name: p.name.trim(), email, subject: p.subject ? p.subject.trim() : null, message: p.message.trim(),
      status: 'new', created_at: new Date(),
    }, c);
    await notifyAdmins(c, 'New contact message', `${m.name}: ${m.subject || m.message.slice(0, 60)}`, 'contact');
    await logActivity(c, null, 'contact_message', 'contact_message', m.id, `Contact message from ${m.name}`);
    return m;
  });
  await sendContactNotification(msg.name, msg.email, msg.subject, msg.message);
  res.status(201).json({ message: 'Thanks! We received your message and will get back to you soon.' });
}));

module.exports = router;
