import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import NotificationItem from '../../Components/Patient/NotificationItem';
import { EmptyState, ErrorState, LoadingState } from '../../Components/Patient/StateViews';
import { useNotifications, useNotificationActions } from '../../hooks/useNotifications';
import { getErrorMessage } from '../../api/client';
import './patient-pages.css';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];

export default function PatientNotifications() {
  const [tab, setTab] = useState('all');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const notificationsQuery = useNotifications();
  const actions = useNotificationActions();
  const [items, setItems] = useState(null);
  const fetchedItems = notificationsQuery.data?.data || notificationsQuery.data || [];
  const visibleItems = items || fetchedItems;

  // Runs a server action, then updates the list on screen and refreshes the sidebar badge.
  async function run(mutation, applyToItems) {
    setBusy(true);
    setActionError('');
    try {
      await mutation();
      setItems((current) => applyToItems(current || fetchedItems));
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const handleRead = (id) =>
    run(() => actions.markRead.mutateAsync(id), (items) => items.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  const handleDelete = (id) =>
    run(() => actions.remove.mutateAsync(id), (items) => items.filter((n) => n.id !== id));
  const handleReadAll = () =>
    run(() => actions.markAllRead.mutateAsync(), (items) => items.map((n) => ({ ...n, is_read: true })));

  const unreadCount = visibleItems.filter((n) => !n.is_read).length;
  const visible = tab === 'unread' ? visibleItems.filter((n) => !n.is_read) : visibleItems;

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
              : 'Updates about your visits will appear here.'
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
