import { request } from './client.js';

export const createAppointment = (body) => request('/appointments', { method: 'POST', body }).then((r) => r.data);
export const listAppointments = (params = {}, signal) => request('/appointments', { params, signal });
export const fetchAppointments = (upcoming) => listAppointments({ upcoming, limit: 50 }).then((r) => r.data);
export const getTodayAppointments = (params = {}, signal) => request('/appointments/today', { params, signal });
export const getAppointment = (id, signal) => request(`/appointments/${id}`, { signal }).then((r) => r.data);
export const updateMeetingLink = (id, body) => request(`/appointments/${id}/meeting-link`, { method: 'PATCH', body }).then((r) => r.data);
export const cancelAppointment = (id, body = {}) => request(`/appointments/${id}/cancel`, { method: 'PATCH', body }).then((r) => r.data);
export const rescheduleAppointment = (id, body) => request(`/appointments/${id}/reschedule`, { method: 'PATCH', body }).then((r) => r.data);
export const updateAppointmentStatus = (id, body) => request(`/appointments/${id}/status`, { method: 'PATCH', body }).then((r) => r.data);
