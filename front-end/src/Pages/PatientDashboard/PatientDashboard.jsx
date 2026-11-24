import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Dashboard/DashboardLayout';
import { dashboardNavConfig } from '../../Components/Dashboard/navConfig';
import { usePatientProfile } from '../../hooks/usePatientStats';
import { useUnreadCount } from '../../hooks/useNotifications';
import { showToast } from '../../Components/Toast/toastService';
import './patient-dashboard.css';
import './patient-shell.css';


export default function PatientDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const profileQuery = usePatientProfile();
  const unreadQuery = useUnreadCount();
  const profile = profileQuery.data || null;
  const unread = unreadQuery.data?.unread ?? 0;

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
      <DashboardLayout
        portalLabel={dashboardNavConfig.patient.portalLabel}
        pageTitle={pageTitle}
        navItems={dashboardNavConfig.patient.items}
        userName={profile?.full_name}
        userSubtitle={profile ? `Patient #${profile.id}` : ''}
        badge={unread}
        onLogout={handleLogout}
      />
    </>
  );
}
