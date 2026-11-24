import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logoIcon from '../../assets/Logo.svg';
import { getInitials } from '../../Components/Patient/dateFormat';
import { fetchProfile, fetchUnreadCount, UNREAD_EVENT } from './patientApi';
import './patient-dashboard.css';
import './patient-shell.css';

const NAV_ITEMS = [
  { label: 'Overview', to: '/patient-dashboard', icon: 'dashboard', end: true },
  { label: 'My Appointments', to: '/patient-dashboard/my-appointments', icon: 'calendar_month' },
  { label: 'Medical Records', to: '/patient-dashboard/medical-records', icon: 'folder_shared' },
  { label: 'My Profile', to: '/patient-dashboard/my-profile', icon: 'person' },
  { label: 'Notifications', to: '/patient-dashboard/notifications', icon: 'notifications', badge: true },
];

export default function PatientDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [profile, setProfile] = useState(null);

  // On every page change: refresh the unread badge and the name/photo in the top bar.
  // The badge also refreshes when a page says it changed (read / delete a notification).
  useEffect(() => {
    let ignore = false;
    const loadUnread = () =>
      fetchUnreadCount()
        .then((count) => {
          if (!ignore) setUnread(count);
        })
        .catch(() => {
          // The badge is optional. If it fails, the pages show their own errors.
        });
    loadUnread();
    window.addEventListener(UNREAD_EVENT, loadUnread);

    fetchProfile()
      .then((data) => {
        if (!ignore) setProfile(data);
      })
      .catch(() => {
        // The top bar simply shows no user chip if this fails.
      });

    return () => {
      ignore = true;
      window.removeEventListener(UNREAD_EVENT, loadUnread);
    };
  }, [location.pathname]);

  // Forget the login token, then go to the login page.
  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <>
      <Helmet>
        <title>Patient Dashboard | Clinika</title>
      </Helmet>

      <div className="cl-pd-shell">
        <aside className="cl-pd-sidebar">
          <Link to="/" className="cl-pd-brand" aria-label="Clinika home">
            <img className="cl-pd-brand__icon" src={logoIcon} alt="" />
            <span>
              <span className="cl-pd-brand__name">Clinika</span>
              <span className="cl-pd-brand__sub">Patient Portal</span>
            </span>
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
          <button type="button" className="cl-pd-nav__link cl-pd-logout" onClick={handleLogout}>
            <span className="material-symbols-outlined" aria-hidden="true">logout</span>
            <span>Log out</span>
          </button>
        </aside>

        <div className="cl-pd-main">
          <header className="cl-pd-topbar">
            <p className="cl-pd-topbar__title">Patient Dashboard</p>

            <div className="cl-pd-topbar__actions">
              <Link
                to="/patient-dashboard/notifications"
                className="cl-pd-topbar__bell"
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              >
                <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
                {unread > 0 && <span className="cl-pd-topbar__dot" aria-hidden="true" />}
              </Link>

              {profile && (
                <Link to="/patient-dashboard/my-profile" className="cl-pd-user">
                  {profile.avatar_url ? (
                    <img className="cl-pd-avatar cl-pd-avatar--sm" src={profile.avatar_url} alt="" />
                  ) : (
                    <span className="cl-pd-avatar cl-pd-avatar--sm" aria-hidden="true">
                      {getInitials(profile.full_name)}
                    </span>
                  )}
                  <span className="cl-pd-user__text">
                    <span className="cl-pd-user__name">{profile.full_name}</span>
                    <span className="cl-pd-user__role">Patient #{profile.id}</span>
                  </span>
                </Link>
              )}
            </div>
          </header>

          <main className="cl-pd-content">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
