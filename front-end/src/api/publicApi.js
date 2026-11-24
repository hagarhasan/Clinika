import { request } from './client.js';

export const getPublicStats = (signal) => request('/public/stats', { signal }).then((r) => r.data);
export const getPublicLocations = (signal) => request('/public/locations', { signal }).then((r) => r.data);
export const submitContact = (body) => request('/contact', { method: 'POST', body }).then((r) => r.data);
