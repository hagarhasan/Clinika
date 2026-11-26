import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMedicalRecord, listMedicalRecords } from '../api/medicalRecordsApi.js';
import { createPrescription, listPrescriptions } from '../api/prescriptionsApi.js';
import { createReview } from '../api/reviewsApi.js';
import { addTimeOff, deleteTimeOff, updateCredentials } from '../api/doctorsApi.js';
import { queryKeys } from './queryKeys.js';

/** Medical records of one patient, as seen by a doctor (`patient_id` is required by the backend for doctors). */
export function usePatientRecords(patientId) {
  return useQuery({
    queryKey: [...queryKeys.records, 'patient', patientId],
    queryFn: ({ signal }) => listMedicalRecords({ patient_id: patientId, limit: 50 }, signal),
    enabled: Boolean(patientId),
  });
}

/** Prescriptions of one patient, as seen by a doctor. */
export function usePatientPrescriptions(patientId) {
  return useQuery({
    queryKey: [...queryKeys.prescriptions, 'patient', patientId],
    queryFn: ({ signal }) => listPrescriptions({ patient_id: patientId, limit: 50 }, signal),
    enabled: Boolean(patientId),
  });
}

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMedicalRecord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.records }),
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPrescription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.prescriptions }),
  });
}

/** Patient reviews a completed appointment. */
export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.doctors.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.stats });
    },
  });
}

/** Add / remove doctor time-off periods. */
export function useTimeOffActions(doctorId) {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.doctors.timeOff(doctorId) });
    queryClient.invalidateQueries({ queryKey: ['doctors', 'slots'] });
    queryClient.invalidateQueries({ queryKey: ['doctors', 'availability'] });
  };
  return {
    add: useMutation({ mutationFn: (body) => addTimeOff(doctorId, body), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (offId) => deleteTimeOff(doctorId, offId), onSuccess: refresh }),
  };
}

/** Replace the full credentials list of a doctor (backend PUT replaces everything). */
export function useUpdateCredentials(doctorId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items) => updateCredentials(doctorId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doctors.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.doctors.detail(doctorId) });
    },
  });
}
