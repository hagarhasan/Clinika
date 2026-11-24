import { request } from './client.js';

/** @param {Record<string, unknown>} body @returns {Promise<any>} */
export const register = (body) => request('/auth/register', { method: 'POST', body }).then((r) => r.data);
/** @param {Record<string, unknown>} body @returns {Promise<any>} */
export const registerDoctor = (body) => request('/auth/register/doctor', { method: 'POST', body }).then((r) => r.data);
/** @param {Record<string, unknown>} body @returns {Promise<any>} */
export const login = (body) => request('/auth/login', { method: 'POST', body }).then((r) => r.data);
export const getMe = (signal) => request('/auth/me', { signal }).then((r) => r.data);
export const updateMe = (body) => request('/auth/me', { method: 'PUT', body }).then((r) => r.data);
export const changePassword = (body, newPassword) => {
  const payload = typeof body === 'string'
    ? { current_password: body, new_password: newPassword }
    : body;
  return request('/auth/change-password', { method: 'POST', body: payload }).then((r) => r.data);
};
export const forgotPassword = (body) => request('/auth/forgot-password', { method: 'POST', body }).then((r) => r.data);
export const validateResetToken = (token, signal) => request('/auth/reset-password/validate', { params: { token }, signal }).then((r) => r.data);
export const resetPassword = (body) => request('/auth/reset-password', { method: 'POST', body }).then((r) => r.data);
