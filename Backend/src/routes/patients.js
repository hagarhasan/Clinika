'use strict';
const express = require('express');
const { HttpError } = require('../errors');
const { query: dbq, scalar, update, exec, tx, Params } = require('../db');
const { ah, auth, currentPatient, requireRoles } = require('../middleware/auth');
const { parseNamed } = require('../utils/validate');
const { query, pathInt } = require('../utils/params');
const { pick } = require('../utils/helpers');
const S = require('../schemas');
const { loadPatient, patientOut, loadAppointments, appointmentOut } = require('../repo');
const { doctorHasPatient, getDoctorProfile } = require('../services/access');
const { nowLocal, naiveMs, timeToSec } = require('../utils/time');

const router = express.Router();
const PATIENT_FIELDS = ['date_of_birth', 'gender', 'blood_type', 'address', 'emergency_contact_name', 'emergency_contact_phone', 'allergies', 'chronic_conditions'];

router.get('/me', currentPatient, (req, res) => res.json(patientOut(req.patient)));

router.put('/me', currentPatient, ah(async (req, res) => {
  const p = parseNamed(S.PatientUpdate, req.body, false);
  const pat = req.patient;
  await tx(async (c) => {
    const userPatch = {};
    if (p.first_name) userPatch.first_name = p.first_name.trim();
    if (p.last_name) userPatch.last_name = p.last_name.trim();
    if (p.phone !== undefined) userPatch.phone = p.phone;
    userPatch.full_name = `${userPatch.first_name ?? pat.first_name} ${userPatch.last_name ?? pat.last_name}`.trim();
    await update('users', pat.user_id, userPatch, c);
    const patch = pick(p, PATIENT_FIELDS);
    if (Object.keys(patch).length) await update('patients', pat.id, patch, c);
  });
  res.json(patientOut(await loadPatient(pat.id)));
}));

router.get('/me/stats', currentPatient, ah(async (req, res) => {
  const now = nowLocal();
  const rows = await dbq('SELECT status, COUNT(id) AS c FROM appointments WHERE patient_id = $1 GROUP BY status', [req.patient.id]);
  const byStatus = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
  for (const r of rows) byStatus[r.status] = r.c;

  const cands = await loadAppointments(
    `a.patient_id = $1 AND a.status IN ('pending','confirmed') AND a.appointment_date >= $2::date`,
    [req.patient.id, now.date],
    'ORDER BY a.appointment_date, a.start_time'
  );
  const upcoming = cands.filter((a) => naiveMs(a.appointment_date, timeToSec(a.start_time)) >= now.ms);
  res.json({
    upcoming: upcoming.length,
    completed: byStatus.completed,
    cancelled: byStatus.cancelled,
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    next_appointment: upcoming.length ? await appointmentOut(upcoming[0]) : null,
  });
}));

router.get('/', requireRoles('admin', 'doctor'), ah(async (req, res) => {
  const q = query(req);
  const search = q.str('q');
  const limit = q.int('limit', { def: 20, ge: 1, le: 100 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();

  const p = new Params();
  const where = [];
  if (req.user.role === 'doctor') {
    const doctor = await getDoctorProfile(req.user);
    where.push(`p.id IN (SELECT patient_id FROM appointments WHERE doctor_id = ${p.add(doctor.id)} AND status <> 'cancelled')`);
  }
  if (search) {
    const t = p.add(`%${search}%`);
    where.push(`(u.full_name ILIKE ${t} OR u.phone ILIKE ${t})`);
  }
  const rows = await dbq(
    `SELECT p.id, p.user_id, p.date_of_birth, p.gender, p.blood_type, p.address, p.emergency_contact_name,
            p.emergency_contact_phone, p.allergies, p.chronic_conditions,
            u.first_name, u.last_name, u.full_name, u.phone, u.avatar_url
     FROM patients p JOIN users u ON u.id = p.user_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY u.full_name LIMIT ${limit} OFFSET ${offset}`,
    p.list
  );
  res.json(rows.map(patientOut));
}));

router.get('/:patient_id', auth, ah(async (req, res) => {
  const patient = await loadPatient(pathInt(req, 'patient_id'));
  if (!patient) throw new HttpError(404, 'Patient not found');
  const user = req.user;
  const denied = new HttpError(403, 'You do not have access to this patient');
  if (user.role === 'admin') return res.json(patientOut(patient));
  if (user.role === 'patient' && patient.user_id === user.id) return res.json(patientOut(patient));
  if (user.role === 'doctor') {
    const doctor = await getDoctorProfile(user);
    if (await doctorHasPatient(doctor.id, patient.id)) return res.json(patientOut(patient));
  }
  throw denied;
}));

module.exports = router;
