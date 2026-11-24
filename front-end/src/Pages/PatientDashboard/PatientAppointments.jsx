import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import AppointmentCard from '../../Components/Patient/AppointmentCard';
import { EmptyState, ErrorState, LoadingState } from '../../Components/Patient/StateViews';
import { fetchAppointments, getErrorMessage, isUnauthorized } from './patientApi';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past consultations' },
];

const LOADING = { status: 'loading', items: [], error: '', needsLogin: false };

export default function PatientAppointments() {
  const [tab, setTab] = useState('upcoming');
  const [state, setState] = useState(LOADING);
  const [attempt, setAttempt] = useState(0); // bump this number to reload the list
  const [notice, setNotice] = useState('');

  // Load the list whenever the tab changes or we ask for a reload.
  useEffect(() => {
    let ignore = false;
    fetchAppointments(tab === 'upcoming')
      .then((items) => {
        if (!ignore) setState({ status: 'ready', items, error: '', needsLogin: false });
      })
      .catch((err) => {
        if (!ignore) {
          setState({ status: 'error', items: [], error: getErrorMessage(err), needsLogin: isUnauthorized(err) });
        }
      });
    return () => {
      ignore = true;
    };
  }, [tab, attempt]);

  function changeTab(next) {
    if (next === tab) return;
    setNotice('');
    setState(LOADING);
    setTab(next);
  }

  function retry() {
    setState(LOADING);
    setAttempt((value) => value + 1);
  }

  // After a successful cancel: show a message and reload quietly (no spinner flash).
  function handleCancelled(message) {
    setNotice(message);
    setAttempt((value) => value + 1);
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

      {state.status === 'loading' && <LoadingState label="Loading your appointments…" />}

      {state.status === 'error' && (
        <ErrorState message={state.error} onRetry={retry} needsLogin={state.needsLogin} />
      )}

      {state.status === 'ready' && state.items.length === 0 && (
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

      {state.status === 'ready' && state.items.length > 0 && (
        <div className="cl-pd-list">
          {state.items.map((appointment) => (
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
