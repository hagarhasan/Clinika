'use strict';
const BASE = process.env.BASE_URL || 'http://localhost:8000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@clinika.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';

let passed = 0;
let failed = 0;
const failures = [];

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = text;
  }
  return { status: r.status, data, headers: r.headers };
}

function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name}${extra ? `  →  ${typeof extra === 'string' ? extra : JSON.stringify(extra).slice(0, 300)}` : ''}`);
  }
}

(async () => {
  console.log(`Smoke test against ${BASE}\n`);

  console.log('Public');
  let r = await call('GET', '/health');
  check('GET /health → 200', r.status === 200, r);
  r = await call('GET', '/specialties');
  check('GET /specialties → array', r.status === 200 && Array.isArray(r.data), r);
  r = await call('GET', '/clinics');
  check('GET /clinics → array', r.status === 200 && Array.isArray(r.data), r);
  r = await call('GET', '/doctors?limit=5&sort=next_available');
  check('GET /doctors → array + X-Total-Count', r.status === 200 && Array.isArray(r.data) && r.headers.get('x-total-count') !== null, r);
  const doctors = Array.isArray(r.data) ? r.data : [];
  r = await call('GET', '/doctors?q=a&sort=rating&min_rating=1&availability=this_week');
  check('GET /doctors with filters → 200', r.status === 200, r);
  r = await call('GET', '/public/stats');
  check('GET /public/stats', r.status === 200 && 'doctors' in r.data, r);
  r = await call('GET', '/public/locations');
  check('GET /public/locations', r.status === 200 && Array.isArray(r.data.cities), r);

  console.log('\nValidation / errors (نفس شكل FastAPI)');
  r = await call('POST', '/auth/register', { body: {} });
  check('POST /auth/register {} → 422 + detail[]', r.status === 422 && Array.isArray(r.data.detail), r);
  r = await call('GET', '/doctors/abc');
  check('GET /doctors/abc → 422', r.status === 422, r);
  r = await call('GET', '/appointments');
  check('GET /appointments without token → 401', r.status === 401, r);
  r = await call('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'wrongpass1' } });
  check('wrong login → 401 {detail}', r.status === 401 && typeof r.data.detail === 'string', r);
  r = await call('GET', '/nope');
  check('unknown route → 404', r.status === 404, r);

  console.log('\nAdmin');
  r = await call('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  check('admin login → token', r.status === 200 && !!r.data.access_token, r);
  const admin = r.data && r.data.access_token;
  if (admin) {
    for (const p of ['/auth/me', '/admin/stats', '/admin/doctors/counts', '/admin/doctors?limit=5', '/admin/activity', '/admin/users?limit=5', '/admin/contact-messages', '/admin/reports/appointments', '/admin/doctors/export']) {
      r = await call('GET', p, { token: admin });
      check(`GET ${p} → 200`, r.status === 200, r);
    }
  }

  console.log('\nPatient flow');
  const email = `smoke.${Date.now()}@example.com`;
  r = await call('POST', '/auth/register', { body: { full_name: 'Smoke Test', email, password: 'Smoke@12345', gender: 'female' } });
  check('register patient → 201 + token', r.status === 201 && !!r.data.access_token, r);
  const token = r.data && r.data.access_token;
  if (token) {
    r = await call('GET', '/patients/me', { token });
    check('GET /patients/me', r.status === 200 && r.data.full_name === 'Smoke Test', r);
    r = await call('GET', '/patients/me/stats', { token });
    check('GET /patients/me/stats', r.status === 200 && r.data.total === 0, r);
    r = await call('GET', '/notifications/unread-count', { token });
    check('GET /notifications/unread-count', r.status === 200 && 'unread' in r.data, r);

    const doc = doctors.find((d) => d.next_available);
    if (!doc) {
      console.log('  (skipped booking: no doctor with availability — run `npm run seed` or add schedules)');
    } else {
      const na = doc.next_available;
      r = await call('GET', `/doctors/${doc.id}/slots?date=${na.appointment_date}`);
      check('GET /doctors/{id}/slots', r.status === 200 && r.data.some((s) => s.is_available), r);
      r = await call('GET', `/doctors/${doc.id}/availability?days=7`);
      check('GET /doctors/{id}/availability', r.status === 200 && r.data.length === 7, r);
      r = await call('POST', '/appointments', { token, body: { doctor_id: doc.id, appointment_date: na.appointment_date, start_time: na.start_time, reason: 'smoke test' } });
      check('POST /appointments → 201 + reference', r.status === 201 && /^APT-\d{4}-\d{4}$/.test(r.data.reference_number || ''), r);
      const appt = r.data;
      if (r.status === 201) {
        r = await call('POST', '/appointments', { token, body: { doctor_id: doc.id, appointment_date: na.appointment_date, start_time: na.start_time } });
        check('double booking same slot → 409', r.status === 409, r);
        r = await call('GET', '/appointments', { token });
        check('GET /appointments lists it', r.status === 200 && r.data.some((a) => a.id === appt.id), r);
        r = await call('GET', `/appointments/${appt.id}`, { token });
        check('GET /appointments/{id}', r.status === 200 && r.data.doctor && r.data.patient, r);
        r = await call('PATCH', `/appointments/${appt.id}/cancel`, { token, body: { reason: 'smoke cleanup' } });
        check('PATCH cancel → cancelled (or 400 if < notice window)', r.status === 200 ? r.data.status === 'cancelled' : r.status === 400, r);
      }
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    console.log('Failed:\n - ' + failures.join('\n - '));
    process.exit(1);
  }
})().catch((e) => {
  console.error('Smoke test crashed (is the server running?):', e.message);
  process.exit(1);
});
