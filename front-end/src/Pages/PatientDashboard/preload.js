import { getMyProfile, getMyStats } from '../../api/patientsApi.js';
import { listAppointments } from '../../api/appointmentsApi.js';
import { getUnreadCount, listNotifications } from '../../api/notificationsApi.js';
import { fetchMedicalRecords } from '../../api/medicalRecordsApi.js';
import { fetchPrescriptions } from '../../api/prescriptionsApi.js';
import { queryKeys } from '../../hooks/queryKeys.js';
import { MY_PRESCRIPTIONS_KEY, MY_RECORDS_KEY } from '../../hooks/usePatientData.js';

// Page code (lazy chunks) the patient dashboard can open.
const loadPages = () => [
  import('./PatientOverview'),
  import('./PatientAppointments'),
  import('./PatientMedicalRecords'),
  import('./PatientProfile'),
  import('../Shared/NotificationsPage'),
];

/**
 * Everything the patient dashboard pages read. The query keys and arguments MUST match
 * what each page uses, otherwise the page would fetch again.
 */
export function prefetchPatientDashboard(queryClient) {
  const prefetch = (queryKey, queryFn) => queryClient.prefetchQuery({ queryKey, queryFn });
  return [
    ...loadPages(),
    prefetch(queryKeys.patients.profile, ({ signal }) => getMyProfile(signal)),
    prefetch(queryKeys.patients.stats, ({ signal }) => getMyStats(signal)),
    prefetch(queryKeys.notifications.unread, ({ signal }) => getUnreadCount(signal)),
    prefetch(queryKeys.notifications.list({ limit: 3 }), ({ signal }) => listNotifications({ limit: 3 }, signal)),
    prefetch(queryKeys.notifications.list({}), ({ signal }) => listNotifications({}, signal)),
    prefetch(queryKeys.appointments.list({ upcoming: true, limit: 50 }), ({ signal }) => listAppointments({ upcoming: true, limit: 50 }, signal)),
    prefetch(queryKeys.appointments.list({ upcoming: false, limit: 50 }), ({ signal }) => listAppointments({ upcoming: false, limit: 50 }, signal)),
    prefetch(MY_RECORDS_KEY, () => fetchMedicalRecords()),
    prefetch(MY_PRESCRIPTIONS_KEY, () => fetchPrescriptions()),
  ];
}
