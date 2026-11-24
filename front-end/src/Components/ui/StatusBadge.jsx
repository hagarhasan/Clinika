const STATUS_STYLES = {
  confirmed: 'success',
  completed: 'secondary',
  pending: 'warning',
  cancelled: 'danger',
  rejected: 'danger',
  no_show: 'danger',
  active: 'success',
  inactive: 'secondary',
  verified: 'success',
  unverified: 'warning',
};

export default function StatusBadge({ status, label }) {
  const normalized = String(status || '').toLowerCase();
  return (
    <span className={`badge text-bg-${STATUS_STYLES[normalized] || 'secondary'} text-capitalize`}>
      {label || status || 'Unknown'}
    </span>
  );
}
