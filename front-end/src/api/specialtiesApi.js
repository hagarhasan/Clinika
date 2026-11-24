import { request } from './client.js';

export const listSpecialties = (params = {}, signal) => request('/specialties', { params, signal });
export const createSpecialty = (body) => request('/specialties', { method: 'POST', body }).then((r) => r.data);
export const updateSpecialty = (id, body) => request(`/specialties/${id}`, { method: 'PUT', body }).then((r) => r.data);
export const deleteSpecialty = (id) => request(`/specialties/${id}`, { method: 'DELETE' }).then((r) => r.data);
