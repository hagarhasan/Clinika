'use strict';
const express = require('express');
const cors = require('cors');
const settings = require('./config');
const { HttpError, ValidationError } = require('./errors');

if (settings.SECRET_KEY === 'dev-secret-change-me' || settings.ADMIN_PASSWORD === 'Admin@12345') {
  console.warn('SECRET_KEY / ADMIN_PASSWORD are still the default values. Set real ones in the environment variables.');
}

const app = express();
app.disable('x-powered-by');
app.set('etag', false); // FastAPI مكانش بيبعت ETag
app.set('trust proxy', true);

app.use(
  cors({
    origin: settings.corsOriginsList,
    credentials: true,
    exposedHeaders: ['X-Total-Count'], // عشان الفرونت يقرا العدد الكلي للـ pagination
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/', (_req, res) => res.json({ name: settings.APP_NAME, status: 'running', docs: '/docs' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', require('./routes/auth'));
app.use('/specialties', require('./routes/specialties'));
app.use('/clinics', require('./routes/clinics'));
app.use('/doctors', require('./routes/doctors'));
app.use('/patients', require('./routes/patients'));
app.use('/appointments', require('./routes/appointments'));
app.use('/medical-records', require('./routes/medicalRecords'));
app.use('/prescriptions', require('./routes/prescriptions'));
app.use('/notifications', require('./routes/notifications'));
app.use('/reviews', require('./routes/reviews'));
app.use('/admin', require('./routes/admin'));
app.use('/uploads', require('./routes/uploads'));
app.use('/internal', require('./routes/internal'));
app.use('/', require('./routes/docs')); // /docs و /openapi.json
app.use('/', require('./routes/public')); // /public/stats /public/locations /contact

app.use((_req, res) => res.status(404).json({ detail: 'Not Found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) {
    if (err.headers) res.set(err.headers);
    return res.status(err.status).json({ detail: err.detail });
  }
  if (err instanceof ValidationError) return res.status(422).json({ detail: err.detail });
  if (err && err.type === 'entity.parse.failed') {
    return res.status(422).json({ detail: [{ type: 'json_invalid', loc: ['body', 0], msg: 'JSON decode error' }] });
  }
  if (err && err.type === 'entity.too.large') return res.status(413).json({ detail: 'Request body too large' });
  console.error(err);
  return res.status(500).json({ detail: 'Internal server error' });
});

module.exports = app;
