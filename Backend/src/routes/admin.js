'use strict';
const crypto = require('crypto');
const express = require('express');
const { HttpError } = require('../errors');
const { query: dbq, one, scalar, tx, exec, insert, update, Params, isUniqueViolation } = require('../db');
const { ah, requireRoles } = require('../middleware/auth');
const { parseBody, parseNamed } = require('../utils/validate');
const { query, pathInt } = require('../utils/params');
const S = require('../schemas');
const repo = require('../repo');
const { insertUser } = require('../services/users');
const { createBooking } = require('../services/booking');
const { sendDoctorDecisionEmail, sendPasswordResetEmail } = require('../services/email');
const { logActivity, notify } = require('../services/notifications');
const { issueResetToken } = require('../services/passwords');
const { nowLocal, addDays, diffDays } = require('../utils/time');

const router = express.Router();
router.use(requireRoles('admin'));

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
const DOCTOR_STATUSES = ['pending', 'active', 'inactive', 'rejected'];
const zero = (keys) => Object.fromEntries(keys.map((k) => [k, 0]));

router.get('/stats', ah(async (_req, res) => {
  const today = nowLocal().date;
  const monthStart = `${today.slice(0, 8)}01`;
  const n = async (sql, params = []) => (await scalar(sql, params)) || 0;

  const byStatus = zero(STATUSES);
  for (const r of await dbq('SELECT status, COUNT(id) AS c FROM appointments GROUP BY status')) byStatus[r.status] = r.c;
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

  const top = await dbq(
    `SELECT s.name, COUNT(a.id) AS c FROM specialties s
     JOIN doctors d ON d.specialty_id = s.id JOIN appointments a ON a.doctor_id = d.id
     WHERE a.status <> 'cancelled' GROUP BY s.name ORDER BY COUNT(a.id) DESC LIMIT 5`
  );
  const doctorsByStatus = zero(DOCTOR_STATUSES);
  for (const r of await dbq('SELECT status, COUNT(id) AS c FROM doctors GROUP BY status')) doctorsByStatus[r.status] = r.c;

  res.json({
    users: {
      total: await n('SELECT COUNT(id) FROM users'),
      patients: await n('SELECT COUNT(id) FROM patients'),
      doctors: await n('SELECT COUNT(id) FROM doctors WHERE is_active = true'),
    },
    doctors_by_status: doctorsByStatus,
    pending_doctor_requests: doctorsByStatus.pending,
    new_contact_messages: await n(`SELECT COUNT(id) FROM contact_messages WHERE status = 'new'`),
    appointments: {
      total,
      by_status: byStatus,
      today: await n('SELECT COUNT(id) FROM appointments WHERE appointment_date = $1::date', [today]),
      this_month: await n('SELECT COUNT(id) FROM appointments WHERE appointment_date >= $1::date', [monthStart]),
      cancellation_rate: total ? Math.round((byStatus.cancelled / total) * 1000) / 10 : 0.0,
    },
    top_specialties: top.map((r) => ({ name: r.name, appointments: r.c })),
  });
}));

router.get('/reports/appointments', ah(async (req, res) => {
  const q = query(req);
  let dateFrom = q.date('date_from');
  let dateTo = q.date('date_to');
  q.done();
  dateTo = dateTo || nowLocal().date;
  dateFrom = dateFrom || addDays(dateTo, -29);
  if (dateFrom > dateTo) throw new HttpError(400, 'date_from must be before date_to');
  if (diffDays(dateTo, dateFrom) > 366) throw new HttpError(400, 'Maximum report range is one year');

  const dailyRows = await dbq(
    `SELECT appointment_date, status, COUNT(id) AS c FROM appointments
     WHERE appointment_date BETWEEN $1::date AND $2::date
     GROUP BY appointment_date, status ORDER BY appointment_date`,
    [dateFrom, dateTo]
  );
  const daily = {};
  for (const r of dailyRows) (daily[r.appointment_date] ||= zero(STATUSES))[r.status] = r.c;

  const docRows = await dbq(
    `SELECT d.id AS did, u.full_name AS name, a.status, COUNT(a.id) AS c
     FROM appointments a JOIN doctors d ON d.id = a.doctor_id JOIN users u ON u.id = d.user_id
     WHERE a.appointment_date BETWEEN $1::date AND $2::date
     GROUP BY d.id, u.full_name, a.status`,
    [dateFrom, dateTo]
  );
  const perDoctor = {};
  for (const r of docRows) {
    const e = (perDoctor[r.did] ||= { doctor_id: r.did, doctor: r.name, total: 0 });
    e[r.status] = r.c;
    e.total += r.c;
  }
  res.json({
    date_from: dateFrom,
    date_to: dateTo,
    daily: Object.keys(daily).sort().map((d) => ({ date: d, ...daily[d], total: Object.values(daily[d]).reduce((a, b) => a + b, 0) })),
    per_doctor: Object.values(perDoctor).sort((a, b) => b.total - a.total),
  });
}));

router.get('/users', ah(async (req, res) => {
  const q = query(req);
  const role = q.enum('role', ['patient', 'doctor', 'admin']);
  const search = q.str('q');
  const isActive = q.bool('is_active');
  const limit = q.int('limit', { def: 20, ge: 1, le: 100 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();
  const p = new Params();
  const where = [];
  if (role) where.push(`role = ${p.add(role)}`);
  if (isActive !== null) where.push(`is_active = ${p.add(isActive)}`);
  if (search) {
    const t = p.add(`%${search}%`);
    where.push(`(full_name ILIKE ${t} OR email ILIKE ${t})`);
  }
  const rows = await dbq(`SELECT * FROM users ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`, p.list);
  res.json(rows.map(repo.userOut));
}));

router.post('/users', ah(async (req, res) => {
  const p = parseNamed(S.AdminUserCreate, req.body, true);
  try {
    const user = await insertUser(undefined, { email: p.email.toLowerCase(), password: p.password, first_name: p.first_name, last_name: p.last_name, phone: p.phone, role: 'admin' });
    res.status(201).json(repo.userOut(user));
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'Email is already registered');
    throw e;
  }
}));

router.patch('/users/:user_id/status', ah(async (req, res) => {
  const id = pathInt(req, 'user_id');
  const p = parseBody(S.AdminUserStatusIn, req.body);
  const user = await one('SELECT * FROM users WHERE id = $1', [id]);
  if (!user) throw new HttpError(404, 'User not found');
  if (user.id === req.user.id && !p.is_active) throw new HttpError(400, 'You cannot deactivate your own account');
  const updated = await tx(async (c) => {
    const u = await update('users', id, { is_active: p.is_active }, c);
    const doctor = await one('SELECT id, status FROM doctors WHERE user_id = $1', [id], c);
    // تفعيل الحساب مش بيعدّي طلب انضمام؛ الموافقة بتتم من /admin/doctors/{id}/review
    if (doctor && !(p.is_active && ['pending', 'rejected'].includes(doctor.status))) {
      await update('doctors', doctor.id, repo.doctorStatusPatch(p.is_active ? 'active' : 'inactive'), c);
    }
    await logActivity(c, req.user.id, 'user_status_changed', 'user', id, `${u.full_name} ${p.is_active ? 'activated' : 'deactivated'}`);
    return u;
  });
  res.json(repo.userOut(updated));
}));

router.get('/audit-logs', ah(async (req, res) => {
  const q = query(req);
  const entityType = q.str('entity_type');
  const userId = q.int('user_id');
  const limit = q.int('limit', { def: 50, ge: 1, le: 200 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();
  const p = new Params();
  const where = [];
  if (entityType) where.push(`entity_type = ${p.add(entityType)}`);
  if (userId) where.push(`user_id = ${p.add(userId)}`);
  const rows = await dbq(
    `SELECT id, user_id, action, entity_type, entity_id, created_at FROM audit_logs ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`,
    p.list
  );
  res.json(rows);
}));



const csvEscape = (v) => {
  const t = v === null || v === undefined ? '' : String(v);
  return ['=', '+', '-', '@'].includes(t[0]) ? `'${t}` : t;
};
const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function doctorFilters(q, p) {
  const status = q.enum('status', DOCTOR_STATUSES);
  const search = q.str('q');
  const specialtyId = q.int('specialty_id');
  const where = [];
  if (status) where.push(`d.status = ${p.add(status)}`);
  if (specialtyId) where.push(`d.specialty_id = ${p.add(specialtyId)}`);
  if (search) {
    const t = p.add(`%${search}%`);
    where.push(`(u.full_name ILIKE ${t} OR u.email ILIKE ${t})`);
  }
  return where;
}


router.get('/doctors', ah(async (req, res) => {
  const q = query(req);
  const p = new Params();
  const where = doctorFilters(q, p);
  const limit = q.int('limit', { def: 20, ge: 1, le: 100 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = await scalar(`SELECT COUNT(*) FROM doctors d JOIN users u ON u.id = d.user_id ${whereSql}`, p.list);
  res.set('X-Total-Count', String(total || 0));
  const doctors = await repo.runDoctorQuery(`${repo.DOCTOR_SELECT} ${repo.DOCTOR_FROM} ${whereSql} ORDER BY u.created_at DESC, d.id DESC LIMIT ${limit} OFFSET ${offset}`, p.list);
  const ratings = await repo.ratingsFor(doctors.map((d) => d.id));
  res.json(doctors.map((d) => repo.doctorOut(d, ratings)));
}));

router.get('/doctors/counts', ah(async (_req, res) => {
  const counts = zero(DOCTOR_STATUSES);
  for (const r of await dbq('SELECT status, COUNT(id) AS c FROM doctors GROUP BY status')) counts[r.status] = r.c;
  counts.all = Object.values(counts).reduce((a, b) => a + b, 0);
  counts.verified = (await scalar(`SELECT COUNT(id) FROM doctors WHERE is_verified = true AND status = 'active'`)) || 0;
  res.json(counts);
}));

router.get('/doctors/export', ah(async (req, res) => {
  const q = query(req);
  const status = q.enum('status', DOCTOR_STATUSES);
  q.done();
  const p = new Params();
  const doctors = await repo.runDoctorQuery(
    `${repo.DOCTOR_SELECT} ${repo.DOCTOR_FROM} ${status ? `WHERE d.status = ${p.add(status)}` : ''} ORDER BY u.full_name, d.id`,
    p.list
  );
  const ratings = await repo.ratingsFor(doctors.map((d) => d.id));
  const lines = [['ID', 'Name', 'Email', 'Phone', 'Specialty', 'Clinic', 'City', 'Status', 'License', 'Years of experience', 'Fee (EGP)', 'Rating', 'Reviews', 'Verified', 'Joined']];
  for (const d of doctors) {
    const [avg, count] = ratings[d.id] || [null, 0];
    lines.push([
      d.id, csvEscape(d.full_name), csvEscape(d.email), csvEscape(d.phone), csvEscape(d.specialty && d.specialty.name),
      csvEscape(d.clinic && d.clinic.name), csvEscape(d.clinic && d.clinic.city), d.status, csvEscape(d.license_number),
      d.years_of_experience, d.consultation_fee.toFixed(2), avg !== null ? avg : '', count, d.is_verified ? 'yes' : 'no',
      new Date(d.user_created_at).toISOString().slice(0, 10),
    ]);
  }
  const csv = lines.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="clinika-doctors-${nowLocal().date}.csv"`);
  res.send('\ufeff' + csv);
}));

router.get('/doctors/:doctor_id', ah(async (req, res) => {
  const d = await repo.loadDoctor(pathInt(req, 'doctor_id'));
  if (!d) throw new HttpError(404, 'Doctor not found');
  res.json(repo.doctorOut(d, await repo.ratingsFor([d.id])));
}));

router.patch('/doctors/:doctor_id/review', ah(async (req, res) => {
  const id = pathInt(req, 'doctor_id');
  const p = parseBody(S.DoctorReviewIn, req.body);
  const doctor = await repo.loadDoctor(id);
  if (!doctor) throw new HttpError(404, 'Doctor not found');
  if (!['pending', 'rejected'].includes(doctor.status)) throw new HttpError(400, `This doctor is already ${doctor.status}`);

  const approved = p.action === 'approve';
  await tx(async (c) => {
    await update('doctors', id, repo.doctorStatusPatch(approved ? 'active' : 'rejected', p.reason), c);
    if (approved) await update('users', doctor.user_id, { is_active: true }, c);
    await notify(
      c, doctor.user_id,
      approved ? 'Application approved' : 'Application not approved',
      approved ? 'You can now sign in and set your availability.' : p.reason || 'Your application was not approved.',
      'doctor_request'
    );
    await logActivity(c, req.user.id, approved ? 'doctor_approved' : 'doctor_rejected', 'doctor', id, `Dr. ${doctor.full_name} ${approved ? 'approved' : 'rejected'}`);
  });
  await sendDoctorDecisionEmail(doctor.email, doctor.full_name, approved, p.reason);
  res.json(repo.doctorOut(await repo.loadDoctor(id), await repo.ratingsFor([id])));
}));

router.patch('/doctors/:doctor_id/verify', ah(async (req, res) => {
  const id = pathInt(req, 'doctor_id');
  const p = parseBody(S.DoctorVerifyIn, req.body);
  const doctor = await repo.loadDoctor(id);
  if (!doctor) throw new HttpError(404, 'Doctor not found');
  await tx(async (c) => {
    await update('doctors', id, { is_verified: p.is_verified }, c);
    await logActivity(c, req.user.id, p.is_verified ? 'doctor_verified' : 'doctor_unverified', 'doctor', id, `Dr. ${doctor.full_name} ${p.is_verified ? 'verified' : 'unverified'}`);
  });
  res.json(repo.doctorOut(await repo.loadDoctor(id), await repo.ratingsFor([id])));
}));

// ======================= Patients directory =======================
const PATIENT_ADMIN_COLS = `p.id, p.user_id, p.date_of_birth, p.gender, p.blood_type, p.address, p.emergency_contact_name,
  p.emergency_contact_phone, p.allergies, p.chronic_conditions,
  u.first_name, u.last_name, u.full_name, u.phone, u.avatar_url, u.email, u.is_active, u.created_at`;

router.get('/patients/counts', ah(async (_req, res) => {
  const rows = await dbq('SELECT u.is_active, COUNT(p.id) AS c FROM patients p JOIN users u ON u.id = p.user_id GROUP BY u.is_active');
  const counts = { all: 0, active: 0, inactive: 0 };
  for (const r of rows) {
    counts[r.is_active ? 'active' : 'inactive'] = r.c;
    counts.all += r.c;
  }
  res.json(counts);
}));

router.get('/patients', ah(async (req, res) => {
  const q = query(req);
  const search = q.str('q');
  const isActive = q.bool('is_active');
  const limit = q.int('limit', { def: 20, ge: 1, le: 100 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();
  const p = new Params();
  const where = [];
  if (isActive !== null) where.push(`u.is_active = ${p.add(isActive)}`);
  if (search) {
    const t = p.add(`%${search}%`);
    where.push(`(u.full_name ILIKE ${t} OR u.email ILIKE ${t} OR u.phone ILIKE ${t})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = await scalar(`SELECT COUNT(*) FROM patients p JOIN users u ON u.id = p.user_id ${whereSql}`, p.list);
  res.set('X-Total-Count', String(total || 0));
  const rows = await dbq(
    `SELECT ${PATIENT_ADMIN_COLS} FROM patients p JOIN users u ON u.id = p.user_id ${whereSql}
     ORDER BY u.created_at DESC, p.id DESC LIMIT ${limit} OFFSET ${offset}`,
    p.list
  );
  res.json(rows.map((r) => ({ ...repo.patientOut(r), email: r.email, is_active: r.is_active, created_at: r.created_at })));
}));

// ======================= Add patient / book on behalf =======================
router.post('/patients', ah(async (req, res) => {
  const p = parseNamed(S.AdminPatientCreate, req.body, true);
  const email = p.email.toLowerCase();
  if (await scalar('SELECT id FROM users WHERE email = $1', [email])) throw new HttpError(409, 'Email is already registered');

  const invite = p.password === undefined || p.password === null;
  let created;
  try {
    created = await tx(async (c) => {
      const user = await insertUser(c, { email, password: invite ? crypto.randomBytes(24).toString('base64url') : p.password, first_name: p.first_name, last_name: p.last_name, phone: p.phone, role: 'patient' });
      const patient = await insert('patients', { user_id: user.id, date_of_birth: p.date_of_birth ?? null, gender: p.gender ?? null }, c);
      const raw = invite ? await issueResetToken(c, user, 60 * 24) : null;
      await logActivity(c, req.user.id, 'patient_created', 'patient', null, `Admin added patient ${user.full_name}`);
      return { user, patient, raw };
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'Email is already registered');
    throw e;
  }
  if (created.raw) await sendPasswordResetEmail(created.user.email, created.user.first_name, created.raw, 60 * 24, true);
  res.status(201).json(repo.patientOut(await repo.loadPatient(created.patient.id)));
}));

router.post('/appointments', ah(async (req, res) => {
  const p = parseBody(S.AdminAppointmentCreate, req.body);
  const patient = await repo.loadPatient(p.patient_id);
  if (!patient) throw new HttpError(404, 'Patient not found');
  const doctor = await repo.loadDoctor(p.doctor_id);
  if (!doctor || !doctor.is_active) throw new HttpError(404, 'Doctor not found');
  const id = await tx((c) =>
    createBooking(c, {
      patient, doctor, appointmentDate: p.appointment_date, startTime: p.start_time, reason: p.reason,
      consultationType: p.consultation_type, actor: req.user, status: p.status, clinicId: p.clinic_id ?? null,
    })
  );
  res.status(201).json(await repo.appointmentOut(await repo.loadAppointment(id)));
}));

router.get('/activity', ah(async (req, res) => {
  const q = query(req);
  const limit = q.int('limit', { def: 10, ge: 1, le: 100 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();
  const rows = await dbq(
    `SELECT l.id, l.actor_user_id, u.full_name AS actor_name, l.action, l.entity_type, l.entity_id, l.description, l.created_at
     FROM activity_logs l LEFT JOIN users u ON u.id = l.actor_user_id
     ORDER BY l.created_at DESC, l.id DESC LIMIT ${limit} OFFSET ${offset}`
  );
  res.json(rows.map((r) => ({ ...r, actor_name: r.actor_name ?? null })));
}));

const CONTACT_COLS = 'id, name, email, subject, message, status, created_at';

router.get('/contact-messages', ah(async (req, res) => {
  const q = query(req);
  const status = q.enum('status', ['new', 'read', 'resolved']);
  const limit = q.int('limit', { def: 20, ge: 1, le: 100 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();
  const p = new Params();
  const whereSql = status ? `WHERE status = ${p.add(status)}` : '';
  res.set('X-Total-Count', String((await scalar(`SELECT COUNT(*) FROM contact_messages ${whereSql}`, p.list)) || 0));
  res.json(await dbq(`SELECT ${CONTACT_COLS} FROM contact_messages ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`, p.list));
}));

router.patch('/contact-messages/:message_id', ah(async (req, res) => {
  const id = pathInt(req, 'message_id');
  const p = parseBody(S.ContactStatusIn, req.body);
  if (!(await scalar('SELECT id FROM contact_messages WHERE id = $1', [id]))) throw new HttpError(404, 'Message not found');
  await exec('UPDATE contact_messages SET status = $1 WHERE id = $2', [p.status, id]);
  res.json(await one(`SELECT ${CONTACT_COLS} FROM contact_messages WHERE id = $1`, [id]));
}));

module.exports = router;
