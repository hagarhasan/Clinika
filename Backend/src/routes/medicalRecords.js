'use strict';
const express = require('express');
const { HttpError } = require('../errors');
const { query: dbq, one, tx, insert, update, Params } = require('../db');
const { ah, requireRoles, currentDoctor } = require('../middleware/auth');
const { parseBody } = require('../utils/validate');
const { query, pathInt } = require('../utils/params');
const { pick } = require('../utils/helpers');
const S = require('../schemas');
const repo = require('../repo');
const { doctorHasPatient, getDoctorProfile, getPatientProfile } = require('../services/access');
const { audit, notify } = require('../services/notifications');

const router = express.Router();
// الأدمن ممنوع من قراءة المحتوى الطبي (privacy) — فقط المريض صاحب السجل والأطباء المصرّح لهم
const viewer = requireRoles('patient', 'doctor');

const SELECT = `
  SELECT m.id, m.patient_id, m.doctor_id, m.appointment_id, m.symptoms, m.diagnosis, m.treatment_plan, m.notes,
         m.follow_up_date, m.created_at, m.updated_at, ${repo.PATIENT_BRIEF_COLS}, ${repo.DOCTOR_BRIEF_COLS}
  FROM medical_records m ${repo.briefJoins('m.patient_id', 'm.doctor_id')}`;
const out = (r) => ({
  id: r.id,
  patient: repo.patientBrief(r),
  doctor: repo.doctorBrief(r, null),
  appointment_id: r.appointment_id ?? null,
  symptoms: r.symptoms ?? null,
  diagnosis: r.diagnosis,
  treatment_plan: r.treatment_plan ?? null,
  notes: r.notes ?? null,
  follow_up_date: r.follow_up_date ?? null,
  created_at: r.created_at,
  updated_at: r.updated_at,
});
const load = async (id) => (await dbq(`${SELECT} WHERE m.id = $1`, [id]))[0] || null;

router.post('/', currentDoctor, ah(async (req, res) => {
  const p = parseBody(S.MedicalRecordCreate, req.body);
  const doctor = req.doctor;
  const patient = await repo.loadPatient(p.patient_id);
  if (!patient) throw new HttpError(404, 'Patient not found');
  if (!(await doctorHasPatient(doctor.id, patient.id))) throw new HttpError(403, 'You have no appointment with this patient');
  if (p.appointment_id) {
    const a = await one('SELECT doctor_id, patient_id FROM appointments WHERE id = $1', [p.appointment_id]);
    if (!a || a.doctor_id !== doctor.id || a.patient_id !== patient.id) {
      throw new HttpError(400, 'Appointment does not match this doctor and patient');
    }
  }
  const id = await tx(async (c) => {
    const rec = await insert('medical_records', {
      patient_id: patient.id, doctor_id: doctor.id, appointment_id: p.appointment_id ?? null,
      symptoms: p.symptoms ?? null, diagnosis: p.diagnosis, treatment_plan: p.treatment_plan ?? null,
      notes: p.notes ?? null, follow_up_date: p.follow_up_date ?? null, created_at: new Date(), updated_at: new Date(),
    }, c);
    await audit(c, req.user, 'create', 'medical_record', rec.id);
    await notify(c, patient.user_id, 'New medical record', `Dr. ${doctor.full_name} added a new medical record to your file.`, 'medical_record');
    return rec.id;
  });
  res.status(201).json(out(await load(id)));
}));

router.get('/', viewer, ah(async (req, res) => {
  const q = query(req);
  const patientId = q.int('patient_id');
  const limit = q.int('limit', { def: 20, ge: 1, le: 100 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();

  const p = new Params();
  let where;
  if (req.user.role === 'patient') {
    where = `m.patient_id = ${p.add((await getPatientProfile(req.user)).id)}`;
  } else {
    const doctor = await getDoctorProfile(req.user);
    if (patientId === null) throw new HttpError(400, 'patient_id is required for doctors');
    if (!(await doctorHasPatient(doctor.id, patientId))) throw new HttpError(403, "You are not authorized to view this patient's records");
    where = `m.patient_id = ${p.add(patientId)}`;
  }
  const rows = await dbq(`${SELECT} WHERE ${where} ORDER BY m.created_at DESC, m.id DESC LIMIT ${limit} OFFSET ${offset}`, p.list);
  await audit(undefined, req.user, 'list', 'medical_record', null);
  res.json(rows.map(out));
}));

router.get('/:record_id', viewer, ah(async (req, res) => {
  const rec = await load(pathInt(req, 'record_id'));
  if (!rec) throw new HttpError(404, 'Record not found');
  if (req.user.role === 'patient') {
    if (rec.p_user_id !== req.user.id) throw new HttpError(403, "You cannot access another patient's records");
  } else {
    const doctor = await getDoctorProfile(req.user);
    if (rec.doctor_id !== doctor.id && !(await doctorHasPatient(doctor.id, rec.patient_id))) {
      throw new HttpError(403, 'You are not authorized to view this record');
    }
  }
  await audit(undefined, req.user, 'view', 'medical_record', rec.id);
  res.json(out(rec));
}));

router.put('/:record_id', currentDoctor, ah(async (req, res) => {
  const id = pathInt(req, 'record_id');
  const p = parseBody(S.MedicalRecordUpdate, req.body);
  const rec = await load(id);
  if (!rec) throw new HttpError(404, 'Record not found');
  if (rec.doctor_id !== req.doctor.id) throw new HttpError(403, 'Only the doctor who created the record can edit it');
  const patch = pick(p, ['symptoms', 'diagnosis', 'treatment_plan', 'notes', 'follow_up_date']);
  if (patch.diagnosis === null) delete patch.diagnosis; // NOT NULL
  patch.updated_at = new Date();
  await tx(async (c) => {
    await update('medical_records', id, patch, c);
    await audit(c, req.user, 'update', 'medical_record', id);
  });
  res.json(out(await load(id)));
}));

module.exports = router;
