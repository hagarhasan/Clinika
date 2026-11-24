import { request } from './client.js';

export const createMedicalRecord = (body) => request('/medical-records', { method: 'POST', body }).then((r) => r.data);
export const listMedicalRecords = (params = {}, signal) => request('/medical-records', { params, signal });
export const fetchMedicalRecords = () => listMedicalRecords({ limit: 50 }).then((r) => r.data);
export const getMedicalRecord = (id, signal) => request(`/medical-records/${id}`, { signal }).then((r) => r.data);
export const updateMedicalRecord = (id, body) => request(`/medical-records/${id}`, { method: 'PUT', body }).then((r) => r.data);
