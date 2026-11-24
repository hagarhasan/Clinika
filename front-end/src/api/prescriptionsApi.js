import { request } from './client.js';

export const createPrescription = (body) => request('/prescriptions', { method: 'POST', body }).then((r) => r.data);
export const listPrescriptions = (params = {}, signal) => request('/prescriptions', { params, signal });
export const fetchPrescriptions = () => listPrescriptions({ limit: 50 }).then((r) => r.data);
export const getPrescription = (id, signal) => request(`/prescriptions/${id}`, { signal }).then((r) => r.data);
