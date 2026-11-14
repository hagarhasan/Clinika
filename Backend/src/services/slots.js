'use strict';
const settings = require('../config');
const { HttpError } = require('../errors');
const { query, scalar } = require('../db');
const { nowLocal, addDays, weekday, timeToSec, normMinute } = require('../utils/time');
const { expandDay } = require('../utils/slotMath');

const cutoffMs = () => nowLocal().ms + settings.MIN_BOOKING_NOTICE_MINUTES * 60000;

const effectiveClinicId = (schedule, doctor) => schedule.clinic_id || doctor.clinic_id || null;

async function onLeave(doctorId, day, c) {
  return (
    (await scalar(
      'SELECT COUNT(*) FROM doctor_time_off WHERE doctor_id = $1 AND start_date <= $2::date AND end_date >= $2::date',
      [doctorId, day],
      c
    )) > 0
  );
}

async function generateSlots(doctor, day, clinicIds = null, c) {
  if (!doctor.is_active) return [];
  const today = nowLocal().date;
  if (day < today || day > addDays(today, settings.MAX_ADVANCE_BOOKING_DAYS)) return [];
  if (await onLeave(doctor.id, day, c)) return [];

  const schedules = await query(
    `SELECT start_time, end_time, clinic_id FROM doctor_schedules
     WHERE doctor_id = $1 AND day_of_week = $2 AND is_active = true ORDER BY start_time`,
    [doctor.id, weekday(day)],
    c
  );
  if (!schedules.length) return [];

  const bookedRows = await query(
    `SELECT start_time FROM appointments WHERE doctor_id = $1 AND appointment_date = $2::date AND status <> 'cancelled'`,
    [doctor.id, day],
    c
  );
  const booked = new Set(bookedRows.map((r) => normMinute(r.start_time)));
  return expandDay({
    day,
    schedules,
    booked,
    stepSec: doctor.slot_duration_minutes * 60,
    doctorClinicId: doctor.clinic_id,
    clinicIds,
    cutoff: cutoffMs(),
  });
}

async function findSlot(doctor, day, start, clinicId = null, c) {
  const startN = normMinute(start);
  for (const slot of await generateSlots(doctor, day, null, c)) {
    if (slot.start_time === startN) {
      if (clinicId !== null && clinicId !== undefined && slot.clinic_id !== clinicId) {
        throw new HttpError(400, 'The doctor is not at this clinic at that time');
      }
      if (!slot.is_available) throw new HttpError(409, 'This time slot is already booked');
      return slot;
    }
  }
  throw new HttpError(400, 'This time is not available for this doctor');
}

async function availabilityMap(doctors, start, end, clinicIds = null, c) {
  const result = {};
  for (const d of doctors) result[d.id] = [];
  const active = doctors.filter((d) => d.is_active);
  if (!active.length) return result;
  const today = nowLocal().date;
  if (start < today) start = today;
  const maxEnd = addDays(today, settings.MAX_ADVANCE_BOOKING_DAYS);
  if (end > maxEnd) end = maxEnd;
  if (start > end) return result;

  const ids = active.map((d) => d.id);
  const cutoff = cutoffMs();

  const schedules = {};
  for (const s of await query(
    `SELECT doctor_id, day_of_week, start_time, end_time, clinic_id FROM doctor_schedules
     WHERE doctor_id = ANY($1::int[]) AND is_active = true ORDER BY start_time`,
    [ids],
    c
  )) {
    (schedules[`${s.doctor_id}:${s.day_of_week}`] ||= []).push(s);
  }

  const timeOff = {};
  for (const o of await query(
    `SELECT doctor_id, start_date, end_date FROM doctor_time_off
     WHERE doctor_id = ANY($1::int[]) AND start_date <= $3::date AND end_date >= $2::date`,
    [ids, start, end],
    c
  )) {
    (timeOff[o.doctor_id] ||= []).push([o.start_date, o.end_date]);
  }

  const booked = {};
  for (const b of await query(
    `SELECT doctor_id, appointment_date, start_time FROM appointments
     WHERE doctor_id = ANY($1::int[]) AND appointment_date BETWEEN $2::date AND $3::date AND status <> 'cancelled'`,
    [ids, start, end],
    c
  )) {
    (booked[`${b.doctor_id}:${b.appointment_date}`] ||= new Set()).add(normMinute(b.start_time));
  }

  for (let day = start; day <= end; day = addDays(day, 1)) {
    const wd = weekday(day);
    for (const doc of active) {
      if ((timeOff[doc.id] || []).some(([a, b]) => a <= day && day <= b)) continue;
      const slots = expandDay({
        day,
        schedules: schedules[`${doc.id}:${wd}`] || [],
        booked: booked[`${doc.id}:${day}`] || new Set(),
        stepSec: doc.slot_duration_minutes * 60,
        doctorClinicId: doc.clinic_id,
        clinicIds,
        cutoff,
      });
      for (const s of slots) if (s.is_available) result[doc.id].push([day, s.start_time, s.clinic_id]);
    }
  }
  return result;
}

async function dayCapacity(doctor, day, c) {
  let total = 0;
  if (!(await onLeave(doctor.id, day, c))) {
    const step = doctor.slot_duration_minutes * 60;
    for (const s of await query(
      'SELECT start_time, end_time FROM doctor_schedules WHERE doctor_id = $1 AND day_of_week = $2 AND is_active = true',
      [doctor.id, weekday(day)],
      c
    )) {
      total += Math.floor((timeToSec(s.end_time) - timeToSec(s.start_time)) / step);
    }
  }
  const booked =
    (await scalar(
      `SELECT COUNT(id) FROM appointments WHERE doctor_id = $1 AND appointment_date = $2::date AND status <> 'cancelled'`,
      [doctor.id, day],
      c
    )) || 0;
  const remaining = (await generateSlots(doctor, day, null, c)).filter((s) => s.is_available).length;
  return { total_slots: total, booked, remaining, percent_booked: total ? Math.round((booked / total) * 100) : 0 };
}

module.exports = { expandDay, effectiveClinicId, generateSlots, findSlot, availabilityMap, dayCapacity };
