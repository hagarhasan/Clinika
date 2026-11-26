import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteNotification, getUnreadCount, listNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notificationsApi.js';
import { getToken } from '../api/client.js';
import { queryKeys } from './queryKeys.js';

export function useNotifications(filters = {}, options = {}) {
  const token = getToken();
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: ({ signal }) => listNotifications(filters, signal),
    enabled: Boolean(token) && (options.enabled ?? true),
    refetchInterval: 60 * 1000,
  });
}
export function useUnreadCount(options = {}) {
  const token = getToken();
  return useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: ({ signal }) => getUnreadCount(signal),
    enabled: Boolean(token) && (options.enabled ?? true),
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });
}
export function useNotificationActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  };
  return {
    markRead: useMutation({ mutationFn: markNotificationRead, onSuccess: refresh }),
    markAllRead: useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh }),
    remove: useMutation({ mutationFn: deleteNotification, onSuccess: refresh }),
  };
}
