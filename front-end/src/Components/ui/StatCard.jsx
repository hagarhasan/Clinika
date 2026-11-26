import { Link } from 'react-router-dom';

export default function StatCard({
  icon,
  value,
  label,
  helper,
  to,
  className = '',
}) {
  const content = (
    <>
      {icon && (
        <span className="cl-pd-stat__icon-wrap" aria-hidden="true">
          {typeof icon === 'string'
            ? <span className="material-symbols-outlined">{icon}</span>
            : icon}
        </span>
      )}
      <span className="cl-pd-stat__copy">
        <strong className="cl-pd-stat__value">{value}</strong>
        <span className="cl-pd-stat__label">{label}</span>
        {helper && <small className="cl-pd-stat__helper">{helper}</small>}
      </span>
    </>
  );

  if (to) {
    return <Link to={to} className={`cl-pd-card cl-pd-stat ${className}`}>{content}</Link>;
  }
  return <div className={`cl-pd-card cl-pd-stat ${className}`}>{content}</div>;
}
