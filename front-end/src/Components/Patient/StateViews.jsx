import { Link } from 'react-router-dom';

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'Missed',
};

export function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] ?? status;
  return <span className={`cl-pd-badge cl-pd-badge--${status}`}>{label}</span>;
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="cl-pd-state" role="status" aria-live="polite">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry, needsLogin = false }) {
  return (
    <div className="cl-pd-state cl-pd-state--error" role="alert">
      <span className="material-symbols-outlined" aria-hidden="true">error</span>
      <p>{message}</p>
      {needsLogin ? (
        <Link className="cl-pd-btn cl-pd-btn--primary" to="/login">Log in</Link>
      ) : (
        <button type="button" className="cl-pd-btn cl-pd-btn--primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'event_available', title, text, actionLabel, actionTo }) {
  return (
    <div className="cl-pd-state">
      <span className="material-symbols-outlined cl-pd-state__icon" aria-hidden="true">{icon}</span>
      <h3 className="cl-pd-state__title">{title}</h3>
      {text && <p>{text}</p>}
      {actionLabel && actionTo && (
        <Link className="cl-pd-btn cl-pd-btn--primary" to={actionTo}>{actionLabel}</Link>
      )}
    </div>
  );
}
