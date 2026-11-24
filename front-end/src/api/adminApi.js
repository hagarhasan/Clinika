import axios from 'axios';

// One place for the backend URL. Set VITE_API_URL in a .env file to point somewhere else.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://clinika-backend.vercel.app';

export const TOKEN_KEY = 'token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || localStorage.getItem('access_token') || '';

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

// Axios client used by every admin page. It attaches the login token to each request.
const adminApi = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

adminApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const isUnauthorized = (error) => error?.response?.status === 401;
export const isForbidden = (error) => error?.response?.status === 403;

// Turns any axios error into one short sentence that is safe to show in the UI.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.code === 'ECONNABORTED') return 'The server took too long to answer. Please try again.';
  if (!error?.response) return 'Cannot reach the server. Check your connection and try again.';
  if (isUnauthorized(error)) return 'Your session has expired. Please log in again.';
  if (isForbidden(error)) return error.response.data?.detail || 'You do not have permission to do this.';
  const detail = error.response.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg).replace(/^Value error,\s*/i, '');
  return fallback;
}

// Reads the X-Total-Count header the backend sends on list endpoints.
export const totalFrom = (response, fallback = 0) => {
  const value = Number(response?.headers?.['x-total-count']);
  return Number.isFinite(value) ? value : fallback;
};

export default adminApi;
