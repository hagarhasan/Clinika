import { request } from './client.js';

/** Upload an avatar image and return the backend image metadata. */
export const uploadAvatar = (file) => {
  const body = new FormData();
  body.append('file', file);
  return request('/uploads/avatar', { method: 'POST', body }).then((r) => r.data);
};
export const uploadImage = (file) => {
  const body = new FormData();
  body.append('file', file);
  return request('/uploads/image', { method: 'POST', body }).then((r) => r.data);
};
