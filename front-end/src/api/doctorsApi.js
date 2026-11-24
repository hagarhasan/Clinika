import { request } from './client.js';

/** @returns {Promise<{data:any[],total?:number}>} */
export const listDoctors = (params = {}, signal) => request('/doctors', { params, signal });
export const getDoctor = (id, signal) => request(`/doctors/${id}`, { signal }).then((r) => r.data);
export const getMyDoctorProfile = (signal) => request('/doctors/me/profile', { signal }).then((r) => r.data);
export const getDoctorStats = (signal) => request('/doctors/me/stats', { signal }).then((r) => r.data);
export const createDoctor = (body) => request('/doctors', { method: 'POST', body }).then((r) => r.data);
export const updateDoctor = (id, body) => request(`/doctors/${id}`, { method: 'PUT', body }).then((r) => r.data);
export const deleteDoctor = (id) => request(`/doctors/${id}`, { method: 'DELETE' }).then((r) => r.data);
export const getCredentials = (id, signal) => request(`/doctors/${id}/credentials`, { signal }).then((r) => r.data);
export const updateCredentials = (id, body) => request(`/doctors/${id}/credentials`, { method: 'PUT', body }).then((r) => r.data);
export const getSlots = (id, date, params = {}, signal) => request(`/doctors/${id}/slots`, { params: { date, ...params }, signal }).then((r) => r.data);
export const getAvailability = (id, signal) => request(`/doctors/${id}/availability`, { signal }).then((r) => r.data);
export const getSchedules = (id, signal) => request(`/doctors/${id}/schedules`, { signal }).then((r) => r.data);
export const updateSchedules = (id, body) => request(`/doctors/${id}/schedules`, { method: 'PUT', body }).then((r) => r.data);
export const getTimeOff = (id, signal) => request(`/doctors/${id}/time-off`, { signal }).then((r) => r.data);
export const addTimeOff = (id, body) => request(`/doctors/${id}/time-off`, { method: 'POST', body }).then((r) => r.data);
export const deleteTimeOff = (id, offId) => request(`/doctors/${id}/time-off/${offId}`, { method: 'DELETE' }).then((r) => r.data);
export const getReviews = (id, signal) => request(`/doctors/${id}/reviews`, { signal }).then((r) => r.data);
