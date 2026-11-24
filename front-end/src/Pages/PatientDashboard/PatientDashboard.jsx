import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardShell from '../../Components/DashboardShell/DashboardShell';
import { fetchProfile, fetchUnreadCount, UNREAD_EVENT } from './patientApi';
import { showToast } from '../../Components/Toast/toastService';
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

  // Forget the login token, then go to home page with toast feedback
  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    window.dispatchEvent(new Event('authChange'));
    showToast({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been logged out successfully. Stay safe & healthy!',
    });
    navigate('/', { replace: true });
  }

  const PAGE_TITLES = {
    'my-appointments': 'My Appointments',
    'medical-records': 'Medical Records',
    'my-profile': 'My Profile',
    notifications: 'Notifications',
  };
  const segment = location.pathname.split('/').filter(Boolean).at(-1);
  const pageTitle = location.pathname === '/patient-dashboard'
    ? 'Patient Dashboard'
    : PAGE_TITLES[segment] || 'Patient Dashboard';

  return (
    <>
      <Helmet>
        <title>Patient Dashboard | Clinika</title>
      </Helmet>
      <DashboardShell
        portalLabel="PATIENT PORTAL"
        pageTitle={pageTitle}
        navItems={NAV_ITEMS}
        userName={profile?.full_name}
        userSubtitle={profile ? `Patient #${profile.id}` : ''}
        badge={unread}
        onLogout={handleLogout}
      />
    </>
  );
}
