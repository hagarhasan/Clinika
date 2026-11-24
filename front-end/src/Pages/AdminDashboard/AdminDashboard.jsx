import { Helmet } from 'react-helmet-async';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../../assets/clinika-logo.png';
import { clearSession } from '../../api/adminApi';
import { DashboardProvider, useDashboard } from '../../context/DashboardContext';
import '../PatientDashboard/patient-dashboard.css';
import './admin.css';

const NAV_ITEMS = [
  { label: 'Overview', to: '/admin-dashboard', icon: 'dashboard', end: true },
  { label: 'Manage Doctors', to: '/admin-dashboard/manage-doctors', icon: 'stethoscope' },
  { label: 'Users & Appointments', to: '/admin-dashboard/manage-users-and-appointments', icon: 'calendar_month' },
  { label: 'Contact Messages', to: '/admin-dashboard/messages', icon: 'mail', badge: true },
  { label: 'Specialties & Clinics', to: '/admin-dashboard/catalog', icon: 'local_hospital' },
  { label: 'Reports', to: '/admin-dashboard/reports', icon: 'bar_chart' },
  { label: 'Admin Team', to: '/admin-dashboard/team', icon: 'admin_panel_settings' },
  { label: 'My Profile', to: '/admin-dashboard/my-profile', icon: 'person' },
];

const PAGE_TITLES = [
  ['manage-doctors', 'Manage Doctors'],
  ['manage-users-and-appointments', 'Manage Users & Appointments'],
  ['my-profile', 'My Profile'],
  ['messages', 'Contact Messages'],
  ['catalog', 'Specialties & Clinics'],
  ['reports', 'Reports'],
  ['team', 'Admin Team'],
];

// The admin pages are wrapped by <RequireAdmin> in App.jsx, so this shell only renders for a verified admin.
export default function AdminDashboard() {
  return (
    <DashboardProvider>
      <AdminShell />
    </DashboardProvider>
  );
}

function AdminShell() {
  const { stats } = useDashboard();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pageTitle = PAGE_TITLES.find(([key]) => pathname.includes(key))?.[1] ?? 'Overview';

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Clinika</title>
      </Helmet>

      <div className="cl-pd-shell">
        <aside className="cl-pd-sidebar">
          <Link to="/" className="cl-pd-sidebar__brand" aria-label="Clinika home">
            <img src={logoImg} alt="Clinika" />
          </Link>

          <nav className="cl-pd-nav" aria-label="Admin dashboard">
            {NAV_ITEMS.map(({ label, to, icon, end, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `cl-pd-nav__link ${isActive ? 'is-active' : ''}`}
              >
                <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
                <span>{label}</span>
                {badge && stats.newMessages > 0 && (
                  <span className="cl-ad-nav-badge" aria-label={`${stats.newMessages} new`}>{stats.newMessages}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="cl-pd-sidebar__back">
            <button
              type="button"
              className="cl-pd-nav__link"
              style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--cl-error)' }}
              onClick={handleLogout}
            >
              <span className="material-symbols-outlined" aria-hidden="true">logout</span>
              <span>Logout</span>
            </button>
            <Link to="/" className="cl-pd-nav__link">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              <span>Back to site</span>
            </Link>
          </div>
        </aside>

        <div className="cl-ad-main">
          <header className="cl-ad-topbar">
            <div className="cl-ad-crumbs">
              <span>Admin Portal</span>
              <span aria-hidden="true">/</span>
              <strong>{pageTitle}</strong>
            </div>
            <span className="cl-ad-sync">
              <i aria-hidden="true" />
              Registry Database Sync: <strong>Real-time</strong>
            </span>
          </header>

          <main className={`cl-ad-content ${pathname.includes('my-profile') ? 'cl-ad-content--narrow' : ''}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
