import { request } from './client.js';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://clinika-backend.vercel.app';
export { clearSession, getToken, TOKEN_KEY } from './client.js';
export const isUnauthorized = (error) => error?.status === 401;
export const isForbidden = (error) => error?.status === 403;
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => error?.message || fallback;
export const totalFrom = (response, fallback = 0) => Number.isFinite(response?.total) ? response.total : fallback;

const adminApi = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET', params: options.params }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
};

export default adminApi;

export const getAdminStats = (signal) => request('/admin/stats', { signal }).then((r) => r.data);
export const getAppointmentReports = (params = {}, signal) => request('/admin/reports/appointments', { params, signal });
export const listAdminUsers = (params = {}, signal) => request('/admin/users', { params, signal });
export const createAdminUser = (body) => request('/admin/users', { method: 'POST', body }).then((r) => r.data);
export const updateAdminUserStatus = (id, body) => request(`/admin/users/${id}/status`, { method: 'PATCH', body }).then((r) => r.data);
export const listAuditLogs = (params = {}, signal) => request('/admin/audit-logs', { params, signal });
export const listAdminDoctors = (params = {}, signal) => request('/admin/doctors', { params, signal });
export const getAdminDoctorCounts = (signal) => request('/admin/doctors/counts', { signal }).then((r) => r.data);
export const exportAdminDoctors = (params = {}) => request('/admin/doctors/export', { params });
export const getAdminDoctor = (id, signal) => request(`/admin/doctors/${id}`, { signal }).then((r) => r.data);
export const reviewAdminDoctor = (id, body) => request(`/admin/doctors/${id}/review`, { method: 'PATCH', body }).then((r) => r.data);
export const verifyAdminDoctor = (id, body) => request(`/admin/doctors/${id}/verify`, { method: 'PATCH', body }).then((r) => r.data);
export const createAdminPatient = (body) => request('/admin/patients', { method: 'POST', body }).then((r) => r.data);
export const createAdminAppointment = (body) => request('/admin/appointments', { method: 'POST', body }).then((r) => r.data);
export const getAdminActivity = (params = {}, signal) => request('/admin/activity', { params, signal }).then((r) => r.data);
export const listContactMessages = (params = {}, signal) => request('/admin/contact-messages', { params, signal });
export const updateContactMessage = (id, body) => request(`/admin/contact-messages/${id}`, { method: 'PATCH', body }).then((r) => r.data);
