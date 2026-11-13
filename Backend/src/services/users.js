'use strict';
const { insert, json } = require('../db');
const { hashPassword } = require('../security');

async function insertUser(c, { email, password, first_name, last_name, phone, role }) {
  const fn = first_name.trim();
  const ln = last_name.trim();
  return insert(
    'users',
    {
      email,
      hashed_password: hashPassword(password),
      first_name: fn,
      last_name: ln,
      full_name: `${fn} ${ln}`,
      phone: phone ?? null,
      role,
      is_active: true,
      token_version: 0,
      created_at: new Date(),
    },
    c
  );
}

async function insertDoctor(c, d) {
  return insert(
    'doctors',
    {
      user_id: d.user_id,
      specialty_id: d.specialty_id ?? null,
      clinic_id: d.clinic_id ?? null,
      bio: d.bio ?? null,
      years_of_experience: d.years_of_experience ?? 0,
      consultation_fee: d.consultation_fee ?? 0,
      license_number: d.license_number ?? null,
      slot_duration_minutes: d.slot_duration_minutes ?? 30,
      is_active: d.is_active,
      status: d.status,
      rejection_reason: d.rejection_reason ?? null,
      reviewed_at: d.reviewed_at ?? null,
      gender: d.gender ?? null,
      title: d.title ?? null,
      room: d.room ?? null,
      languages: json(d.languages),
      focus_areas: json(d.focus_areas),
      is_verified: d.is_verified ?? false,
      accepting_new_patients: d.accepting_new_patients ?? true,
      offers_online: d.offers_online ?? false,
    },
    c
  );
}

module.exports = { insertUser, insertDoctor };
