import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import AppointmentCard from '../../Components/Patient/AppointmentCard';
import { EmptyState, ErrorState, LoadingState } from '../../Components/Patient/StateViews';
import { useQueryClient } from '@tanstack/react-query';
import { useAppointments } from '../../hooks/useAppointments';
import { queryKeys } from '../../hooks/queryKeys';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past consultations' },
];

export default function PatientAppointments() {
  const [tab, setTab] = useState('upcoming');
  const [notice, setNotice] = useState('');
  const queryClient = useQueryClient();
  const appointmentsQuery = useAppointments({ upcoming: tab === 'upcoming', limit: 50 });
  const items = appointmentsQuery.data?.data || [];

  function changeTab(next) {
    if (next === tab) return;
    setNotice('');
    setTab(next);
  }

  // After a successful cancel: show a message and reload quietly (no spinner flash).
  function handleCancelled(message) {
    setNotice(message);
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.stats });
  }

  return (
    <>
      <Helmet>
        <title>My Appointments | Clinika</title>
      </Helmet>

      <header className="cl-pd-page-head">
        <h1>My Appointments</h1>
        <p className="cl-pd-muted">Review your visits and manage the ones that are coming up.</p>
      </header>

      <div className="cl-pd-tabs" role="tablist" aria-label="Appointment lists">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`cl-pd-tab ${tab === key ? 'is-active' : ''}`}
            onClick={() => changeTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="cl-pd-notice" role="status">
          {notice}
        </div>
      )}

      {appointmentsQuery.isLoading && <LoadingState label="Loading your appointments…" />}

      {appointmentsQuery.isError && (
        <ErrorState message={appointmentsQuery.error?.message || 'Could not load appointments.'} onRetry={() => appointmentsQuery.refetch()} needsLogin={appointmentsQuery.error?.status === 401} />
      )}

      {!appointmentsQuery.isLoading && !appointmentsQuery.isError && items.length === 0 && (
        <EmptyState
          title={tab === 'upcoming' ? 'No upcoming appointments' : 'No past consultations yet'}
          text={
            tab === 'upcoming'
              ? 'When you book a visit, it will show up here.'
              : 'Completed and past visits will be listed here.'
          }
          actionLabel={tab === 'upcoming' ? 'Find a doctor' : undefined}
          actionTo={tab === 'upcoming' ? '/doctors' : undefined}
        />
      )}

      {!appointmentsQuery.isLoading && !appointmentsQuery.isError && items.length > 0 && (
        <div className="cl-pd-list">
          {items.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} onCancelled={handleCancelled} />
          ))}
        </div>
      )}

      <aside className="cl-pd-card cl-pd-policy">
        <h2>Cancellation policy</h2>
        <p className="cl-pd-muted">
          You can cancel a pending or confirmed appointment up to 2 hours before it starts.
          Closer than that, the system will not allow it.
        </p>
      </aside>
    </>
  );
}
