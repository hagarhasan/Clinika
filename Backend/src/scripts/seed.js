'use strict';
// بيانات تجريبية:  npm run seed   (آمن لو اتشغل أكتر من مرة)
const settings = require('../config');
const { getPool, one, tx, insert } = require('../db');
const { insertUser, insertDoctor } = require('../services/users');
const { doctorStatusPatch } = require('../repo');

const SPECIALTIES = [
  ['Cardiology', 'Heart and blood vessels'],
  ['Dermatology', 'Skin, hair and nails'],
  ['Pediatrics', "Children's health"],
  ['Orthopedics', 'Bones and joints'],
  ['Dentistry', 'Teeth and oral health'],
  ['General Practice', 'Primary care'],
];
const DOCTORS = [
  ['dr.ahmed@clinika.com', 'Ahmed', 'Hassan', 'Cardiology', 12, 400],
  ['dr.sara@clinika.com', 'Sara', 'Mahmoud', 'Dermatology', 8, 300],
  ['dr.omar@clinika.com', 'Omar', 'Khaled', 'Pediatrics', 10, 250],
];
const DEMO_PASSWORD = 'Doctor@12345';
const PATIENT_PASSWORD = 'Patient@12345';

async function getOrCreateUser(c, email, password, first, last, role, phone) {
  const existing = await one('SELECT * FROM users WHERE email = $1', [email], c);
  if (existing) return [existing, false];
  return [await insertUser(c, { email, password, first_name: first, last_name: last, phone, role }), true];
}

(async () => {
  await tx(async (c) => {
    await getOrCreateUser(c, settings.ADMIN_EMAIL, settings.ADMIN_PASSWORD, 'Clinika', 'Admin', 'admin');

    const specs = {};
    for (const [name, description] of SPECIALTIES) {
      specs[name] = (await one('SELECT * FROM specialties WHERE name = $1', [name], c)) || (await insert('specialties', { name, description }, c));
    }

    let clinic = await one('SELECT * FROM clinics WHERE name = $1', ['Clinika Main Clinic'], c);
    if (!clinic) {
      clinic = await insert('clinics', {
        name: 'Clinika Main Clinic', address: 'Main Street', city: 'Qena', district: 'Qena City', phone: '0965000000',
        email: 'info@clinika.com', description: 'Demo clinic', parking_info: 'Street parking available in front of the clinic.', is_active: true,
      }, c);
    }

    for (const [email, first, last, specName, years, fee] of DOCTORS) {
      const [user, created] = await getOrCreateUser(c, email, DEMO_PASSWORD, first, last, 'doctor', '01000000000');
      if (!created) continue;
      const doctor = await insertDoctor(c, {
        user_id: user.id, specialty_id: specs[specName].id, clinic_id: clinic.id,
        bio: `${specName} specialist with ${years} years of experience.`, years_of_experience: years, consultation_fee: fee,
        slot_duration_minutes: 30, title: `${specName} Specialist`, languages: ['Arabic', 'English'], is_verified: true,
        offers_online: true, accepting_new_patients: true, ...doctorStatusPatch('active'),
      });
      await insert('doctor_credentials', { doctor_id: doctor.id, kind: 'education', title: 'MBBS', institution: 'Cairo University' }, c);

      for (const day of [5, 6, 0, 1, 2]) {
        await insert('doctor_schedules', { doctor_id: doctor.id, day_of_week: day, start_time: '10:00:00', end_time: '14:00:00', is_active: true }, c);
        await insert('doctor_schedules', { doctor_id: doctor.id, day_of_week: day, start_time: '17:00:00', end_time: '21:00:00', is_active: true }, c);
      }
    }

    for (const [email, first, last, gender] of [
      ['patient1@clinika.com', 'Mona', 'Ali', 'female'],
      ['patient2@clinika.com', 'Youssef', 'Adel', 'male'],
    ]) {
      const [user, created] = await getOrCreateUser(c, email, PATIENT_PASSWORD, first, last, 'patient', '01111111111');
      if (created) await insert('patients', { user_id: user.id, gender }, c);
    }
  });
  console.log('Seed completed.');
  console.log(`Admin   : ${settings.ADMIN_EMAIL} / ${settings.ADMIN_PASSWORD}`);
  console.log(`Doctors : dr.ahmed@clinika.com (and others) / ${DEMO_PASSWORD}`);
  console.log(`Patients: patient1@clinika.com / ${PATIENT_PASSWORD}`);
  await getPool().end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
