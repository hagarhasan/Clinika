'use strict';
const express = require('express');
const { HttpError } = require('../errors');
const { query: dbq, one, scalar, insert, isUniqueViolation } = require('../db');
const { ah, currentPatient } = require('../middleware/auth');
const { parseBody } = require('../utils/validate');
const S = require('../schemas');
const repo = require('../repo');

const router = express.Router();

router.post('/', currentPatient, ah(async (req, res) => {
  const p = parseBody(S.ReviewCreate, req.body);
  const appt = await one('SELECT id, patient_id, doctor_id, status FROM appointments WHERE id = $1', [p.appointment_id]);
  if (!appt || appt.patient_id !== req.patient.id) throw new HttpError(404, 'Appointment not found');
  if (appt.status !== 'completed') throw new HttpError(400, 'You can only review completed appointments');
  if (await scalar('SELECT id FROM reviews WHERE appointment_id = $1', [appt.id])) throw new HttpError(409, 'You already reviewed this appointment');

  let review;
  try {
    review = await insert('reviews', {
      patient_id: req.patient.id, doctor_id: appt.doctor_id, appointment_id: appt.id,
      rating: p.rating, comment: p.comment ?? null, created_at: new Date(),
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'You already reviewed this appointment');
    throw e;
  }
  const rows = await dbq(`${repo.REVIEW_SELECT} WHERE r.id = $1`, [review.id]);
  res.status(201).json(repo.reviewOut(rows[0]));
}));

module.exports = router;
