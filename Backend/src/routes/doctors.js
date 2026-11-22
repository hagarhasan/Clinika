'use strict';
const express = require('express');
const { z } = require('zod');
const settings = require('../config');
const { HttpError } = require('../errors');
const { query: dbq, one, scalar, tx, exec, insert, update, Params, isUniqueViolation, json } = require('../db');
const { ah, requireRoles, currentDoctor } = require('../middleware/auth');
const { parseBody, parseNamed } = require('../utils/validate');
const { query, pathInt } = require('../utils/params');
const { pick } = require('../utils/helpers');
const S = require('../schemas');
const repo = require('../repo');
const { ensureDoctorOwnerOrAdmin } = require('../services/access');
const { insertUser, insertDoctor } = require('../services/users');
const { logActivity } = require('../services/notifications');
const { availabilityMap, dayCapacity, generateSlots } = require('../services/slots');
const { validateImageUrl } = require('../services/storage');
const { nowLocal, addDays, weekday, timeToSec } = require('../utils/time');

const router = express.Router();
const notFound = () => new HttpError(404, 'Doctor not found');

async function getDoctorOr404(id) {
  const d = await repo.loadDoctor(id);
  if (!d) throw notFound();
  return d;
}

const worksAt = (condsSql) => `(
  d.id IN (
    SELECT ds.doctor_id FROM doctor_schedules ds
    JOIN doctors dd ON dd.id = ds.doctor_id
    JOIN clinics cl ON cl.id = COALESCE(ds.clinic_id, dd.clinic_id)
    WHERE ds.is_active = true AND cl.is_active = true AND ${condsSql}
  )
  OR (
    d.id NOT IN (SELECT doctor_id FROM doctor_schedules)
    AND d.clinic_id IN (SELECT cl.id FROM clinics cl WHERE cl.is_active = true AND ${condsSql})
  )
)`;

const cleanList = (arr) => arr.map((v) => String(v).trim()).filter(Boolean).slice(0, 20);

router.get('/', ah(async (req, res) => {
  const q = query(req);
  const search = q.str('q');
  const specialtyId = q.int('specialty_id');
  const specialtyIds = q.list('specialty_ids', 'int');
  const clinicId = q.int('clinic_id');
  const city = q.str('city');
  const cities = q.list('cities');
  const districts = q.list('districts');
  const gender = q.enum('gender', ['male', 'female']);
  const minRating = q.float('min_rating', { ge: 1, le: 5 });
  const minFee = q.float('min_fee', { ge: 0 });
  const maxFee = q.float('max_fee', { ge: 0 });
  const verified = q.bool('verified');
  const accepting = q.bool('accepting_new_patients');
  const online = q.bool('online');
  const availability = q.enum('availability', ['anytime', 'today', 'tomorrow', 'this_week']);
  const availableOn = q.date('date');
  const sort = q.enum('sort', ['name', 'fee', 'experience', 'rating', 'recommended', 'next_available'], { def: 'name' });
  const limit = q.int('limit', { def: 20, ge: 1, le: 100 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();

  const p = new Params();
  const where = ['d.is_active = true', 'u.is_active = true'];
  if (search) {
    const t = p.add(`%${search}%`);
    where.push(`(u.full_name ILIKE ${t} OR s.name ILIKE ${t} OR ${worksAt(`cl.name ILIKE ${t}`)})`);
  }
  const specIds = [...(specialtyId ? [specialtyId] : []), ...(specialtyIds || [])];
  if (specIds.length) where.push(`d.specialty_id = ANY(${p.add(specIds)}::int[])`);

  const clinicConds = (pp) => {
    const conds = [];
    if (clinicId) conds.push(`cl.id = ${pp.add(clinicId)}`);
    if (city) conds.push(`cl.city ILIKE ${pp.add(`%${city}%`)}`);
    if (cities) conds.push(`lower(cl.city) = ANY(${pp.add(cities.map((x) => x.trim().toLowerCase()))}::text[])`);
    if (districts) conds.push(`lower(cl.district) = ANY(${pp.add(districts.map((x) => x.trim().toLowerCase()))}::text[])`);
    return conds;
  };
  let allowedClinics = null;
  const conds = clinicConds(p);
  if (conds.length) {
    where.push(worksAt(conds.join(' AND ')));
    const p2 = new Params();
    const rows = await dbq(`SELECT cl.id FROM clinics cl WHERE cl.is_active = true AND ${clinicConds(p2).join(' AND ')}`, p2.list);
    allowedClinics = new Set(rows.map((r) => r.id));
  }
  if (gender) where.push(`d.gender = ${p.add(gender)}`);
  if (minFee !== null) where.push(`d.consultation_fee >= ${p.add(minFee)}`);
  if (maxFee !== null) where.push(`d.consultation_fee <= ${p.add(maxFee)}`);
  if (verified !== null) where.push(`d.is_verified = ${p.add(verified)}`);
  if (accepting !== null) where.push(`d.accepting_new_patients = ${p.add(accepting)}`);
  if (online !== null) where.push(`d.offers_online = ${p.add(online)}`);

  const today = nowLocal().date;
  let availRange = null;
  if (availableOn) availRange = [availableOn, availableOn];
  else if (availability === 'today') availRange = [today, today];
  else if (availability === 'tomorrow') availRange = [addDays(today, 1), addDays(today, 1)];
  else if (availability === 'this_week') availRange = [today, addDays(today, 6)];
  const needsPost = minRating !== null || availRange !== null || sort === 'next_available';

  let join = '';
  let order;
  if (sort === 'fee') order = 'd.consultation_fee ASC, u.full_name, d.id';
  else if (sort === 'experience') order = 'd.years_of_experience DESC, u.full_name, d.id';
  else if (sort === 'rating' || sort === 'recommended') {
    join = 'LEFT JOIN (SELECT doctor_id AS did, AVG(rating) AS avg_r FROM reviews GROUP BY doctor_id) avg_sq ON avg_sq.did = d.id';
    order = 'avg_sq.avg_r DESC NULLS LAST' + (sort === 'recommended' ? ', d.years_of_experience DESC, u.full_name, d.id' : ', d.id');
  } else order = 'u.full_name, d.id';

  let horizonEnd = addDays(today, settings.NEXT_AVAILABLE_HORIZON_DAYS);
  if (availRange && availRange[1] > horizonEnd) horizonEnd = availRange[1];

  const whereSql = where.join(' AND ');
  const baseSql = `${repo.DOCTOR_SELECT} ${repo.DOCTOR_FROM} ${join} WHERE ${whereSql} ORDER BY ${order}`;
  let doctors;
  let ratings;
  let slots;
  let total;
  if (needsPost) {
    doctors = await repo.runDoctorQuery(baseSql, p.list);
    ratings = await repo.ratingsFor(doctors.map((d) => d.id));
    if (minRating !== null) doctors = doctors.filter((d) => (ratings[d.id] ? ratings[d.id][0] : 0) >= minRating);
    slots = await availabilityMap(doctors, today, horizonEnd, allowedClinics);
    if (availRange) {
      const [lo, hi] = availRange;
      doctors = doctors.filter((d) => slots[d.id].some((s) => lo <= s[0] && s[0] <= hi));
    }
    if (sort === 'next_available') {
      const cmp = (a, b) => {
        const sa = slots[a.id][0];
        const sb = slots[b.id][0];
        if (!sa && !sb) return 0;
        if (!sa) return 1;
        if (!sb) return -1;
        if (sa[0] !== sb[0]) return sa[0] < sb[0] ? -1 : 1;
        if (sa[1] !== sb[1]) return sa[1] < sb[1] ? -1 : 1;
        return (sa[2] ?? -1) - (sb[2] ?? -1);
      };
      doctors.sort(cmp);
    }
    total = doctors.length;
    doctors = doctors.slice(offset, offset + limit);
  } else {
    total = await scalar(`SELECT COUNT(*) FROM doctors d JOIN users u ON u.id = d.user_id LEFT JOIN specialties s ON s.id = d.specialty_id WHERE ${whereSql}`, p.list);
    doctors = await repo.runDoctorQuery(`${baseSql} LIMIT ${limit} OFFSET ${offset}`, p.list);
    ratings = await repo.ratingsFor(doctors.map((d) => d.id));
    slots = await availabilityMap(doctors, today, horizonEnd, allowedClinics);
  }

  res.set('X-Total-Count', String(total));
  const clinics = await repo.clinicsFor(doctors);
  res.json(doctors.map((d) => repo.doctorOut(d, ratings, slots[d.id] && slots[d.id][0] ? slots[d.id][0] : null, clinics[d.id])));
}));

router.get('/me/profile', currentDoctor, ah(async (req, res) => {
  res.json(repo.doctorOut(req.doctor, await repo.ratingsFor([req.doctor.id])));
}));

router.get('/me/stats', currentDoctor, ah(async (req, res) => {
  const doctor = req.doctor;
  const today = nowLocal().date;
  const weekStart = addDays(today, -weekday(today));
  const monthAgo = addDays(today, -30);
  const c = async (sql, ...params) => (await scalar(`SELECT COUNT(id) FROM appointments WHERE doctor_id = $1 AND ${sql}`, [doctor.id, ...params])) || 0;
  const rating = (await repo.ratingsFor([doctor.id]))[doctor.id] || [null, 0];

  const completed30 = await c(`status = 'completed' AND appointment_date >= $2::date`, monthAgo);
  const noShow30 = await c(`status = 'no_show' AND appointment_date >= $2::date`, monthAgo);
  const attendedBase = completed30 + noShow30;
  const notCancelled30 = `status <> 'cancelled' AND appointment_date >= $3::date`;

  res.json({
    today_appointments: await c(`appointment_date = $2::date AND status IN ('pending','confirmed')`, today),
    upcoming_appointments: await c(`appointment_date >= $2::date AND status IN ('pending','confirmed')`, today),
    pending_confirmation: await c(`status = 'pending'`),
    completed_total: await c(`status = 'completed'`),
    completed_this_week: await c(`status = 'completed' AND appointment_date >= $2::date AND appointment_date <= $3::date`, weekStart, today),

    attendance_rate: attendedBase ? Math.round((completed30 / attendedBase) * 1000) / 10 : null,
    visit_types_30d: {
      online: await c(`consultation_type = $2 AND ${notCancelled30}`, 'online', monthAgo),
      in_person: await c(`consultation_type = $2 AND ${notCancelled30}`, 'in_person', monthAgo),
    },
    today_capacity: await dayCapacity(doctor, today),
    unique_patients: (await scalar(`SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE doctor_id = $1 AND status <> 'cancelled'`, [doctor.id])) || 0,
    rating_avg: rating[0],
    reviews_count: rating[1],
  });
}));

router.post('/', requireRoles('admin'), ah(async (req, res) => {
  const p = parseNamed(S.DoctorCreate, req.body, true);
  const email = p.email.toLowerCase();
  if (await scalar('SELECT id FROM users WHERE email = $1', [email])) throw new HttpError(409, 'Email is already registered');
  if (!(await scalar('SELECT id FROM specialties WHERE id = $1', [p.specialty_id]))) throw new HttpError(400, 'Specialty does not exist');
  if (p.clinic_id && !(await scalar('SELECT id FROM clinics WHERE id = $1', [p.clinic_id]))) throw new HttpError(400, 'Clinic does not exist');

  let doctorId;
  try {
    doctorId = await tx(async (c) => {
      const user = await insertUser(c, { email, password: p.password, first_name: p.first_name, last_name: p.last_name, phone: p.phone, role: 'doctor' });
      const d = await insertDoctor(c, { ...p, user_id: user.id, ...repo.doctorStatusPatch('active') });
      await logActivity(c, req.user.id, 'doctor_created', 'doctor', null, `Admin added Dr. ${user.full_name}`);
      return d.id;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'Email is already registered');
    throw e;
  }
  res.status(201).json(repo.doctorOut(await repo.loadDoctor(doctorId), {}));
}));

router.get('/:doctor_id', ah(async (req, res) => {
  const doctor = await getDoctorOr404(pathInt(req, 'doctor_id'));
  if (doctor.status === 'pending' || doctor.status === 'rejected') throw notFound();
  const today = nowLocal().date;
  const slots = await availabilityMap([doctor], today, addDays(today, settings.NEXT_AVAILABLE_HORIZON_DAYS));
  const clinics = await repo.clinicsFor([doctor]);
  res.json(repo.doctorOut(doctor, await repo.ratingsFor([doctor.id]), slots[doctor.id][0] || null, clinics[doctor.id]));
}));

const PROFILE_FIELDS = [
  'specialty_id', 'clinic_id', 'bio', 'years_of_experience', 'consultation_fee', 'license_number', 'slot_duration_minutes',
  'gender', 'title', 'room', 'languages', 'focus_areas', 'is_verified', 'accepting_new_patients', 'offers_online',
];
const NOT_NULL = ['years_of_experience', 'consultation_fee', 'slot_duration_minutes', 'is_verified', 'accepting_new_patients', 'offers_online'];

router.put('/:doctor_id', requireRoles('admin', 'doctor'), ah(async (req, res) => {
  const id = pathInt(req, 'doctor_id');
  const p = parseBody(S.DoctorUpdate, req.body);
  const doctor = await getDoctorOr404(id);
  ensureDoctorOwnerOrAdmin(req.user, doctor);
  const data = { ...p };
  if (req.user.role !== 'admin') {
    for (const k of ['specialty_id', 'clinic_id', 'is_active', 'license_number', 'is_verified']) delete data[k];
  }
  if (data.specialty_id && !(await scalar('SELECT id FROM specialties WHERE id = $1', [data.specialty_id]))) throw new HttpError(400, 'Specialty does not exist');
  if (data.clinic_id && !(await scalar('SELECT id FROM clinics WHERE id = $1', [data.clinic_id]))) throw new HttpError(400, 'Clinic does not exist');

  const patch = pick(data, PROFILE_FIELDS);
  for (const k of NOT_NULL) if (patch[k] === null) delete patch[k];
  for (const k of ['languages', 'focus_areas']) if (k in patch) patch[k] = json(patch[k] === null ? null : cleanList(patch[k]));
  if (data.is_active !== undefined && data.is_active !== null) Object.assign(patch, repo.doctorStatusPatch(data.is_active ? 'active' : 'inactive'));
  const avatar = data.photo_url !== undefined ? { avatar_url: validateImageUrl(data.photo_url) } : null;

  await tx(async (c) => {
    if (Object.keys(patch).length) await update('doctors', id, patch, c);
    if (avatar) await update('users', doctor.user_id, avatar, c);
  });
  const fresh = await repo.loadDoctor(id);
  res.json(repo.doctorOut(fresh, await repo.ratingsFor([id])));
}));

router.delete('/:doctor_id', requireRoles('admin'), ah(async (req, res) => {
  const doctor = await getDoctorOr404(pathInt(req, 'doctor_id'));
  await tx(async (c) => {
    await update('doctors', doctor.id, repo.doctorStatusPatch('inactive'), c);
    await update('users', doctor.user_id, { is_active: false }, c);
  });
  res.status(204).end();
}));

router.get('/:doctor_id/credentials', ah(async (req, res) => {
  res.json((await getDoctorOr404(pathInt(req, 'doctor_id'))).credentials);
}));

router.put('/:doctor_id/credentials', requireRoles('admin', 'doctor'), ah(async (req, res) => {
  const id = pathInt(req, 'doctor_id');
  const items = parseBody(z.array(S.CredentialIn), req.body);
  const doctor = await getDoctorOr404(id);
  ensureDoctorOwnerOrAdmin(req.user, doctor);
  if (items.length > 30) throw new HttpError(400, 'Too many credentials');
  await tx(async (c) => {
    await exec('DELETE FROM doctor_credentials WHERE doctor_id = $1', [id], c);
    for (const it of items) {
      await insert('doctor_credentials', { doctor_id: id, kind: it.kind, title: it.title, institution: it.institution ?? null, year: it.year ?? null }, c);
    }
  });
  res.json((await repo.loadDoctor(id)).credentials);
}));

router.get('/:doctor_id/slots', ah(async (req, res) => {
  const id = pathInt(req, 'doctor_id');
  const q = query(req);
  const day = q.date('date', { required: true });
  const clinicId = q.int('clinic_id');
  q.done();
  const doctor = await getDoctorOr404(id);
  res.json(await generateSlots(doctor, day, clinicId ? new Set([clinicId]) : null));
}));

router.get('/:doctor_id/availability', ah(async (req, res) => {
  const id = pathInt(req, 'doctor_id');
  const q = query(req);
  const days = q.int('days', { def: 14, ge: 1, le: 60 });
  const clinicId = q.int('clinic_id');
  q.done();
  const doctor = await getDoctorOr404(id);
  const start = nowLocal().date;
  const scheds = await dbq('SELECT day_of_week, clinic_id FROM doctor_schedules WHERE doctor_id = $1 AND is_active = true', [id]);
  const workingDays = new Set(scheds.filter((s) => !clinicId || (s.clinic_id || doctor.clinic_id) === clinicId).map((s) => s.day_of_week));
  const slots = (await availabilityMap([doctor], start, addDays(start, days - 1), clinicId ? new Set([clinicId]) : null))[doctor.id];
  const perDay = {};
  for (const s of slots) perDay[s[0]] = (perDay[s[0]] || 0) + 1;
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    out.push({ date: d, available_slots: perDay[d] || 0, is_working_day: workingDays.has(weekday(d)) });
  }
  res.json(out);
}));

const SCHEDULE_SQL = `SELECT ds.id, ds.day_of_week, ds.start_time, ds.end_time, ds.is_active, ds.clinic_id, c.name AS clinic_name
  FROM doctor_schedules ds LEFT JOIN clinics c ON c.id = ds.clinic_id
  WHERE ds.doctor_id = $1 ORDER BY ds.day_of_week, ds.start_time`;
const scheduleOut = (r) => ({
  id: r.id, day_of_week: r.day_of_week, start_time: r.start_time, end_time: r.end_time,
  is_active: r.is_active, clinic_id: r.clinic_id ?? null, clinic_name: r.clinic_name ?? null,
});

router.get('/:doctor_id/schedules', ah(async (req, res) => {
  const id = pathInt(req, 'doctor_id');
  await getDoctorOr404(id);
  res.json((await dbq(SCHEDULE_SQL, [id])).map(scheduleOut));
}));

router.put('/:doctor_id/schedules', requireRoles('admin', 'doctor'), ah(async (req, res) => {
  const id = pathInt(req, 'doctor_id');
  const items = parseBody(z.array(S.ScheduleItem), req.body);
  const doctor = await getDoctorOr404(id);
  ensureDoctorOwnerOrAdmin(req.user, doctor);

  for (const cid of new Set(items.filter((i) => i.clinic_id).map((i) => i.clinic_id))) {
    const clinic = await one('SELECT is_active FROM clinics WHERE id = $1', [cid]);
    if (!clinic || !clinic.is_active) throw new HttpError(400, `Clinic ${cid} does not exist or is inactive`);
  }
  const byDay = {};
  for (const it of items) (byDay[it.day_of_week] ||= []).push(it);
  for (const dayItems of Object.values(byDay)) {
    dayItems.sort((a, b) => timeToSec(a.start_time) - timeToSec(b.start_time));
    for (let i = 1; i < dayItems.length; i++) {
      if (timeToSec(dayItems[i].start_time) < timeToSec(dayItems[i - 1].end_time)) {
        throw new HttpError(400, 'Schedule periods in the same day overlap');
      }
    }
  }
  await tx(async (c) => {
    await exec('DELETE FROM doctor_schedules WHERE doctor_id = $1', [id], c);
    for (const it of items) {
      await insert('doctor_schedules', {
        doctor_id: id, day_of_week: it.day_of_week, start_time: it.start_time, end_time: it.end_time,
        is_active: it.is_active, clinic_id: it.clinic_id ?? null,
      }, c);
    }
  });
  res.json((await dbq(SCHEDULE_SQL, [id])).map(scheduleOut));
}));

const timeOffOut = (r) => ({ id: r.id, start_date: r.start_date, end_date: r.end_date, reason: r.reason ?? null });

router.get('/:doctor_id/time-off', ah(async (req, res) => {
  const id = pathInt(req, 'doctor_id');
  await getDoctorOr404(id);
  const rows = await dbq('SELECT id, start_date, end_date, reason FROM doctor_time_off WHERE doctor_id = $1 AND end_date >= $2::date ORDER BY start_date', [id, nowLocal().date]);
  res.json(rows.map(timeOffOut));
}));

router.post('/:doctor_id/time-off', requireRoles('admin', 'doctor'), ah(async (req, res) => {
  const id = pathInt(req, 'doctor_id');
  const p = parseBody(S.TimeOffIn, req.body);
  const doctor = await getDoctorOr404(id);
  ensureDoctorOwnerOrAdmin(req.user, doctor);
  const row = await insert('doctor_time_off', { doctor_id: id, start_date: p.start_date, end_date: p.end_date, reason: p.reason ?? null });
  res.status(201).json(timeOffOut(row));
}));

router.delete('/:doctor_id/time-off/:off_id', requireRoles('admin', 'doctor'), ah(async (req, res) => {
  const id = pathInt(req, 'doctor_id');
  const offId = pathInt(req, 'off_id');
  const doctor = await getDoctorOr404(id);
  ensureDoctorOwnerOrAdmin(req.user, doctor);
  const obj = await one('SELECT id, doctor_id FROM doctor_time_off WHERE id = $1', [offId]);
  if (!obj || obj.doctor_id !== id) throw new HttpError(404, 'Time off not found');
  await exec('DELETE FROM doctor_time_off WHERE id = $1', [offId]);
  res.status(204).end();
}));

router.get('/:doctor_id/reviews', ah(async (req, res) => {
  const id = pathInt(req, 'doctor_id');
  const q = query(req);
  const limit = q.int('limit', { def: 20, ge: 1, le: 100 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();
  await getDoctorOr404(id);
  const rows = await dbq(`${repo.REVIEW_SELECT} WHERE r.doctor_id = $1 ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`, [id]);
  res.json(rows.map(repo.reviewOut));
}));

module.exports = router;
