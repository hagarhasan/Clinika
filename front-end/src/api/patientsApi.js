import { request } from './client.js';

export const getMyProfile = (signal) => request('/patients/me', { signal }).then((r) => r.data);
export const updateMyProfile = (body) => request('/patients/me', { method: 'PUT', body }).then((r) => r.data);
export const getMyStats = (signal) => request('/patients/me/stats', { signal }).then((r) => r.data);
export const fetchStats = getMyStats;
export const fetchProfile = getMyProfile;
export const updateProfile = updateMyProfile;
export const listPatients = (params = {}, signal) => request('/patients', { params, signal });
export const getPatient = (id, signal) => request(`/patients/${id}`, { signal }).then((r) => r.data);
