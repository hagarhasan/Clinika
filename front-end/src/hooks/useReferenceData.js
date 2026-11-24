import { useQuery } from '@tanstack/react-query';
import { listSpecialties } from '../api/specialtiesApi.js';
import { listClinics } from '../api/clinicsApi.js';
import { getPublicLocations, getPublicStats } from '../api/publicApi.js';
import { queryKeys } from './queryKeys.js';

export function useSpecialties(params = {}) {
  return useQuery({ queryKey: [...queryKeys.specialties, params], queryFn: ({ signal }) => listSpecialties(params, signal), staleTime: 5 * 60 * 1000 });
}
export function useClinics(params = {}) {
  return useQuery({ queryKey: [...queryKeys.clinics, params], queryFn: ({ signal }) => listClinics(params, signal), staleTime: 5 * 60 * 1000 });
}
export function usePublicLocations() {
  return useQuery({ queryKey: queryKeys.public.locations, queryFn: ({ signal }) => getPublicLocations(signal), staleTime: 5 * 60 * 1000 });
}
export function usePublicStats() {
  return useQuery({ queryKey: queryKeys.public.stats, queryFn: ({ signal }) => getPublicStats(signal), staleTime: 5 * 60 * 1000 });
}
