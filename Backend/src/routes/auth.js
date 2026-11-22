'use strict';
const express = require('express');
const settings = require('../config');
const { HttpError, ValidationError } = require('../errors');
const { query: dbq, one, scalar, tx, exec, update, insert, isUniqueViolation } = require('../db');
const { ah, auth } = require('../middleware/auth');
const { parseBody, parseNamed } = require('../utils/validate');
const { query } = require('../utils/params');
const S = require('../schemas');
const { hashPassword, verifyPassword, createAccessToken, hashToken } = require('../security');
const { userOut, doctorStatusPatch } = require('../repo');
const { insertUser, insertDoctor } = require('../services/users');
const { logActivity, notifyAdmins } = require('../services/notifications');
const { issueResetToken } = require('../services/passwords');
const { sendPasswordResetEmail } = require('../services/email');
const { validateImageUrl } = require('../services/storage');

const router = express.Router();
const EMAIL_TAKEN = () => new HttpError(409, 'Email is already registered');

async function authenticate(email, password) {
  const user = await one('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
  if (!user || !verifyPassword(password, user.hashed_password)) throw new HttpError(401, 'Incorrect email or password');
  if (!user.is_active) throw new HttpError(403, 'Account is deactivated');
  if (user.role === 'doctor') {
    const doctor = await one('SELECT status FROM doctors WHERE user_id = $1', [user.id]);
    if (doctor && doctor.status === 'pending') throw new HttpError(403, 'Your doctor account is pending admin approval');
    if (doctor && doctor.status === 'rejected') throw new HttpError(403, 'Your doctor application was not approved');
  }
  return user;
}

function tokenFor(user, rememberMe = false) {
  const minutes = rememberMe ? settings.REMEMBER_ME_EXPIRE_DAYS * 24 * 60 : undefined;
  return createAccessToken(user.id, user.role, user.token_version || 0, minutes);
}

router.post('/register', ah(async (req, res) => {
  const p = parseNamed(S.RegisterIn, req.body, true);
  const email = p.email.toLowerCase();
  if (await scalar('SELECT id FROM users WHERE email = $1', [email])) throw EMAIL_TAKEN();
  let user;
  try {
    user = await tx(async (c) => {
      const u = await insertUser(c, { email, password: p.password, first_name: p.first_name, last_name: p.last_name, phone: p.phone, role: 'patient' });
      await insert('patients', { user_id: u.id, date_of_birth: p.date_of_birth ?? null, gender: p.gender ?? null }, c);
      await logActivity(c, u.id, 'patient_registered', 'user', u.id, `New patient registered: ${u.full_name}`);
      return u;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw EMAIL_TAKEN();
    throw e;
  }
  res.status(201).json({ access_token: tokenFor(user), token_type: 'bearer', user: userOut(user) });
}));

router.post('/register/doctor', ah(async (req, res) => {
  const p = parseNamed(S.DoctorRegisterIn, req.body, true);
  const email = p.email.toLowerCase();
  if (await scalar('SELECT id FROM users WHERE email = $1', [email])) throw EMAIL_TAKEN();
  if (!(await scalar('SELECT id FROM specialties WHERE id = $1', [p.specialty_id]))) throw new HttpError(400, 'Specialty does not exist');
  if (p.clinic_id && !(await scalar('SELECT id FROM clinics WHERE id = $1', [p.clinic_id]))) throw new HttpError(400, 'Clinic does not exist');
  const licenseNo = p.license_number.trim();
  const taken = await scalar(`SELECT id FROM doctors WHERE lower(license_number) = lower($1) AND status <> 'rejected' LIMIT 1`, [licenseNo]);
  if (taken) throw new HttpError(409, 'A doctor with this license number is already registered');

  let out;
  try {
    out = await tx(async (c) => {
      const user = await insertUser(c, { email, password: p.password, first_name: p.first_name, last_name: p.last_name, phone: p.phone, role: 'doctor' });
      const doctor = await insertDoctor(c, {
        user_id: user.id, specialty_id: p.specialty_id, clinic_id: p.clinic_id, bio: p.bio,
        years_of_experience: p.years_of_experience, consultation_fee: p.consultation_fee,
        license_number: licenseNo, gender: p.gender, ...doctorStatusPatch('pending'),
      });
      await notifyAdmins(c, 'New doctor request', `Dr. ${user.full_name} asked to join Clinika.`, 'doctor_request');
      await logActivity(c, user.id, 'doctor_requested', 'doctor', doctor.id, `Doctor request from ${user.full_name}`);
      return doctor;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw EMAIL_TAKEN();
    throw e;
  }
  res.status(201).json({
    message: 'Your request was received. You will be able to sign in once an admin approves it.',
    status: out.status,
    doctor_id: out.id,
  });
}));

router.post('/login', ah(async (req, res) => {
  const p = parseBody(S.LoginIn, req.body);
  const user = await authenticate(p.email, p.password);
  res.json({ access_token: tokenFor(user, p.remember_me), token_type: 'bearer', user: userOut(user) });
}));

router.post('/token', ah(async (req, res) => {
  const b = req.body || {};
  const errors = [];
  for (const f of ['username', 'password']) {
    if (typeof b[f] !== 'string' || b[f] === '') errors.push({ type: 'missing', loc: ['body', f], msg: 'Field required', input: null });
  }
  if (errors.length) throw new ValidationError(errors);
  const user = await authenticate(b.username, b.password);
  res.json({ access_token: tokenFor(user), token_type: 'bearer' });
}));

router.get('/me', auth, (req, res) => res.json(userOut(req.user)));

router.put('/me', auth, ah(async (req, res) => {
  const p = parseNamed(S.UserUpdate, req.body, false);
  const user = req.user;
  const patch = {};

  if (p.email !== undefined && p.email !== null && p.email.toLowerCase() !== user.email) {
    if (!p.current_password || !verifyPassword(p.current_password, user.hashed_password)) {
      throw new HttpError(400, 'Current password is required to change your email');
    }
    const newEmail = p.email.toLowerCase();
    if (await scalar('SELECT id FROM users WHERE email = $1 AND id <> $2', [newEmail, user.id])) throw EMAIL_TAKEN();
    patch.email = newEmail;
  }
  if (p.avatar_url !== undefined) patch.avatar_url = validateImageUrl(p.avatar_url);
  if (p.phone !== undefined) patch.phone = p.phone;
  if (p.first_name) patch.first_name = p.first_name.trim();
  if (p.last_name) patch.last_name = p.last_name.trim();
  patch.full_name = `${patch.first_name ?? user.first_name} ${patch.last_name ?? user.last_name}`.trim();

  let updated;
  try {
    updated = await update('users', user.id, patch);
  } catch (e) {
    if (isUniqueViolation(e)) throw EMAIL_TAKEN();
    throw e;
  }
  res.json(userOut(updated));
}));

router.post('/change-password', auth, ah(async (req, res) => {
  const p = parseBody(S.ChangePasswordIn, req.body);
  const user = req.user;
  if (!verifyPassword(p.current_password, user.hashed_password)) throw new HttpError(400, 'Current password is incorrect');
  const updated = await update('users', user.id, { hashed_password: hashPassword(p.new_password), token_version: (user.token_version || 0) + 1 });
  res.json({ access_token: tokenFor(updated), token_type: 'bearer' });
}));

router.post('/forgot-password', ah(async (req, res) => {
  const p = parseBody(S.ForgotPasswordIn, req.body);
  const generic = { message: 'If this email is registered, a reset link has been sent.' };
  const user = await one('SELECT * FROM users WHERE email = $1', [p.email.toLowerCase()]);
  if (!user || !user.is_active) return res.json(generic);

  const recent = await scalar('SELECT id FROM password_reset_tokens WHERE user_id = $1 AND created_at > $2 LIMIT 1', [user.id, new Date(Date.now() - 60000)]);
  if (recent) return res.json(generic);

  const minutes = settings.PASSWORD_RESET_EXPIRE_MINUTES;
  const raw = await tx((c) => issueResetToken(c, user, minutes));
  await sendPasswordResetEmail(user.email, user.first_name, raw, minutes);
  res.json(generic);
}));

async function validResetToken(raw) {
  const record = await one('SELECT * FROM password_reset_tokens WHERE token_hash = $1', [hashToken(raw)]);
  if (!record || record.used_at) return null;
  if (new Date(record.expires_at) < new Date()) return null;
  return record;
}

router.get('/reset-password/validate', ah(async (req, res) => {
  const q = query(req);
  const token = q.str('token', { required: true, min: 20, max: 200 });
  q.done();
  res.json({ valid: (await validResetToken(token)) !== null });
}));

router.post('/reset-password', ah(async (req, res) => {
  const p = parseBody(S.ResetPasswordIn, req.body);
  const bad = () => new HttpError(400, 'This reset link is invalid or has expired');
  const record = await validResetToken(p.token);
  if (!record) throw bad();
  const user = await one('SELECT * FROM users WHERE id = $1', [record.user_id]);
  if (!user || !user.is_active) throw bad();
  await tx(async (c) => {
    const now = new Date();
    await exec('UPDATE users SET hashed_password = $1, token_version = $2 WHERE id = $3', [hashPassword(p.new_password), (user.token_version || 0) + 1, user.id], c);
    await exec('UPDATE password_reset_tokens SET used_at = $1 WHERE user_id = $2 AND used_at IS NULL', [now, user.id], c);
  });
  res.json({ message: 'Password updated. Please sign in with your new password.' });
}));

module.exports = router;
