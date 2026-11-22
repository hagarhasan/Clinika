import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import logoImg from '../../assets/clinika-logo.png';
import { fetchUnreadCount, UNREAD_EVENT } from './patientApi';
import './patient-dashboard.css';

const NAV_ITEMS = [
  { label: 'Overview', to: '/patient-dashboard', icon: 'dashboard', end: true },
  { label: 'My Appointments', to: '/patient-dashboard/my-appointments', icon: 'calendar_month' },
  { label: 'Medical Records', to: '/patient-dashboard/medical-records', icon: 'folder_shared' },
  { label: 'My Profile', to: '/patient-dashboard/my-profile', icon: 'person' },
  { label: 'Notifications', to: '/patient-dashboard/notifications', icon: 'notifications', badge: true },
];

export default function PatientDashboard() {
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  // Refresh the unread badge when the patient changes page, or when a page says it changed.
  useEffect(() => {
    let ignore = false;
    const load = () =>
      fetchUnreadCount()
        .then((count) => {
          if (!ignore) setUnread(count);
        })
        .catch(() => {
          // The badge is optional. If it fails, the pages show their own errors.
        });
    load();
    window.addEventListener(UNREAD_EVENT, load);
    return () => {
      ignore = true;
      window.removeEventListener(UNREAD_EVENT, load);
    };
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Patient Dashboard | Clinika</title>
      </Helmet>

      <div className="cl-pd-shell">
        <aside className="cl-pd-sidebar">
          <Link to="/" className="cl-pd-sidebar__brand" aria-label="Clinika home">
            <img src={logoImg} alt="Clinika" />
          </Link>

          <nav className="cl-pd-nav" aria-label="Patient dashboard">
            {NAV_ITEMS.map(({ label, to, icon, end, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `cl-pd-nav__link ${isActive ? 'is-active' : ''}`}
              >
                <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
                <span>{label}</span>
                {badge && unread > 0 && (
                  <span className="cl-pd-nav__badge" aria-label={`${unread} unread notifications`}>
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <Link to="/" className="cl-pd-nav__link cl-pd-sidebar__back">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            <span>Back to site</span>
          </Link>
        </aside>

        <main className="cl-pd-content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
