const BASE_URL = import.meta.env.VITE_API_URL || 'https://clinika-backend.vercel.app';
export const TOKEN_KEY = 'token';
export const AUTH_UNAUTHORIZED_EVENT = 'clinika:unauthorized';
export const getToken = () => localStorage.getItem(TOKEN_KEY) || localStorage.getItem('access_token') || '';

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

export class ApiError extends Error {
  constructor(status, message, detail) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export const isUnauthorized = (error) => error?.status === 401;
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => error?.message || fallback;

let handlingUnauthorized = false;

function normalizeDetail(detail, fallback) {
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.msg) return String(item.msg).replace(/^Value error,\s*/i, '');
        return '';
      })
      .filter(Boolean);
    if (messages.length) return messages.join('. ');
  }
  return fallback;
}

export async function request(path, options = {}) {
  const { signal, headers, params, body, timeout, ...rest } = options;
  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const token = getToken();
  const requestHeaders = new Headers(headers || {});
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);

  let requestBody = body;
  if (body && !(body instanceof FormData) && typeof body !== 'string') {
    requestHeaders.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  const controller = new AbortController();
  const abortHandler = () => controller.abort();
  signal?.addEventListener('abort', abortHandler, { once: true });

  let timeoutId;
  if (timeout) timeoutId = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetch(url, { ...rest, method: rest.method || 'GET', headers: requestHeaders, body: requestBody, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError' && signal?.aborted) throw error;
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortHandler);
  }

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !handlingUnauthorized) {
      handlingUnauthorized = true;
      clearSession();
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
      setTimeout(() => { handlingUnauthorized = false; }, 1000);
    }

    const detail = payload?.detail;
    const fallback = response.status === 403
      ? 'You do not have permission to do this.'
      : 'Something went wrong. Please try again.';
    throw new ApiError(response.status, normalizeDetail(detail, fallback), detail);
  }

  const totalHeader = response.headers.get('x-total-count');
  const total = totalHeader === null ? undefined : Number(totalHeader);

  return {
    data: payload,
    total: Number.isFinite(total) ? total : undefined,
  };
}
