const ICONS = {
  appointment: 'calendar_month',
  reminder: 'alarm',
  prescription: 'medication',
  medical_record: 'folder_shared',
  general: 'notifications',
};

// created_at is a full timestamp, so new Date() is safe here (unlike plain "YYYY-MM-DD").
function formatStamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Pass onRead / onDelete to show the action buttons. Without them it is a read-only row.
export default function NotificationItem({ notification, onRead, onDelete, busy = false }) {
  const { id, title, message, type, is_read: isRead, created_at: createdAt } = notification;

  return (
    <li className={`cl-pd-card cl-pd-notif ${isRead ? '' : 'is-unread'}`}>
      <span className="material-symbols-outlined cl-pd-notif__icon" aria-hidden="true">
        {ICONS[type] ?? ICONS.general}
      </span>

      <div className="cl-pd-notif__body">
        <h3 className="cl-pd-notif__title">{title}</h3>
        <p className="cl-pd-notif__text">{message}</p>
        <p className="cl-pd-muted">{formatStamp(createdAt)}</p>
      </div>

      {(onRead || onDelete) && (
        <div className="cl-pd-notif__actions">
          {onRead && !isRead && (
            <button type="button" className="cl-pd-btn" disabled={busy} onClick={() => onRead(id)}>
              Mark as read
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="cl-pd-btn cl-pd-btn--danger"
              disabled={busy}
              onClick={() => onDelete(id)}
              aria-label={`Delete notification: ${title}`}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </li>
  );
}
