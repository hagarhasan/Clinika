import { useQuery } from '@tanstack/react-query';
import { getMyStats, getMyProfile } from '../api/patientsApi.js';
import { queryKeys } from './queryKeys.js';

export function usePatientStats() {
  return useQuery({ queryKey: queryKeys.patients.stats, queryFn: ({ signal }) => getMyStats(signal) });
}
export function usePatientProfile() {
  return useQuery({ queryKey: queryKeys.patients.profile, queryFn: ({ signal }) => getMyProfile(signal) });
}
