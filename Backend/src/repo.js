'use strict';

const { query, one } = require('./db');

const CLINIC_FIELDS = ['id', 'name', 'address', 'city', 'district', 'phone', 'email', 'description', 'latitude', 'longitude', 'photo_url', 'parking_info', 'is_active'];
const clinicCols = (alias, prefix) => CLINIC_FIELDS.map((f) => `${alias}.${f} AS ${prefix}${f}`).join(', ');
function pickClinic(row, prefix) {
  if (row[`${prefix}id`] === null || row[`${prefix}id`] === undefined) return null;
  const o = {};
  for (const f of CLINIC_FIELDS) o[f] = row[`${prefix}${f}`] === undefined ? null : row[`${prefix}${f}`];
  return o;
}
const clinicOut = (c) => {
  const o = {};
  for (const f of CLINIC_FIELDS) o[f] = c[f] === undefined ? null : c[f];
  return o;
};

const userOut = (u) => ({
  id: u.id,
  email: u.email,
  first_name: u.first_name,
  last_name: u.last_name,
  full_name: u.full_name,
  phone: u.phone ?? null,
  role: u.role,
  is_active: u.is_active,
  avatar_url: u.avatar_url ?? null,
  created_at: u.created_at,
});

const PATIENT_SELECT = `
  SELECT p.id, p.user_id, p.date_of_birth, p.gender, p.blood_type, p.address, p.emergency_contact_name,
         p.emergency_contact_phone, p.allergies, p.chronic_conditions,
         u.first_name, u.last_name, u.full_name, u.phone, u.avatar_url, u.email
  FROM patients p JOIN users u ON u.id = p.user_id`;

async function loadPatient(id, c) {
  return one(`${PATIENT_SELECT} WHERE p.id = $1`, [id], c);
}
async function loadPatientByUser(userId, c) {
  return one(`${PATIENT_SELECT} WHERE p.user_id = $1`, [userId], c);
}
const patientOut = (p) => ({
  id: p.id,
  user_id: p.user_id,
  first_name: p.first_name,
  last_name: p.last_name,
  full_name: p.full_name,
  phone: p.phone ?? null,
  avatar_url: p.avatar_url ?? null,
  date_of_birth: p.date_of_birth ?? null,
  gender: p.gender ?? null,
  blood_type: p.blood_type ?? null,
  address: p.address ?? null,
  emergency_contact_name: p.emergency_contact_name ?? null,
  emergency_contact_phone: p.emergency_contact_phone ?? null,
  allergies: p.allergies ?? null,
  chronic_conditions: p.chronic_conditions ?? null,
});

async function ratingsFor(doctorIds, c) {
  if (!doctorIds.length) return {};
  const rows = await query(
    'SELECT doctor_id, AVG(rating) AS avg, COUNT(id) AS cnt FROM reviews WHERE doctor_id = ANY($1::int[]) GROUP BY doctor_id',
    [doctorIds],
    c
  );
  const out = {};
  for (const r of rows) out[r.doctor_id] = [Math.round(parseFloat(r.avg) * 100) / 100, parseInt(r.cnt, 10)];
  return out;
}

const DOCTOR_SELECT = `
  SELECT d.id, d.user_id, d.specialty_id, d.clinic_id, d.bio, d.years_of_experience, d.consultation_fee,
         d.license_number, d.slot_duration_minutes, d.is_active, d.status, d.rejection_reason, d.reviewed_at,
         d.gender, d.title, d.room, d.languages, d.focus_areas, d.is_verified, d.accepting_new_patients, d.offers_online,
         u.first_name, u.last_name, u.full_name, u.email, u.phone, u.avatar_url AS photo_url,
         u.is_active AS user_is_active, u.created_at AS user_created_at,
         s.id AS s_id, s.name AS s_name, s.description AS s_description,
         ${clinicCols('c', 'c_')}`;
const DOCTOR_FROM = `
  FROM doctors d
  JOIN users u ON u.id = d.user_id
  LEFT JOIN specialties s ON s.id = d.specialty_id
  LEFT JOIN clinics c ON c.id = d.clinic_id`;

function mapDoctorRow(r) {
  return {
    id: r.id,
    user_id: r.user_id,
    specialty_id: r.specialty_id,
    clinic_id: r.clinic_id,
    bio: r.bio ?? null,
    years_of_experience: r.years_of_experience ?? 0,
    consultation_fee: Number(r.consultation_fee ?? 0),
    license_number: r.license_number ?? null,
    slot_duration_minutes: r.slot_duration_minutes ?? 30,
    is_active: r.is_active,
    status: r.status,
    rejection_reason: r.rejection_reason ?? null,
    gender: r.gender ?? null,
    title: r.title ?? null,
    room: r.room ?? null,
    languages: Array.isArray(r.languages) ? r.languages : [],
    focus_areas: Array.isArray(r.focus_areas) ? r.focus_areas : [],
    is_verified: r.is_verified,
    accepting_new_patients: r.accepting_new_patients,
    offers_online: r.offers_online,
    first_name: r.first_name,
    last_name: r.last_name,
    full_name: r.full_name,
    email: r.email,
    phone: r.phone ?? null,
    photo_url: r.photo_url ?? null,
    user_is_active: r.user_is_active,
    user_created_at: r.user_created_at,
    specialty: r.s_id ? { id: r.s_id, name: r.s_name, description: r.s_description ?? null } : null,
    clinic: pickClinic(r, 'c_'),
    credentials: [],
  };
}

async function attachCredentials(docs, c) {
  if (!docs.length) return docs;
  const rows = await query(
    'SELECT id, doctor_id, kind, title, institution, year FROM doctor_credentials WHERE doctor_id = ANY($1::int[]) ORDER BY id',
    [docs.map((d) => d.id)],
    c
  );
  const by = {};
  for (const r of rows) (by[r.doctor_id] ||= []).push({ id: r.id, kind: r.kind, title: r.title, institution: r.institution ?? null, year: r.year ?? null });
  for (const d of docs) d.credentials = by[d.id] || [];
  return docs;
}

async function runDoctorQuery(sql, params, c) {
  const docs = (await query(sql, params, c)).map(mapDoctorRow);
  return attachCredentials(docs, c);
}
async function loadDoctors(whereSql, params, tail = '', c) {
  return runDoctorQuery(`${DOCTOR_SELECT} ${DOCTOR_FROM} ${whereSql ? `WHERE ${whereSql}` : ''} ${tail}`, params, c);
}
async function loadDoctor(id, c) {
  return (await loadDoctors('d.id = $1', [id], '', c))[0] || null;
}
async function loadDoctorByUser(userId, c) {
  return (await loadDoctors('d.user_id = $1', [userId], '', c))[0] || null;
}

function doctorOut(d, ratings = {}, nextSlot = null, clinics = null) {
  const [avg, count] = ratings[d.id] || [null, 0];
  return {
    id: d.id,
    user_id: d.user_id,
    first_name: d.first_name,
    last_name: d.last_name,
    full_name: d.full_name,
    email: d.email,
    phone: d.phone,
    photo_url: d.photo_url,
    gender: d.gender,
    title: d.title,
    room: d.room,
    specialty: d.specialty,
    clinic: d.clinic,
    clinics: clinics !== null && clinics !== undefined ? clinics : d.clinic ? [d.clinic] : [],
    bio: d.bio,
    years_of_experience: d.years_of_experience,
    consultation_fee: d.consultation_fee,
    license_number: d.license_number,
    slot_duration_minutes: d.slot_duration_minutes,
    is_active: d.is_active,
    status: d.status || 'active',
    rejection_reason: d.rejection_reason,
    is_verified: d.is_verified,
    accepting_new_patients: d.accepting_new_patients,
    offers_online: d.offers_online,
    languages: d.languages || [],
    focus_areas: d.focus_areas || [],
    credentials: d.credentials || [],
    rating_avg: avg,
    reviews_count: count,
    next_available: nextSlot
      ? { appointment_date: nextSlot[0], start_time: nextSlot[1], clinic_id: nextSlot[2] === undefined ? null : nextSlot[2] }
      : null,
  };
}

async function clinicsFor(doctors, c) {
  const result = {};
  for (const d of doctors) result[d.id] = [];
  if (!doctors.length) return result;
  const byId = Object.fromEntries(doctors.map((d) => [d.id, d]));
  const seen = Object.fromEntries(doctors.map((d) => [d.id, new Set()]));
  const rows = await query(
    'SELECT DISTINCT doctor_id, clinic_id FROM doctor_schedules WHERE doctor_id = ANY($1::int[]) AND is_active = true',
    [doctors.map((d) => d.id)],
    c
  );
  const needed = new Set();
  for (const r of rows) {
    const eff = r.clinic_id || byId[r.doctor_id].clinic_id;
    if (eff) {
      seen[r.doctor_id].add(eff);
      needed.add(eff);
    }
  }
  for (const d of doctors) {
    if (!seen[d.id].size && d.clinic_id) {
      seen[d.id].add(d.clinic_id);
      needed.add(d.clinic_id);
    }
  }
  const clinics = {};
  if (needed.size) {
    const cr = await query(`SELECT ${CLINIC_FIELDS.join(', ')} FROM clinics WHERE id = ANY($1::int[]) AND is_active = true`, [[...needed]], c);
    for (const x of cr) clinics[x.id] = clinicOut(x);
  }
  for (const [did, ids] of Object.entries(seen)) {
    result[did] = [...ids].sort((a, b) => a - b).filter((i) => clinics[i]).map((i) => clinics[i]);
  }
  return result;
}

function doctorStatusPatch(status, reason) {
  const p = {
    status,
    is_active: status === 'active',
    rejection_reason: status === 'rejected' ? reason ?? null : null,
  };
  if (status === 'active' || status === 'rejected') p.reviewed_at = new Date();
  return p;
}

const PATIENT_BRIEF_COLS = `p.id AS p_id, p.user_id AS p_user_id, pu.full_name AS p_full_name, pu.first_name AS p_first_name,
  pu.phone AS p_phone, pu.avatar_url AS p_avatar_url, pu.email AS p_email`;
const DOCTOR_BRIEF_COLS = `d.id AS d_id, d.user_id AS d_user_id, du.full_name AS d_full_name, du.email AS d_email,
  du.avatar_url AS d_photo_url, d.title AS d_title, d.room AS d_room, d.consultation_fee AS d_fee, d.is_active AS d_is_active,
  s.name AS d_specialty_name, ${clinicCols('dc', 'dc_')}`;
const briefJoins = (patientRef, doctorRef) => `
  JOIN patients p ON p.id = ${patientRef}
  JOIN users pu ON pu.id = p.user_id
  JOIN doctors d ON d.id = ${doctorRef}
  JOIN users du ON du.id = d.user_id
  LEFT JOIN specialties s ON s.id = d.specialty_id
  LEFT JOIN clinics dc ON dc.id = d.clinic_id`;

const patientBrief = (r) => ({ id: r.p_id, full_name: r.p_full_name, phone: r.p_phone ?? null, avatar_url: r.p_avatar_url ?? null });
const doctorBrief = (r, rating) => ({
  id: r.d_id,
  full_name: r.d_full_name,
  specialty_name: r.d_specialty_name ?? null,
  clinic_name: r.dc_name ?? null,
  photo_url: r.d_photo_url ?? null,
  title: r.d_title ?? null,
  room: r.d_room ?? null,
  consultation_fee: Number(r.d_fee ?? 0),
  clinic: pickClinic(r, 'dc_'),
  rating_avg: rating ? rating[0] : null,
  reviews_count: rating ? rating[1] : 0,
});

const APPT_SELECT = `
  SELECT a.id, a.patient_id, a.doctor_id, a.appointment_date, a.start_time, a.end_time, a.status, a.reason,
         a.cancellation_reason, a.cancelled_by, a.reminder_sent, a.consultation_type, a.reference_number,
         a.fee_at_booking, a.meeting_link, a.clinic_id, a.created_at,
         ${PATIENT_BRIEF_COLS}, ${DOCTOR_BRIEF_COLS}, ${clinicCols('ac', 'ac_')}
  FROM appointments a
  ${briefJoins('a.patient_id', 'a.doctor_id')}
  LEFT JOIN clinics ac ON ac.id = a.clinic_id`;

async function loadAppointments(whereSql, params, tail = '', c) {
  return query(`${APPT_SELECT} ${whereSql ? `WHERE ${whereSql}` : ''} ${tail}`, params, c);
}
async function loadAppointment(id, c) {
  return (await loadAppointments('a.id = $1', [id], '', c))[0] || null;
}

async function appointmentsOut(rows, c) {
  if (!rows.length) return [];
  const ratings = await ratingsFor([...new Set(rows.map((r) => r.doctor_id))], c);
  const reviewedRows = await query('SELECT appointment_id FROM reviews WHERE appointment_id = ANY($1::int[])', [rows.map((r) => r.id)], c);
  const reviewed = new Set(reviewedRows.map((r) => r.appointment_id));
  return rows.map((r) => ({
    id: r.id,
    patient: patientBrief(r),
    doctor: doctorBrief(r, ratings[r.doctor_id]),
    appointment_date: r.appointment_date,
    start_time: r.start_time,
    end_time: r.end_time,
    status: r.status,
    reason: r.reason ?? null,
    cancellation_reason: r.cancellation_reason ?? null,
    cancelled_by: r.cancelled_by ?? null,
    clinic_id: r.clinic_id ?? null,
    clinic: pickClinic(r, 'ac_'),
    consultation_type: r.consultation_type || 'in_person',
    reference_number: r.reference_number ?? null,
    fee_at_booking: r.fee_at_booking === null || r.fee_at_booking === undefined ? null : Number(r.fee_at_booking),
    meeting_link: r.meeting_link ?? null,
    has_review: reviewed.has(r.id),
    created_at: r.created_at,
  }));
}
async function appointmentOut(row, c) {
  return (await appointmentsOut([row], c))[0];
}

const REVIEW_SELECT = `
  SELECT r.id, r.doctor_id, r.appointment_id, r.rating, r.comment, r.created_at,
         p.id AS p_id, pu.full_name AS p_full_name, pu.phone AS p_phone, pu.avatar_url AS p_avatar_url
  FROM reviews r
  JOIN patients p ON p.id = r.patient_id
  JOIN users pu ON pu.id = p.user_id`;
const reviewOut = (r) => ({
  id: r.id,
  patient: patientBrief(r),
  doctor_id: r.doctor_id,
  appointment_id: r.appointment_id,
  rating: r.rating,
  comment: r.comment ?? null,
  created_at: r.created_at,
});

module.exports = {
  REVIEW_SELECT, reviewOut,
  CLINIC_FIELDS, clinicCols, pickClinic, clinicOut, userOut,
  loadPatient, loadPatientByUser, patientOut, ratingsFor,
  DOCTOR_SELECT, DOCTOR_FROM, mapDoctorRow, attachCredentials, runDoctorQuery, loadDoctors, loadDoctor,
  loadDoctorByUser, doctorOut, clinicsFor, doctorStatusPatch,
  PATIENT_BRIEF_COLS, DOCTOR_BRIEF_COLS, briefJoins, patientBrief, doctorBrief,
  loadAppointments, loadAppointment, appointmentsOut, appointmentOut,
};
