import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAvailability, getDoctor, getDoctorStats, getMyDoctorProfile, getReviews, getSchedules, getSlots, getTimeOff, listDoctors, updateSchedules } from '../api/doctorsApi.js';
import { queryKeys } from './queryKeys.js';

export function useDoctors(filters = {}) {
  return useQuery({ queryKey: queryKeys.doctors.list(filters), queryFn: ({ signal }) => listDoctors(filters, signal) });
}
export function useDoctor(id) {
  return useQuery({ queryKey: queryKeys.doctors.detail(id), queryFn: ({ signal }) => getDoctor(id, signal), enabled: Boolean(id) });
}
export function useDoctorProfile() {
  return useQuery({ queryKey: queryKeys.doctors.profile, queryFn: ({ signal }) => getMyDoctorProfile(signal) });
}
export function useDoctorStats() {
  return useQuery({ queryKey: queryKeys.doctors.stats, queryFn: ({ signal }) => getDoctorStats(signal) });
}
export function useDoctorSlots(id, date) {
  return useQuery({ queryKey: queryKeys.doctors.slots(id, date), queryFn: ({ signal }) => getSlots(id, date, {}, signal), enabled: Boolean(id && date) });
}
export function useDoctorAvailability(id) {
  return useQuery({ queryKey: ['doctors', 'availability', id], queryFn: ({ signal }) => getAvailability(id, signal), enabled: Boolean(id) });
}
export function useDoctorSchedules(id) {
  return useQuery({ queryKey: queryKeys.doctors.schedules(id), queryFn: ({ signal }) => getSchedules(id, signal), enabled: Boolean(id) });
}
export function useUpdateDoctorSchedules(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => updateSchedules(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.doctors.schedules(id) }),
  });
}
export function useDoctorTimeOff(id) {
  return useQuery({ queryKey: queryKeys.doctors.timeOff(id), queryFn: ({ signal }) => getTimeOff(id, signal), enabled: Boolean(id) });
}
export function useDoctorReviews(id) {
  return useQuery({ queryKey: queryKeys.doctors.reviews(id), queryFn: ({ signal }) => getReviews(id, signal), enabled: Boolean(id) });
}
