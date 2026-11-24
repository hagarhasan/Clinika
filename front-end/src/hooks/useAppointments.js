import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelAppointment, createAppointment, listAppointments, rescheduleAppointment, updateAppointmentStatus, updateMeetingLink, getTodayAppointments } from '../api/appointmentsApi.js';
import { queryKeys } from './queryKeys.js';

export function useAppointments(filters = {}) {
  return useQuery({ queryKey: queryKeys.appointments.list(filters), queryFn: ({ signal }) => listAppointments(filters, signal) });
}
export function useTodayAppointments(filters = {}) {
  return useQuery({ queryKey: queryKeys.appointments.today, queryFn: ({ signal }) => getTodayAppointments(filters, signal) });
}
export function useAppointmentActions() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  };
  return {
    cancel: useMutation({ mutationFn: ({ id, reason }) => cancelAppointment(id, reason ? { reason } : {}), onSuccess: invalidate }),
    reschedule: useMutation({ mutationFn: ({ id, ...body }) => rescheduleAppointment(id, body), onSuccess: invalidate }),
    updateStatus: useMutation({ mutationFn: ({ id, status }) => updateAppointmentStatus(id, { status }), onSuccess: invalidate }),
    updateMeetingLink: useMutation({ mutationFn: ({ id, meeting_link }) => updateMeetingLink(id, { meeting_link }), onSuccess: invalidate }),
  };
}
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.stats });
    },
  });
}
