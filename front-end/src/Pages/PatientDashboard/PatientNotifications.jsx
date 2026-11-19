import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import NotificationItem from '../../Components/Patient/NotificationItem';
import { EmptyState, ErrorState, LoadingState } from '../../Components/Patient/StateViews';
import {
  deleteNotification,
  fetchNotifications,
  getErrorMessage,
  isUnauthorized,
  markAllNotificationsRead,
  markNotificationRead,
  refreshUnreadBadge,
} from './patientApi';
import './patient-pages.css';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];

const LOADING = { status: 'loading', items: [], error: '', needsLogin: false };

export default function PatientNotifications() {
  const [tab, setTab] = useState('all');
  const [state, setState] = useState(LOADING);
  const [attempt, setAttempt] = useState(0); // bump this number to reload the list
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let ignore = false;
    fetchNotifications()
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
  }, [attempt]);

  function retry() {
    setState(LOADING);
    setAttempt((value) => value + 1);
  }

  // Runs a server action, then updates the list on screen and refreshes the sidebar badge.
  async function run(action, applyToItems) {
    setBusy(true);
    setActionError('');
    try {
      await action();
      setState((prev) => ({ ...prev, items: applyToItems(prev.items) }));
      refreshUnreadBadge();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const handleRead = (id) =>
    run(() => markNotificationRead(id), (items) => items.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  const handleDelete = (id) =>
    run(() => deleteNotification(id), (items) => items.filter((n) => n.id !== id));
  const handleReadAll = () =>
    run(markAllNotificationsRead, (items) => items.map((n) => ({ ...n, is_read: true })));

  const unreadCount = state.items.filter((n) => !n.is_read).length;
  const visible = tab === 'unread' ? state.items.filter((n) => !n.is_read) : state.items;

  return (
    <>
      <Helmet>
        <title>Notifications | Clinika</title>
      </Helmet>

      <header className="cl-pd-page-head cl-pd-page-head--row">
        <div>
          <h1>Notifications</h1>
          <p className="cl-pd-muted">Updates about your appointments, prescriptions and records.</p>
        </div>
        <button
          type="button"
          className="cl-pd-btn"
          disabled={busy || unreadCount === 0}
          onClick={handleReadAll}
        >
          Mark all as read
        </button>
      </header>

      <div className="cl-pd-tabs" role="tablist" aria-label="Notification filters">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`cl-pd-tab ${tab === key ? 'is-active' : ''}`}
            onClick={() => setTab(key)}
          >
            {key === 'unread' && unreadCount > 0 ? `${label} (${unreadCount})` : label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="cl-pd-notice cl-pd-notice--error" role="alert">
          {actionError}
        </div>
      )}

      {state.status === 'loading' && <LoadingState label="Loading your notifications…" />}

      {state.status === 'error' && (
        <ErrorState message={state.error} onRetry={retry} needsLogin={state.needsLogin} />
      )}

      {state.status === 'ready' && visible.length === 0 && (
        <EmptyState
          icon="notifications_off"
          title={tab === 'unread' ? 'You are all caught up' : 'No notifications yet'}
          text={
            tab === 'unread'
              ? 'There is nothing new to read.'
              : 'Updates about your visits will appear here.'
          }
        />
      )}

      {state.status === 'ready' && visible.length > 0 && (
        <ul className="cl-pd-list cl-pd-list--plain">
          {visible.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              busy={busy}
              onRead={handleRead}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </>
  );
}
