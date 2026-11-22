'use strict';
const crypto = require('crypto');
const settings = require('../config');
const { HttpError } = require('../errors');
const { query, scalar, one, exec, isUniqueViolation, insert } = require('../db');
const { notify, logActivity } = require('./notifications');
const { findSlot } = require('./slots');
const { nowLocal, normMinute, hhmm, pad } = require('../utils/time');

async function createBooking(c, { patient, doctor, appointmentDate, startTime, reason, consultationType, actor, status = null, clinicId = null }) {
  if (!doctor.is_active) throw new HttpError(400, 'This doctor is not available for booking');
  if (consultationType === 'online' && !doctor.offers_online) {
    throw new HttpError(400, 'This doctor does not offer online consultations');
  }

  if (!doctor.accepting_new_patients) {
    const seenBefore = await scalar(
      `SELECT id FROM appointments WHERE doctor_id = $1 AND patient_id = $2 AND status <> 'cancelled' LIMIT 1`,
      [doctor.id, patient.id],
      c
    );
    if (seenBefore === null) throw new HttpError(400, 'This doctor is not accepting new patients');
  }

  const slot = await findSlot(doctor, appointmentDate, startTime, clinicId, c);
  const start = normMinute(startTime);

  const clash = await scalar(
    `SELECT id FROM appointments WHERE patient_id = $1 AND appointment_date = $2::date AND start_time = $3::time
       AND status IN ('pending','confirmed')`,
    [patient.id, appointmentDate, start],
    c
  );
  if (clash) throw new HttpError(409, 'The patient already has an appointment at this time');

  const finalStatus = status || (settings.AUTO_CONFIRM_APPOINTMENTS ? 'confirmed' : 'pending');
  let appt;
  try {
    appt = await insert(
      'appointments',
      {
        patient_id: patient.id,
        doctor_id: doctor.id,
        appointment_date: appointmentDate,
        start_time: start,
        end_time: slot.end_time,
        status: finalStatus,
        reason: reason ?? null,
        reminder_sent: false,
        consultation_type: consultationType,
        fee_at_booking: doctor.consultation_fee,
        clinic_id: slot.clinic_id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      c
    );
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'This time slot is already booked');
    throw e;
  }

  const reference = `APT-${nowLocal().year}-${pad(appt.id, 4)}`;

  const meetingLink =
    consultationType === 'online' ? `${settings.ONLINE_MEETING_BASE_URL.replace(/\/+$/, '')}/Clinika-${crypto.randomBytes(8).toString('hex')}` : null;
  await exec('UPDATE appointments SET reference_number = $1, meeting_link = $2 WHERE id = $3', [reference, meetingLink, appt.id], c);

  const when = `${appointmentDate} ${hhmm(start)}`;
  await notify(c, doctor.user_id, 'New appointment', `${patient.full_name} booked ${when} (${reference}).`, 'appointment');
  await notify(c, patient.user_id, 'Appointment booked', `Your appointment with Dr. ${doctor.full_name} on ${when} was booked (${reference}).`, 'appointment');
  await logActivity(c, actor.id, 'appointment_booked', 'appointment', appt.id, `${patient.full_name} booked Dr. ${doctor.full_name} on ${when}`);
  return appt.id;
}

module.exports = { createBooking };
