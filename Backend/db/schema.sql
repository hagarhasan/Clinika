

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  first_name VARCHAR(75) NOT NULL,
  last_name VARCHAR(75) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  role VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url VARCHAR(500),
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_users_role ON users (role);

CREATE TABLE IF NOT EXISTS specialties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS clinics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(255),
  city VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(255),
  district VARCHAR(100),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  photo_url VARCHAR(500),
  parking_info TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS ix_clinics_city ON clinics (city);
CREATE INDEX IF NOT EXISTS ix_clinics_district ON clinics (district);

CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender VARCHAR(10),
  blood_type VARCHAR(5),
  address VARCHAR(255),
  emergency_contact_name VARCHAR(150),
  emergency_contact_phone VARCHAR(30),
  allergies TEXT,
  chronic_conditions TEXT
);

CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  specialty_id INTEGER REFERENCES specialties (id),
  clinic_id INTEGER REFERENCES clinics (id),
  bio TEXT,
  years_of_experience INTEGER NOT NULL DEFAULT 0,
  consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  license_number VARCHAR(60),
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  gender VARCHAR(10),
  title VARCHAR(150),
  room VARCHAR(60),
  languages JSON,
  focus_areas JSON,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  accepting_new_patients BOOLEAN NOT NULL DEFAULT TRUE,
  offers_online BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS ix_doctors_specialty_id ON doctors (specialty_id);
CREATE INDEX IF NOT EXISTS ix_doctors_clinic_id ON doctors (clinic_id);
CREATE INDEX IF NOT EXISTS ix_doctors_status ON doctors (status);

CREATE TABLE IF NOT EXISTS doctor_credentials (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL DEFAULT 'education',
  title VARCHAR(200) NOT NULL,
  institution VARCHAR(200),
  year INTEGER
);
CREATE INDEX IF NOT EXISTS ix_doctor_credentials_doctor_id ON doctor_credentials (doctor_id);

CREATE TABLE IF NOT EXISTS doctor_schedules (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  clinic_id INTEGER REFERENCES clinics (id) ON DELETE SET NULL,
  CONSTRAINT ck_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6)
);
CREATE INDEX IF NOT EXISTS ix_doctor_schedules_doctor_id ON doctor_schedules (doctor_id);
CREATE INDEX IF NOT EXISTS ix_doctor_schedules_clinic_id ON doctor_schedules (clinic_id);

CREATE TABLE IF NOT EXISTS doctor_time_off (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS ix_doctor_time_off_doctor_id ON doctor_time_off (doctor_id);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(20),
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  consultation_type VARCHAR(20) NOT NULL DEFAULT 'in_person',
  reference_number VARCHAR(30) UNIQUE,
  fee_at_booking NUMERIC(10, 2),
  meeting_link VARCHAR(500),
  clinic_id INTEGER REFERENCES clinics (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_appointments_patient_id ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS ix_appointments_doctor_id ON appointments (doctor_id);
CREATE INDEX IF NOT EXISTS ix_appointments_appointment_date ON appointments (appointment_date);
CREATE INDEX IF NOT EXISTS ix_appointments_status ON appointments (status);
CREATE INDEX IF NOT EXISTS ix_appointments_clinic_id ON appointments (clinic_id);
-- يمنع الحجز المزدوج على مستوى قاعدة البيانات (الحجوزات الملغية مستثناة)
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_doctor_slot
  ON appointments (doctor_id, appointment_date, start_time) WHERE status <> 'cancelled';

CREATE TABLE IF NOT EXISTS medical_records (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctors (id),
  appointment_id INTEGER REFERENCES appointments (id) ON DELETE SET NULL,
  symptoms TEXT,
  diagnosis TEXT NOT NULL,
  treatment_plan TEXT,
  notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_medical_records_patient_id ON medical_records (patient_id);
CREATE INDEX IF NOT EXISTS ix_medical_records_doctor_id ON medical_records (doctor_id);

CREATE TABLE IF NOT EXISTS prescriptions (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctors (id),
  appointment_id INTEGER REFERENCES appointments (id) ON DELETE SET NULL,
  medical_record_id INTEGER REFERENCES medical_records (id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_prescriptions_patient_id ON prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS ix_prescriptions_doctor_id ON prescriptions (doctor_id);

CREATE TABLE IF NOT EXISTS prescription_items (
  id SERIAL PRIMARY KEY,
  prescription_id INTEGER NOT NULL REFERENCES prescriptions (id) ON DELETE CASCADE,
  medication_name VARCHAR(200) NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  duration VARCHAR(100),
  instructions TEXT
);
CREATE INDEX IF NOT EXISTS ix_prescription_items_prescription_id ON prescription_items (prescription_id);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
  appointment_id INTEGER NOT NULL REFERENCES appointments (id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_review_appointment UNIQUE (appointment_id),
  CONSTRAINT ck_rating_range CHECK (rating >= 1 AND rating <= 5)
);
CREATE INDEX IF NOT EXISTS ix_reviews_doctor_id ON reviews (doctor_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
  action VARCHAR(60) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs (user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id ON password_reset_tokens (user_id);

CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(200),
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_contact_messages_email ON contact_messages (email);
CREATE INDEX IF NOT EXISTS ix_contact_messages_status ON contact_messages (status);
CREATE INDEX IF NOT EXISTS ix_contact_messages_created_at ON contact_messages (created_at);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
  action VARCHAR(60) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id INTEGER,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_activity_logs_actor_user_id ON activity_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS ix_activity_logs_created_at ON activity_logs (created_at);
