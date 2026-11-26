import { useQuery } from '@tanstack/react-query';
import { fetchMedicalRecords } from '../api/medicalRecordsApi.js';
import { fetchPrescriptions } from '../api/prescriptionsApi.js';
import { queryKeys } from './queryKeys.js';

export const MY_RECORDS_KEY = [...queryKeys.records, 'mine'];
export const MY_PRESCRIPTIONS_KEY = [...queryKeys.prescriptions, 'mine'];

/** The logged-in patient's medical records. */
export function useMyMedicalRecords() {
  return useQuery({ queryKey: MY_RECORDS_KEY, queryFn: () => fetchMedicalRecords() });
}

/** The logged-in patient's prescriptions. */
export function useMyPrescriptions() {
  return useQuery({ queryKey: MY_PRESCRIPTIONS_KEY, queryFn: () => fetchPrescriptions() });
}
