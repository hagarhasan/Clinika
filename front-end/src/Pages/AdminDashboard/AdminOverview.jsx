import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAdminUser } from '../../context/AdminUserContext';
import { useDashboard } from '../../context/DashboardContext';
import { formatDateTime } from './adminUi';

const CARDS = [
  { key: 'totalDoctors', label: 'Active Doctors', icon: 'stethoscope', to: 'manage-doctors' },
  { key: 'totalPatients', label: 'Registered Patients', icon: 'groups', to: 'manage-users-and-appointments' },
  { key: 'totalAppointments', label: 'Total Appointments', icon: 'event_note', to: 'manage-users-and-appointments' },
  { key: 'pendingRequests', label: 'Pending Doctor Requests', icon: 'pending_actions', to: 'manage-doctors' },
];

export default function AdminOverview() {
  const { user } = useAdminUser();
  const { stats, activities, loading, errorMsg } = useDashboard();

  return (
    <>
      <Helmet>
        <title>Admin Overview | Clinika</title>
      </Helmet>

      <header className="cl-ad-head">
        <div>
          <h1>Welcome back{user?.first_name ? `, ${user.first_name}` : ''}</h1>
          <p>Here is an overview of your Clinika platform.</p>
        </div>
        <div className="cl-ad-actions">
          <Link to="manage-doctors" className="cl-pd-btn cl-ad-btn-icon">
            <span className="material-symbols-outlined" aria-hidden="true">stethoscope</span> Manage Doctors
          </Link>
          <Link to="manage-users-and-appointments" className="cl-pd-btn cl-pd-btn--primary cl-ad-btn-icon">
            <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span> Users &amp; Appointments
          </Link>
        </div>
      </header>

      {errorMsg && <div className="cl-ad-banner cl-ad-banner--error" role="alert">{errorMsg}</div>}

      <div className="cl-ad-grid cl-ad-grid--4" style={{ marginBottom: '1.5rem' }}>
        {CARDS.map(({ key, label, icon, to }) => (
          <Link key={key} to={to} className="cl-pd-card cl-ad-stat" style={{ color: 'inherit', textDecoration: 'none' }}>
            <span className="cl-ad-stat__icon material-symbols-outlined" aria-hidden="true">{icon}</span>
            <span>
              <span className="cl-ad-stat__label">{label}</span>
              <span className="cl-ad-stat__value">{loading ? '…' : stats[key]}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="cl-ad-grid cl-ad-grid--2">
        <section className="cl-pd-card cl-ad-info-card" aria-labelledby="cl-ad-recent">
          <h3 id="cl-ad-recent">Recent activity</h3>
          {loading ? (
            <p className="cl-ad-note">Loading recent activity…</p>
          ) : activities.length === 0 ? (
            <p className="cl-ad-note">No recent activity available.</p>
          ) : (
            <ul className="cl-ad-activity">
              {activities.map((item) => (
                <li key={item.id}>
                  <i className="cl-ad-dot cl-ad-dot--blue" aria-hidden="true" />
                  <span>
                    {item.description || item.action}
                    <small>
                      {item.actor_name ? `${item.actor_name} • ` : ''}
                      {formatDateTime(item.created_at)}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cl-pd-card cl-ad-info-card" aria-labelledby="cl-ad-today">
          <h3 id="cl-ad-today">Today</h3>
          <dl className="cl-ad-detail" style={{ marginTop: 0 }}>
            <div><dt>Appointments today</dt><dd>{loading ? '…' : stats.todayAppointments}</dd></div>
            <div><dt>New contact messages</dt><dd>{loading ? '…' : <Link to="messages">{stats.newMessages}</Link>}</dd></div>
          </dl>
          {stats.topSpecialties.length > 0 && (
            <>
              <span className="cl-ad-kicker" style={{ marginTop: '1.25rem' }}>Top specialties</span>
              <ul className="cl-ad-legend">
                {stats.topSpecialties.map((s) => (
                  <li key={s.name}>{s.name}<b>{s.appointments}</b></li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}
