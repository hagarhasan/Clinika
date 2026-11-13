'use strict';
const express = require('express');
const { HttpError } = require('../errors');
const { query: dbq, one, tx, insert, Params } = require('../db');
const { ah, requireRoles, currentDoctor } = require('../middleware/auth');
const { parseBody } = require('../utils/validate');
const { query, pathInt } = require('../utils/params');
const S = require('../schemas');
const repo = require('../repo');
const { doctorHasPatient, getDoctorProfile, getPatientProfile } = require('../services/access');
const { audit, notify } = require('../services/notifications');

const router = express.Router();
const viewer = requireRoles('patient', 'doctor');

const SELECT = `
  SELECT rx.id, rx.patient_id, rx.doctor_id, rx.appointment_id, rx.medical_record_id, rx.notes, rx.created_at,
         ${repo.PATIENT_BRIEF_COLS}, ${repo.DOCTOR_BRIEF_COLS}
  FROM prescriptions rx ${repo.briefJoins('rx.patient_id', 'rx.doctor_id')}`;

async function withItems(rows) {
  if (!rows.length) return [];
  const items = await dbq(
    'SELECT id, prescription_id, medication_name, dosage, frequency, duration, instructions FROM prescription_items WHERE prescription_id = ANY($1::int[]) ORDER BY id',
    [rows.map((r) => r.id)]
  );
  const by = {};
  for (const i of items) {
    (by[i.prescription_id] ||= []).push({
      id: i.id, medication_name: i.medication_name, dosage: i.dosage ?? null, frequency: i.frequency ?? null,
      duration: i.duration ?? null, instructions: i.instructions ?? null,
    });
  }
  return rows.map((r) => ({
    id: r.id,
    patient: repo.patientBrief(r),
    doctor: repo.doctorBrief(r, null),
    appointment_id: r.appointment_id ?? null,
    medical_record_id: r.medical_record_id ?? null,
    notes: r.notes ?? null,
    items: by[r.id] || [],
    created_at: r.created_at,
  }));
}
const loadRow = async (id) => (await dbq(`${SELECT} WHERE rx.id = $1`, [id]))[0] || null;

router.post('/', currentDoctor, ah(async (req, res) => {
  const p = parseBody(S.PrescriptionCreate, req.body);
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
  if (p.medical_record_id) {
    const rec = await one('SELECT patient_id FROM medical_records WHERE id = $1', [p.medical_record_id]);
    if (!rec || rec.patient_id !== patient.id) throw new HttpError(400, 'Medical record does not match this patient');
  }
  const id = await tx(async (c) => {
    const rx = await insert('prescriptions', {
      patient_id: patient.id, doctor_id: doctor.id, appointment_id: p.appointment_id ?? null,
      medical_record_id: p.medical_record_id ?? null, notes: p.notes ?? null, created_at: new Date(),
    }, c);
    for (const it of p.items) {
      await insert('prescription_items', {
        prescription_id: rx.id, medication_name: it.medication_name, dosage: it.dosage ?? null,
        frequency: it.frequency ?? null, duration: it.duration ?? null, instructions: it.instructions ?? null,
      }, c);
    }
    await audit(c, req.user, 'create', 'prescription', rx.id);
    await notify(c, patient.user_id, 'New prescription', `Dr. ${doctor.full_name} issued a new prescription for you.`, 'prescription');
    return rx.id;
  });
  res.status(201).json((await withItems([await loadRow(id)]))[0]);
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
    where = `rx.patient_id = ${p.add((await getPatientProfile(req.user)).id)}`;
  } else {
    const doctor = await getDoctorProfile(req.user);
    if (patientId === null) throw new HttpError(400, 'patient_id is required for doctors');
    if (!(await doctorHasPatient(doctor.id, patientId))) throw new HttpError(403, "You are not authorized to view this patient's prescriptions");
    where = `rx.patient_id = ${p.add(patientId)}`;
  }
  const rows = await dbq(`${SELECT} WHERE ${where} ORDER BY rx.created_at DESC, rx.id DESC LIMIT ${limit} OFFSET ${offset}`, p.list);
  res.json(await withItems(rows));
}));

router.get('/:prescription_id', viewer, ah(async (req, res) => {
  const row = await loadRow(pathInt(req, 'prescription_id'));
  if (!row) throw new HttpError(404, 'Prescription not found');
  if (req.user.role === 'patient') {
    if (row.p_user_id !== req.user.id) throw new HttpError(403, "You cannot access another patient's prescription");
  } else {
    const doctor = await getDoctorProfile(req.user);
    if (row.doctor_id !== doctor.id && !(await doctorHasPatient(doctor.id, row.patient_id))) {
      throw new HttpError(403, 'You are not authorized to view this prescription');
    }
  }
  await audit(undefined, req.user, 'view', 'prescription', row.id);
  res.json((await withItems([row]))[0]);
}));

module.exports = router;
