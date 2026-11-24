'use strict';
const express = require('express');
const settings = require('../config');
const { HttpError } = require('../errors');
const { query: dbq, scalar, tx, update, isUniqueViolation, Params } = require('../db');
const { ah, auth, currentPatient } = require('../middleware/auth');
const { parseBody } = require('../utils/validate');
const { query, pathInt } = require('../utils/params');
const S = require('../schemas');
const repo = require('../repo');
const { getDoctorProfile, getPatientProfile } = require('../services/access');
const { createBooking } = require('../services/booking');
const { sendAppointmentEmail } = require('../services/email');
const { notify, logActivity } = require('../services/notifications');
const { findSlot } = require('../services/slots');
const { nowLocal, naiveMs, timeToSec, normMinute, hhmm } = require('../utils/time');

const router = express.Router();

// ---------- helpers ----------
async function getAppointment(id) {
  const a = await repo.loadAppointment(id);
  if (!a) throw new HttpError(404, 'Appointment not found');
  return a;
}
function ensureAccess(user, a) {
  if (user.role === 'admin') return;
  if (user.role === 'patient' && a.p_user_id === user.id) return;
  if (user.role === 'doctor' && a.d_user_id === user.id) return;
  throw new HttpError(403, 'You do not have access to this appointment');
}
const label = (a) => `${a.appointment_date} ${hhmm(a.start_time)}`;
const refOf = (a) => a.reference_number || `#${a.id}`;
const startMs = (a) => naiveMs(a.appointment_date, timeToSec(a.start_time));
const tooLate = (a) => nowLocal().ms > startMs(a) - settings.CANCEL_MIN_HOURS_BEFORE * 3600000;

// ---------- create ----------
router.post('/', currentPatient, ah(async (req, res) => {
  const p = parseBody(S.AppointmentCreate, req.body);
  const doctor = await repo.loadDoctor(p.doctor_id);
  if (!doctor || !doctor.is_active) throw new HttpError(404, 'Doctor not found');

  const id = await tx((c) =>
    createBooking(c, {
      patient: req.patient, doctor, appointmentDate: p.appointment_date, startTime: p.start_time,
      reason: p.reason, consultationType: p.consultation_type, actor: req.user, clinicId: p.clinic_id ?? null,
    })
  );
  const row = await repo.loadAppointment(id);

  const kind = row.consultation_type === 'online' ? 'Online' : 'In-person';
  const clinic = repo.pickClinic(row, 'ac_');
  const lines = [
    `Reference: ${row.reference_number}`,
    `Doctor: Dr. ${doctor.full_name}`,
    `When: ${label(row)} (${kind})`,
    ...(clinic ? [`Clinic: ${clinic.name}${clinic.address ? ` - ${clinic.address}` : ''}`] : []),
    `Fee: ${Number(row.fee_at_booking).toFixed(2)} EGP - pay at the clinic`,
  ];
  if (row.meeting_link) lines.push(`Meeting link: ${row.meeting_link}`);
  await sendAppointmentEmail(req.patient.email, req.patient.first_name, 'Your Clinika appointment', lines, {
    REFERENCE: row.reference_number,
    DOCTOR: `Dr. ${doctor.full_name}`,
    WHEN: `${label(row)} (${kind})`,
    CLINIC: clinic ? clinic.name : '',
    FEE: `${Number(row.fee_at_booking).toFixed(2)} EGP`,
    MEETING_LINK: row.meeting_link || '',
  });
  res.status(201).json(await repo.appointmentOut(row));
}));

// ---------- list / details ----------
// المريض يشوف حجوزاته، الدكتور يشوف حجوزاته، الأدمن يشوف الكل
router.get('/', auth, ah(async (req, res) => {
  const q = query(req);
  const statusFilter = q.str('status');
  const dateFrom = q.date('date_from');
  const dateTo = q.date('date_to');
  const doctorId = q.int('doctor_id');
  const patientId = q.int('patient_id');
  const upcoming = q.bool('upcoming');
  const consultationType = q.enum('consultation_type', ['in_person', 'online']);
  const search = q.str('q');
  const limit = q.int('limit', { def: 20, ge: 1, le: 100 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();

  const user = req.user;
  const p = new Params();
  const where = [];
  if (user.role === 'patient') {
    where.push(`a.patient_id = ${p.add((await getPatientProfile(user)).id)}`);
    if (doctorId) where.push(`a.doctor_id = ${p.add(doctorId)}`);
  } else if (user.role === 'doctor') {
    where.push(`a.doctor_id = ${p.add((await getDoctorProfile(user)).id)}`);
    if (patientId) where.push(`a.patient_id = ${p.add(patientId)}`);
  } else {
    if (doctorId) where.push(`a.doctor_id = ${p.add(doctorId)}`);
    if (patientId) where.push(`a.patient_id = ${p.add(patientId)}`);
  }

  if (statusFilter) {
    if (!['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(statusFilter)) throw new HttpError(400, 'Invalid status filter');
    where.push(`a.status = ${p.add(statusFilter)}`);
  }
  if (consultationType) where.push(`a.consultation_type = ${p.add(consultationType)}`);
  if (search) {
    const t = p.add(`%${search.trim().replace(/^#+/, '')}%`);
    where.push(`(a.reference_number ILIKE ${t}
      OR a.patient_id IN (SELECT p2.id FROM patients p2 JOIN users u2 ON u2.id = p2.user_id WHERE u2.full_name ILIKE ${t})
      OR a.doctor_id IN (SELECT d2.id FROM doctors d2 JOIN users u3 ON u3.id = d2.user_id WHERE u3.full_name ILIKE ${t}))`);
  }
  if (dateFrom) where.push(`a.appointment_date >= ${p.add(dateFrom)}::date`);
  if (dateTo) where.push(`a.appointment_date <= ${p.add(dateTo)}::date`);

  const today = nowLocal().date;
  let order = 'a.appointment_date DESC, a.start_time DESC';
  if (upcoming === true) {
    where.push(`a.appointment_date >= ${p.add(today)}::date`);
    order = 'a.appointment_date, a.start_time';
  } else if (upcoming === false) {
    where.push(`a.appointment_date < ${p.add(today)}::date`);
  }

  // العدد الكلي للـ pagination (الفرونت بيقراه من X-Total-Count)
  const total = await scalar(`SELECT COUNT(*) FROM appointments a ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`, p.list);
  res.set('X-Total-Count', String(total || 0));
  const rows = await repo.loadAppointments(where.join(' AND '), p.list, `ORDER BY ${order}, a.id DESC LIMIT ${limit} OFFSET ${offset}`);
  res.json(await repo.appointmentsOut(rows));
}));

// مواعيد اليوم (للدكتور: dashboard اليوم، للمريض: مواعيده اليوم)
router.get('/today', auth, ah(async (req, res) => {
  const p = new Params();
  const where = [`a.appointment_date = ${p.add(nowLocal().date)}::date`, `a.status IN ('pending','confirmed')`];
  if (req.user.role === 'patient') where.push(`a.patient_id = ${p.add((await getPatientProfile(req.user)).id)}`);
  else if (req.user.role === 'doctor') where.push(`a.doctor_id = ${p.add((await getDoctorProfile(req.user)).id)}`);
  const rows = await repo.loadAppointments(where.join(' AND '), p.list, 'ORDER BY a.start_time');
  res.json(await repo.appointmentsOut(rows));
}));

router.get('/:appointment_id', auth, ah(async (req, res) => {
  const a = await getAppointment(pathInt(req, 'appointment_id'));
  ensureAccess(req.user, a);
  res.json(await repo.appointmentOut(a));
}));

// ---------- meeting link (online visits) ----------
// الدكتور (أو الأدمن) يغيّر لينك المكالمة. الفيديو نفسه بره النظام، إحنا بنحفظ اللينك بس
router.patch('/:appointment_id/meeting-link', auth, ah(async (req, res) => {
  const id = pathInt(req, 'appointment_id');
  const p = parseBody(S.MeetingLinkIn, req.body);
  if (req.user.role === 'patient') throw new HttpError(403, 'Only doctors and admins can change the meeting link');
  const a = await getAppointment(id);
  ensureAccess(req.user, a);
  if (a.consultation_type !== 'online') throw new HttpError(400, 'This is not an online appointment');
  await tx(async (c) => {
    await update('appointments', id, { meeting_link: p.meeting_link ?? null, updated_at: new Date() }, c);
    if (p.meeting_link) {
      await notify(c, a.p_user_id, 'Meeting link updated', `The meeting link for your appointment on ${label(a)} was updated.`, 'appointment');
    }
  });
  res.json(await repo.appointmentOut(await repo.loadAppointment(id)));
}));

// ---------- cancel ----------
router.patch('/:appointment_id/cancel', auth, ah(async (req, res) => {
  const id = pathInt(req, 'appointment_id');
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? parseBody(S.CancelIn, req.body) : {};
  const a = await getAppointment(id);
  ensureAccess(req.user, a);
  const user = req.user;

  if (!['pending', 'confirmed'].includes(a.status)) throw new HttpError(400, `Cannot cancel an appointment that is ${a.status}`);
  if (user.role === 'patient' && tooLate(a)) {
    throw new HttpError(400, `Appointments can only be cancelled at least ${settings.CANCEL_MIN_HOURS_BEFORE} hours before the start time`);
  }
  await tx(async (c) => {
    await update('appointments', id, { status: 'cancelled', cancelled_by: user.role, cancellation_reason: body.reason ?? null, updated_at: new Date() }, c);
    if (user.role === 'patient') {
      await notify(c, a.d_user_id, 'Appointment cancelled', `${a.p_full_name} cancelled the appointment on ${label(a)}.`, 'appointment');
    } else {
      await notify(c, a.p_user_id, 'Appointment cancelled', `Your appointment with Dr. ${a.d_full_name} on ${label(a)} was cancelled.`, 'appointment');
    }
    await logActivity(c, user.id, 'appointment_cancelled', 'appointment', id, `${refOf(a)} cancelled by ${user.role}`);
  });
  res.json(await repo.appointmentOut(await repo.loadAppointment(id)));
}));

// ---------- reschedule ----------
router.patch('/:appointment_id/reschedule', auth, ah(async (req, res) => {
  const id = pathInt(req, 'appointment_id');
  const p = parseBody(S.RescheduleIn, req.body);
  const user = req.user;
  if (user.role === 'doctor') throw new HttpError(403, 'Doctors can cancel appointments, patients reschedule them');
  const a = await getAppointment(id);
  ensureAccess(user, a);

  if (!['pending', 'confirmed'].includes(a.status)) throw new HttpError(400, `Cannot reschedule an appointment that is ${a.status}`);
  const newStart = normMinute(p.start_time);
  if (a.appointment_date === p.appointment_date && normMinute(a.start_time) === newStart) {
    throw new HttpError(400, 'The new time is the same as the current one');
  }
  if (user.role === 'patient' && tooLate(a)) {
    throw new HttpError(400, `Appointments can only be rescheduled at least ${settings.CANCEL_MIN_HOURS_BEFORE} hours before the start time`);
  }

  const doctor = await repo.loadDoctor(a.doctor_id);
  // الافتراضي: نفس العيادة اللي المريض حجز فيها، إلا لو اختار عيادة تانية صراحةً
  const targetClinic = p.clinic_id || a.clinic_id || null;
  const oldLabel = label(a);

  try {
    await tx(async (c) => {
      const slot = await findSlot(doctor, p.appointment_date, newStart, targetClinic, c);
      const conflict = await scalar(
        `SELECT id FROM appointments WHERE patient_id = $1 AND appointment_date = $2::date AND start_time = $3::time
           AND status IN ('pending','confirmed') AND id <> $4 LIMIT 1`,
        [a.patient_id, p.appointment_date, newStart, id],
        c
      );
      if (conflict) throw new HttpError(409, 'You already have an appointment at this time');

      await update('appointments', id, {
        appointment_date: p.appointment_date, start_time: newStart, end_time: slot.end_time, clinic_id: slot.clinic_id,
        reminder_sent: false, status: settings.AUTO_CONFIRM_APPOINTMENTS ? 'confirmed' : 'pending', updated_at: new Date(),
      }, c);

      const newLabel = `${p.appointment_date} ${hhmm(newStart)}`;
      await notify(c, a.d_user_id, 'Appointment rescheduled', `${a.p_full_name} moved the appointment from ${oldLabel} to ${newLabel}.`, 'appointment');
      await notify(c, a.p_user_id, 'Appointment rescheduled', `Your appointment with Dr. ${a.d_full_name} is now on ${newLabel}.`, 'appointment');
      await logActivity(c, user.id, 'appointment_rescheduled', 'appointment', id, `${refOf(a)} moved to ${newLabel}`);
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'This time slot was just booked by someone else');
    throw e;
  }
  res.json(await repo.appointmentOut(await repo.loadAppointment(id)));
}));

// ---------- status (doctor/admin) ----------
const ALLOWED_TRANSITIONS = { pending: ['confirmed'], confirmed: ['completed', 'no_show'] };

router.patch('/:appointment_id/status', auth, ah(async (req, res) => {
  const id = pathInt(req, 'appointment_id');
  const p = parseBody(S.StatusUpdateIn, req.body);
  const user = req.user;
  if (user.role === 'patient') throw new HttpError(403, 'Only doctors and admins can change the appointment status');
  const a = await getAppointment(id);
  ensureAccess(user, a);

  if (!(ALLOWED_TRANSITIONS[a.status] || []).includes(p.status)) {
    throw new HttpError(400, `Cannot change status from ${a.status} to ${p.status}`);
  }
  if ((p.status === 'completed' || p.status === 'no_show') && startMs(a) > nowLocal().ms) {
    throw new HttpError(400, 'The appointment has not started yet');
  }
  const messages = {
    confirmed: ['Appointment confirmed', `Dr. ${a.d_full_name} confirmed your appointment on ${label(a)}.`],
    completed: ['Visit completed', `Your visit with Dr. ${a.d_full_name} is marked as completed. You can now rate the doctor.`],
    no_show: ['Missed appointment', `You missed your appointment with Dr. ${a.d_full_name} on ${label(a)}.`],
  };
  await tx(async (c) => {
    await update('appointments', id, { status: p.status, updated_at: new Date() }, c);
    const [title, message] = messages[p.status];
    await notify(c, a.p_user_id, title, message, 'appointment');
    await logActivity(c, user.id, `appointment_${p.status}`, 'appointment', id, `${refOf(a)} marked ${p.status}`);
  });
  res.json(await repo.appointmentOut(await repo.loadAppointment(id)));
}));

module.exports = router;
