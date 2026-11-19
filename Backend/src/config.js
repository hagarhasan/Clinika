'use strict';
try {
  require('dotenv').config();
} catch (_) {
  /* dotenv مش متثبت — بنعتمد على environment variables بس */
}

const env = process.env;
const str = (k, d) => (env[k] !== undefined ? env[k] : d);
const int = (k, d) => {
  const v = env[k];
  if (v === undefined || v.trim() === '') return d;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? d : n;
};
const bool = (k, d) => {
  const v = env[k];
  if (v === undefined || v.trim() === '') return d;
  return ['1', 'true', 't', 'yes', 'y', 'on'].includes(v.trim().toLowerCase());
};

const settings = {
  APP_NAME: str('APP_NAME', 'Clinika API'),
  DATABASE_URL: str('DATABASE_URL', ''),
  SECRET_KEY: str('SECRET_KEY', 'dev-secret-change-me'),
  ACCESS_TOKEN_EXPIRE_MINUTES: int('ACCESS_TOKEN_EXPIRE_MINUTES', 60 * 24),
  JWT_ALGORITHM: 'HS256',

  CORS_ORIGINS: str('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000'),
  TIMEZONE: str('TIMEZONE', 'Africa/Cairo'),

  MAX_ADVANCE_BOOKING_DAYS: int('MAX_ADVANCE_BOOKING_DAYS', 60),
  CANCEL_MIN_HOURS_BEFORE: int('CANCEL_MIN_HOURS_BEFORE', 2),
  AUTO_CONFIRM_APPOINTMENTS: bool('AUTO_CONFIRM_APPOINTMENTS', false),

  CRON_SECRET: str('CRON_SECRET', ''),

  FRONTEND_URL: str('FRONTEND_URL', ''),
  PASSWORD_RESET_EXPIRE_MINUTES: int('PASSWORD_RESET_EXPIRE_MINUTES', 15),
  REMEMBER_ME_EXPIRE_DAYS: int('REMEMBER_ME_EXPIRE_DAYS', 30),

  RESEND_API_KEY: str('RESEND_API_KEY', ''),
  EMAIL_FROM: str('EMAIL_FROM', 'Clinika <onboarding@resend.dev>'),
  CONTACT_RECEIVER_EMAIL: str('CONTACT_RECEIVER_EMAIL', ''),
  // IDs قوالب Resend (اختياري). لو فاضي الإيميل بيتبعت بالـ HTML المدمج في الكود.
  RESEND_TEMPLATE_RESET: str('RESEND_TEMPLATE_RESET', ''),
  RESEND_TEMPLATE_INVITE: str('RESEND_TEMPLATE_INVITE', ''),
  RESEND_TEMPLATE_DOCTOR_APPROVED: str('RESEND_TEMPLATE_DOCTOR_APPROVED', ''),
  RESEND_TEMPLATE_DOCTOR_REJECTED: str('RESEND_TEMPLATE_DOCTOR_REJECTED', ''),
  RESEND_TEMPLATE_APPOINTMENT: str('RESEND_TEMPLATE_APPOINTMENT', ''),

  CLOUDINARY_CLOUD_NAME: str('CLOUDINARY_CLOUD_NAME', ''),
  CLOUDINARY_API_KEY: str('CLOUDINARY_API_KEY', ''),
  CLOUDINARY_API_SECRET: str('CLOUDINARY_API_SECRET', ''),
  MAX_UPLOAD_MB: int('MAX_UPLOAD_MB', 3),

  MIN_BOOKING_NOTICE_MINUTES: int('MIN_BOOKING_NOTICE_MINUTES', 0),
  NEXT_AVAILABLE_HORIZON_DAYS: int('NEXT_AVAILABLE_HORIZON_DAYS', 21),
  ONLINE_MEETING_BASE_URL: str('ONLINE_MEETING_BASE_URL', 'https://meet.jit.si'),

  ADMIN_EMAIL: str('ADMIN_EMAIL', 'admin@clinika.com'),
  ADMIN_PASSWORD: str('ADMIN_PASSWORD', 'Admin@12345'),
};

Object.defineProperties(settings, {
  corsOriginsList: {
    get() {
      return settings.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
    },
  },
  frontendBaseUrl: {
    get() {
      if (settings.FRONTEND_URL) return settings.FRONTEND_URL.replace(/\/+$/, '');
      const o = settings.corsOriginsList;
      return o.length ? o[0].replace(/\/+$/, '') : 'http://localhost:5173';
    },
  },
  cloudinaryEnabled: {
    get() {
      return Boolean(settings.CLOUDINARY_CLOUD_NAME && settings.CLOUDINARY_API_KEY && settings.CLOUDINARY_API_SECRET);
    },
  },
});

module.exports = settings;
