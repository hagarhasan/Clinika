import { request } from './client.js';

export const listClinics = (params = {}, signal) => request('/clinics', { params, signal });
export const createClinic = (body) => request('/clinics', { method: 'POST', body }).then((r) => r.data);
export const updateClinic = (id, body) => request(`/clinics/${id}`, { method: 'PUT', body }).then((r) => r.data);
export const deleteClinic = (id) => request(`/clinics/${id}`, { method: 'DELETE' }).then((r) => r.data);
