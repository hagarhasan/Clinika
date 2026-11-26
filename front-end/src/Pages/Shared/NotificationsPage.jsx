import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import NotificationItem from '../../Components/Patient/NotificationItem';
import { EmptyState, ErrorState, LoadingState } from '../../Components/Patient/StateViews';
import { useNotifications, useNotificationActions } from '../../hooks/useNotifications';
import { getErrorMessage } from '../../api/client';
import '../PatientDashboard/patient-pages.css';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];

/** Notifications page shared by the patient, doctor and admin dashboards. */
export default function NotificationsPage() {
  const [tab, setTab] = useState('all');
  const [actionError, setActionError] = useState('');
  const notificationsQuery = useNotifications();
  const actions = useNotificationActions();
  const items = notificationsQuery.data?.data || [];
  const busy = actions.markRead.isPending || actions.markAllRead.isPending || actions.remove.isPending;

  async function run(mutation) {
    setActionError('');
    try {
      await mutation();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  const handleRead = (id) => run(() => actions.markRead.mutateAsync(id));
  const handleDelete = (id) => run(() => actions.remove.mutateAsync(id));
  const handleReadAll = () => run(() => actions.markAllRead.mutateAsync());

  const unreadCount = items.filter((n) => !n.is_read).length;
  const visible = tab === 'unread' ? items.filter((n) => !n.is_read) : items;

  return (
    <>
      <Helmet>
        <title>Notifications | Clinika</title>
      </Helmet>

      <header className="cl-pd-page-head cl-pd-page-head--row">
        <div>
          <h1>Notifications</h1>
          <p className="cl-pd-muted">Updates about appointments, records and your account.</p>
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

      {notificationsQuery.isLoading && <LoadingState label="Loading your notifications…" />}

      {notificationsQuery.isError && (
        <ErrorState message={notificationsQuery.error?.message || 'Could not load notifications.'} onRetry={() => notificationsQuery.refetch()} needsLogin={notificationsQuery.error?.status === 401} />
      )}

      {!notificationsQuery.isLoading && !notificationsQuery.isError && visible.length === 0 && (
        <EmptyState
          icon="notifications_off"
          title={tab === 'unread' ? 'You are all caught up' : 'No notifications yet'}
          text={
            tab === 'unread'
              ? 'There is nothing new to read.'
              : 'Updates will appear here as things happen.'
          }
        />
      )}

      {!notificationsQuery.isLoading && !notificationsQuery.isError && visible.length > 0 && (
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
