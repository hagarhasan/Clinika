import { request } from './client.js';

export const createReview = (body) => request('/reviews', { method: 'POST', body }).then((r) => r.data);
