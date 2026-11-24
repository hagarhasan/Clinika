import { request } from './client.js';

export const listNotifications = (params = {}, signal) => request('/notifications', { params, signal });
export const fetchNotifications = (limit = 100) => listNotifications({ limit }).then((r) => r.data);
export const getUnreadCount = (signal) => request('/notifications/unread-count', { signal }).then((r) => r.data);
export const fetchUnreadCount = (signal) => getUnreadCount(signal).then((data) => data?.unread ?? data ?? 0);
export const UNREAD_EVENT = 'cl-pd-unread-changed';
export const refreshUnreadBadge = () => window.dispatchEvent(new Event(UNREAD_EVENT));
export const markAllNotificationsRead = () => request('/notifications/read-all', { method: 'PATCH' }).then((r) => r.data);
export const markNotificationRead = (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }).then((r) => r.data);
export const deleteNotification = (id) => request(`/notifications/${id}`, { method: 'DELETE' }).then((r) => r.data);
