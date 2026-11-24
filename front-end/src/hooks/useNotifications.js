import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteNotification, getUnreadCount, listNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notificationsApi.js';
import { queryKeys } from './queryKeys.js';

export function useNotifications(filters = {}) {
  return useQuery({ queryKey: queryKeys.notifications.list(filters), queryFn: ({ signal }) => listNotifications(filters, signal), refetchInterval: 60 * 1000 });
}
export function useUnreadCount() {
  return useQuery({ queryKey: queryKeys.notifications.unread, queryFn: ({ signal }) => getUnreadCount(signal), refetchInterval: 60 * 1000, staleTime: 30 * 1000 });
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
