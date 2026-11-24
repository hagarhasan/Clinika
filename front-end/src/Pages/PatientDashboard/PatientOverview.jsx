import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import AppointmentCard from '../../Components/Patient/AppointmentCard';
import NotificationItem from '../../Components/Patient/NotificationItem';
import { EmptyState, ErrorState, LoadingState } from '../../Components/Patient/StateViews';
import { useQueryClient } from '@tanstack/react-query';
import { usePatientStats } from '../../hooks/usePatientStats';
import { useNotifications } from '../../hooks/useNotifications';
import { queryKeys } from '../../hooks/queryKeys';
import './patient-pages.css';

const STAT_CARDS = [
  { key: 'upcoming', label: 'Upcoming', icon: 'event_upcoming' },
  { key: 'completed', label: 'Completed', icon: 'task_alt' },
  { key: 'cancelled', label: 'Cancelled', icon: 'event_busy' },
  { key: 'total', label: 'Total visits', icon: 'calendar_month' },
];

export default function PatientOverview() {
  const statsQuery = usePatientStats();
  const notificationsQuery = useNotifications({ limit: 3 });
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState('');
  const stateStatus = statsQuery.isLoading ? 'loading' : statsQuery.isError ? 'error' : 'ready';

  // After a cancel from this page: show a message and reload quietly.
  function handleCancelled(message) {
    setNotice(message);
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.stats });
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
  }

  const stats = statsQuery.data || {};
  const notifications = notificationsQuery.data?.data || [];

  return (
    <>
      <Helmet>
        <title>Overview | Clinika</title>
      </Helmet>

      <header className="cl-pd-page-head">
        <h1>Overview</h1>
        <p className="cl-pd-muted">A quick look at your visits and latest updates.</p>
      </header>

      {stateStatus === 'loading' && <LoadingState label="Loading your overview…" />}

      {stateStatus === 'error' && (
        <ErrorState message={statsQuery.error?.message || 'Could not load your overview.'} onRetry={() => statsQuery.refetch()} needsLogin={statsQuery.error?.status === 401} />
      )}

      {stateStatus === 'ready' && (
        <>
          {notice && (
            <div className="cl-pd-notice" role="status">
              {notice}
            </div>
          )}

          <ul className="cl-pd-stats">
            {STAT_CARDS.map(({ key, label, icon }) => (
              <li key={key} className="cl-pd-card cl-pd-stat">
                <span className="material-symbols-outlined cl-pd-stat__icon" aria-hidden="true">{icon}</span>
                <span className="cl-pd-stat__value">{stats[key] ?? 0}</span>
                <span className="cl-pd-muted">{label}</span>
              </li>
            ))}
          </ul>

          <section className="cl-pd-section" aria-labelledby="cl-pd-next-title">
            <div className="cl-pd-section__head">
              <h2 id="cl-pd-next-title">Your next appointment</h2>
              <Link className="cl-pd-link" to="/patient-dashboard/my-appointments">View all</Link>
            </div>
            {stats.next_appointment ? (
              <AppointmentCard appointment={stats.next_appointment} onCancelled={handleCancelled} />
            ) : (
              <EmptyState
                title="No upcoming appointments"
                text="When you book a visit, it will show up here."
                actionLabel="Find a doctor"
                actionTo="/doctors"
              />
            )}
          </section>

          <section className="cl-pd-section" aria-labelledby="cl-pd-latest-title">
            <div className="cl-pd-section__head">
              <h2 id="cl-pd-latest-title">Latest notifications</h2>
              <Link className="cl-pd-link" to="/patient-dashboard/notifications">View all</Link>
            </div>
            {notifications.length === 0 ? (
              <p className="cl-pd-muted">You have no notifications yet.</p>
            ) : (
              <ul className="cl-pd-list cl-pd-list--plain">
                {notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
