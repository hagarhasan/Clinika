import axios from 'axios';

// Patient-only API helper.
// Kept inside the PatientDashboard folder on purpose, so no shared file has to change
// until the team agrees on one shared API client. Swapping it later is a one-line change.
const api = axios.create({ baseURL: 'https://clinika-backend.vercel.app' });

// Attach the login token to every request (same 'token' key the API guide describes).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const isUnauthorized = (error) => error?.response?.status === 401;

// Turns any axios error into one short, friendly sentence for the patient.
export function getErrorMessage(error) {
  if (!error?.response) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  if (isUnauthorized(error)) {
    return 'Your session has expired. Please log in again.';
  }
  const detail = error.response.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return 'Something went wrong. Please try again.';
}

// GET /appointments returns only the logged-in patient's appointments.
// upcoming=true  -> today and later, soonest first
// upcoming=false -> before today, newest first
export const fetchAppointments = (upcoming) =>
  api.get('/appointments', { params: { upcoming, limit: 50 } }).then((res) => res.data);

// PATCH /appointments/{id}/cancel — the reason is optional.
export const cancelAppointment = (id, reason) =>
  api.patch(`/appointments/${id}/cancel`, reason ? { reason } : {}).then((res) => res.data);

// GET /notifications/unread-count -> { unread: number }
export const fetchUnreadCount = () =>
  api.get('/notifications/unread-count').then((res) => res.data.unread);

// GET /patients/me/stats -> { upcoming, completed, cancelled, total, next_appointment }
export const fetchStats = () => api.get('/patients/me/stats').then((res) => res.data);

// GET /notifications -> [{ id, title, message, type, is_read, created_at }], newest first
export const fetchNotifications = (limit = 100) =>
  api.get('/notifications', { params: { limit } }).then((res) => res.data);

export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read`).then((res) => res.data);

export const markAllNotificationsRead = () => api.patch('/notifications/read-all');

export const deleteNotification = (id) => api.delete(`/notifications/${id}`);

// Tells the sidebar to re-fetch its unread badge (used after read / delete actions).
export const UNREAD_EVENT = 'cl-pd-unread-changed';
export const refreshUnreadBadge = () => window.dispatchEvent(new Event(UNREAD_EVENT));

// GET /medical-records -> diagnosis, symptoms, treatment_plan, notes, follow_up_date, doctor
export const fetchMedicalRecords = () =>
  api.get('/medical-records', { params: { limit: 50 } }).then((res) => res.data);

// GET /prescriptions -> each one has items: medication_name, dosage, frequency, duration, instructions
export const fetchPrescriptions = () =>
  api.get('/prescriptions', { params: { limit: 50 } }).then((res) => res.data);

// GET /patients/me -> name, phone, avatar_url, date_of_birth, gender, blood_type, address, ...
export const fetchProfile = () => api.get('/patients/me').then((res) => res.data);

// PUT /patients/me — send every editable field; an empty value clears it.
export const updateProfile = (data) => api.put('/patients/me', data).then((res) => res.data);

// POST /uploads/avatar — multipart, field name "file", image only.
export const uploadAvatar = (file) => {
  const body = new FormData();
  body.append('file', file);
  return api.post('/uploads/avatar', body).then((res) => res.data);
};

// POST /auth/change-password -> { access_token }. The old token stops working right away.
export const changePassword = (current_password, new_password) =>
  api.post('/auth/change-password', { current_password, new_password }).then((res) => res.data);

export default api;
