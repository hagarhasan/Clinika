'use strict';
const express = require('express');
const settings = require('../config');
const { HttpError } = require('../errors');
const { tx, exec } = require('../db');
const { ah } = require('../middleware/auth');
const repo = require('../repo');
const { notify } = require('../services/notifications');
const { nowLocal, addDays, hhmm } = require('../utils/time');

const router = express.Router();

router.get('/send-reminders', ah(async (req, res) => {
  if (!settings.CRON_SECRET || req.headers.authorization !== `Bearer ${settings.CRON_SECRET}`) throw new HttpError(403, 'Forbidden');
  const tomorrow = addDays(nowLocal().date, 1);
  const appts = await repo.loadAppointments(`a.appointment_date = $1::date AND a.status IN ('pending','confirmed') AND a.reminder_sent = false`, [tomorrow]);
  await tx(async (c) => {
    for (const a of appts) {
      await notify(c, a.p_user_id, 'Appointment reminder', `Reminder: you have an appointment with Dr. ${a.d_full_name} tomorrow at ${hhmm(a.start_time)}.`, 'reminder');
      await exec('UPDATE appointments SET reminder_sent = true WHERE id = $1', [a.id], c);
    }
  });
  res.json({ reminders_sent: appts.length });
}));

module.exports = router;
