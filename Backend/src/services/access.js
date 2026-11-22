'use strict';
const { HttpError } = require('../errors');
const { scalar } = require('../db');
const { loadDoctorByUser, loadPatientByUser } = require('../repo');


async function doctorHasPatient(doctorId, patientId, c) {
  const found = await scalar(
    `SELECT id FROM appointments WHERE doctor_id = $1 AND patient_id = $2 AND status <> 'cancelled' LIMIT 1`,
    [doctorId, patientId],
    c
  );
  return found !== null;
}

async function getDoctorProfile(user, c) {
  const d = await loadDoctorByUser(user.id, c);
  if (!d) throw new HttpError(404, 'Doctor profile not found');
  return d;
}
async function getPatientProfile(user, c) {
  const p = await loadPatientByUser(user.id, c);
  if (!p) throw new HttpError(404, 'Patient profile not found');
  return p;
}
function ensureDoctorOwnerOrAdmin(user, doctor) {
  if (user.role === 'admin') return;
  if (user.role === 'doctor' && doctor.user_id === user.id) return;
  throw new HttpError(403, 'You do not have permission to modify this doctor');
}

module.exports = { doctorHasPatient, getDoctorProfile, getPatientProfile, ensureDoctorOwnerOrAdmin };
