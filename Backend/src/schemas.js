'use strict';
const { z } = require('zod');
const { isValidDate, isValidTime, normTime, timeToSec } = require('./utils/time');

const zint = z.preprocess((v) => (typeof v === 'string' && /^-?\d+$/.test(v.trim()) ? parseInt(v, 10) : v), z.number().int());
const znum = z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : v), z.number());
const zdate = z.string().refine(isValidDate, { message: 'Input should be a valid date, invalid date format' });
const ztime = z
  .string()
  .refine(isValidTime, { message: 'Input should be in a valid time format' })
  .transform(normTime);
const email = z.string().email();
const gender = z.enum(['male', 'female']);
const bloodType = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const password = z.string().min(8).max(72);

const nameFields = {
  full_name: z.string().max(150).nullish(),
  first_name: z.string().min(1).max(70).nullish(),
  last_name: z.string().min(1).max(70).nullish(),
};

const RegisterIn = z.object({
  ...nameFields,
  email,
  password,
  phone: z.string().max(30).nullish(),
  date_of_birth: zdate.nullish(),
  gender: gender.nullish(),
});

const DoctorRegisterIn = z.object({
  ...nameFields,
  email,
  password,
  phone: z.string().max(30).nullish(),
  gender: gender.nullish(),
  specialty_id: zint,
  clinic_id: zint.nullish(),
  license_number: z.string().min(3).max(60),
  years_of_experience: zint.pipe(z.number().min(0).max(70)).default(0),
  consultation_fee: znum.pipe(z.number().min(0)).default(0),
  bio: z.string().max(2000).nullish(),
});

const LoginIn = z.object({ email, password: z.string(), remember_me: z.boolean().default(false) });

const UserUpdate = z.object({
  ...nameFields,
  phone: z.string().max(30).nullish(),
  avatar_url: z.string().max(500).nullish(),
  email: email.nullish(),
  current_password: z.string().nullish(),
});

const ChangePasswordIn = z.object({ current_password: z.string(), new_password: password });
const ForgotPasswordIn = z.object({ email });
const ResetPasswordIn = z.object({ token: z.string().min(20).max(200), new_password: password });
const AdminUserCreate = z.object({ ...nameFields, email, password, phone: z.string().nullish() });
const AdminPatientCreate = z.object({
  ...nameFields,
  email,
  password: password.nullish(),
  phone: z.string().max(30).nullish(),
  date_of_birth: zdate.nullish(),
  gender: gender.nullish(),
});
const AdminUserStatusIn = z.object({ is_active: z.boolean() });

const SpecialtyIn = z.object({ name: z.string().min(2).max(120), description: z.string().nullish() });

const clinicFields = {
  address: z.string().nullish(),
  city: z.string().nullish(),
  district: z.string().max(100).nullish(),
  phone: z.string().nullish(),
  email: email.nullish(),
  description: z.string().nullish(),
  latitude: znum.pipe(z.number().min(-90).max(90)).nullish(),
  longitude: znum.pipe(z.number().min(-180).max(180)).nullish(),
  photo_url: z.string().max(500).nullish(),
  parking_info: z.string().nullish(),
};
const ClinicIn = z.object({ name: z.string().min(2).max(150), ...clinicFields });
const ClinicUpdate = z.object({
  name: z.string().min(2).max(150).nullish(),
  ...clinicFields,
  is_active: z.boolean().nullish(),
});

const PatientUpdate = z.object({
  ...nameFields,
  phone: z.string().nullish(),
  date_of_birth: zdate.nullish(),
  gender: gender.nullish(),
  blood_type: bloodType.nullish(),
  address: z.string().nullish(),
  emergency_contact_name: z.string().nullish(),
  emergency_contact_phone: z.string().nullish(),
  allergies: z.string().nullish(),
  chronic_conditions: z.string().nullish(),
});

const CredentialIn = z.object({
  kind: z.enum(['education', 'certification']).default('education'),
  title: z.string().min(2).max(200),
  institution: z.string().max(200).nullish(),
  year: zint.pipe(z.number().min(1950).max(2100)).nullish(),
});

const profileFields = {
  gender: gender.nullish(),
  title: z.string().max(150).nullish(),
  room: z.string().max(60).nullish(),
  languages: z.array(z.string()).nullish(),
  focus_areas: z.array(z.string()).nullish(),
  accepting_new_patients: z.boolean().nullish(),
  offers_online: z.boolean().nullish(),
};

const DoctorCreate = z.object({
  ...nameFields,
  email,
  password,
  phone: z.string().nullish(),
  specialty_id: zint,
  clinic_id: zint.nullish(),
  bio: z.string().nullish(),
  years_of_experience: zint.pipe(z.number().min(0).max(70)).default(0),
  consultation_fee: znum.pipe(z.number().min(0)).default(0),
  license_number: z.string().nullish(),
  slot_duration_minutes: zint.pipe(z.number().min(10).max(120)).default(30),
  ...profileFields,
  is_verified: z.boolean().default(false),
  accepting_new_patients: z.boolean().default(true),
  offers_online: z.boolean().default(false),
});

const DoctorUpdate = z.object({
  ...profileFields,
  specialty_id: zint.nullish(),
  clinic_id: zint.nullish(),
  bio: z.string().nullish(),
  years_of_experience: zint.pipe(z.number().min(0).max(70)).nullish(),
  consultation_fee: znum.pipe(z.number().min(0)).nullish(),
  license_number: z.string().nullish(),
  slot_duration_minutes: zint.pipe(z.number().min(10).max(120)).nullish(),
  is_active: z.boolean().nullish(),
  is_verified: z.boolean().nullish(),
  photo_url: z.string().max(500).nullish(),
});

const DoctorReviewIn = z.object({ action: z.enum(['approve', 'reject']), reason: z.string().max(500).nullish() });
const DoctorVerifyIn = z.object({ is_verified: z.boolean() });

const ScheduleItem = z
  .object({
    day_of_week: zint.pipe(z.number().min(0).max(6)),
    start_time: ztime,
    end_time: ztime,
    is_active: z.boolean().default(true),
    clinic_id: zint.nullish(),
  })
  .refine((s) => timeToSec(s.end_time) > timeToSec(s.start_time), { message: 'Value error, end_time must be after start_time' });

const TimeOffIn = z
  .object({ start_date: zdate, end_date: zdate, reason: z.string().max(255).nullish() })
  .refine((t) => t.end_date >= t.start_date, { message: 'Value error, end_date must be on or after start_date' });

const AppointmentCreate = z.object({
  doctor_id: zint,
  appointment_date: zdate,
  start_time: ztime,
  reason: z.string().max(1000).nullish(),
  consultation_type: z.enum(['in_person', 'online']).default('in_person'),
  clinic_id: zint.nullish(),
});
const AdminAppointmentCreate = AppointmentCreate.extend({
  patient_id: zint,
  status: z.enum(['pending', 'confirmed']).default('confirmed'),
});
const MeetingLinkIn = z.object({
  meeting_link: z
    .string()
    .max(500)
    .refine((v) => !v || v.startsWith('https://'), { message: 'Value error, meeting_link must start with https://' })
    .nullish(),
});
const RescheduleIn = z.object({ appointment_date: zdate, start_time: ztime, clinic_id: zint.nullish() });
const CancelIn = z.object({ reason: z.string().max(500).nullish() });
const StatusUpdateIn = z.object({ status: z.enum(['confirmed', 'completed', 'no_show']) });

const MedicalRecordCreate = z.object({
  patient_id: zint,
  appointment_id: zint.nullish(),
  symptoms: z.string().nullish(),
  diagnosis: z.string().min(2),
  treatment_plan: z.string().nullish(),
  notes: z.string().nullish(),
  follow_up_date: zdate.nullish(),
});
const MedicalRecordUpdate = z.object({
  symptoms: z.string().nullish(),
  diagnosis: z.string().min(2).nullish(),
  treatment_plan: z.string().nullish(),
  notes: z.string().nullish(),
  follow_up_date: zdate.nullish(),
});
const PrescriptionItemIn = z.object({
  medication_name: z.string().min(1).max(200),
  dosage: z.string().nullish(),
  frequency: z.string().nullish(),
  duration: z.string().nullish(),
  instructions: z.string().nullish(),
});
const PrescriptionCreate = z.object({
  patient_id: zint,
  appointment_id: zint.nullish(),
  medical_record_id: zint.nullish(),
  notes: z.string().nullish(),
  items: z.array(PrescriptionItemIn).min(1),
});

const ReviewCreate = z.object({
  appointment_id: zint,
  rating: zint.pipe(z.number().min(1).max(5)),
  comment: z.string().max(1000).nullish(),
});
const ContactIn = z.object({
  name: z.string().min(2).max(120),
  email,
  subject: z.string().max(200).nullish(),
  message: z.string().min(5).max(3000),
});
const ContactStatusIn = z.object({ status: z.enum(['new', 'read', 'resolved']) });

module.exports = {
  RegisterIn, DoctorRegisterIn, LoginIn, UserUpdate, ChangePasswordIn, ForgotPasswordIn, ResetPasswordIn,
  AdminUserCreate, AdminPatientCreate, AdminUserStatusIn, SpecialtyIn, ClinicIn, ClinicUpdate, PatientUpdate,
  CredentialIn, DoctorCreate, DoctorUpdate, DoctorReviewIn, DoctorVerifyIn, ScheduleItem, TimeOffIn,
  AppointmentCreate, AdminAppointmentCreate, MeetingLinkIn, RescheduleIn, CancelIn, StatusUpdateIn,
  MedicalRecordCreate, MedicalRecordUpdate, PrescriptionCreate, ReviewCreate, ContactIn, ContactStatusIn,
};
