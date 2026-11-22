'use strict';
const { HttpError } = require('../errors');
const { one } = require('../db');
const { decodeAccessToken } = require('../security');
const { loadPatientByUser, loadDoctorByUser } = require('../repo');

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const unauth = (detail) => new HttpError(401, detail, { 'WWW-Authenticate': 'Bearer' });

const auth = ah(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const m = /^bearer\s+(.+)$/i.exec(header);
  if (!m) throw unauth('Not authenticated');
  const payload = decodeAccessToken(m[1].trim());
  if (!payload || payload.sub === undefined || !/^\d+$/.test(String(payload.sub))) throw unauth('Invalid or expired token');
  const user = await one('SELECT * FROM users WHERE id = $1', [parseInt(payload.sub, 10)]);
  if (!user) throw unauth('Invalid or expired token');
  // التوكنات القديمة (قبل ميزة token_version) مالهاش "tv" فبتتعامل كأنها 0
  if (parseInt(payload.tv || 0, 10) !== (user.token_version || 0)) throw unauth('Invalid or expired token');
  if (!user.is_active) throw new HttpError(403, 'Account is deactivated');
  req.user = user;
  next();
});

const requireRoles = (...roles) => [
  auth,
  (req, _res, next) => {
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to perform this action'));
    next();
  },
];

const currentPatient = [
  ...requireRoles('patient'),
  ah(async (req, _res, next) => {
    const p = await loadPatientByUser(req.user.id);
    if (!p) throw new HttpError(404, 'Patient profile not found');
    req.patient = p;
    next();
  }),
];

const currentDoctor = [
  ...requireRoles('doctor'),
  ah(async (req, _res, next) => {
    const d = await loadDoctorByUser(req.user.id);
    if (!d) throw new HttpError(404, 'Doctor profile not found');
    if (d.status === 'pending' || d.status === 'rejected') throw new HttpError(403, 'Your doctor account is not approved yet');
    req.doctor = d;
    next();
  }),
];

module.exports = { ah, auth, requireRoles, currentPatient, currentDoctor };
