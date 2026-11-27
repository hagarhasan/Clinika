import { Helmet } from 'react-helmet-async';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Components/Dashboard/DashboardLayout';
import { dashboardNavConfig } from '../../Components/Dashboard/navConfig';
import { usePatientProfile } from '../../hooks/usePatientStats';
import { useUnreadCount } from '../../hooks/useNotifications';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useDashboardPreload } from '../../hooks/useDashboardPreload';
import { LoadingState } from '../../Components/Patient/StateViews';
import { prefetchPatientDashboard } from './preload';
import { getLogoutDestination } from '../../utils/logoutNavigation';


export default function PatientDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const profileQuery = usePatientProfile();
  const unreadQuery = useUnreadCount();
  // Fetch all dashboard data + page code once on entry; pages then open instantly from the cache.
  const ready = useDashboardPreload(prefetchPatientDashboard);
  const profile = profileQuery.data || null;
  const unread = unreadQuery.data?.unread ?? 0;

  // Forget the login token, then go to home page with toast feedback
  function handleLogout() {
    const redirectTo = getLogoutDestination(location);
    logout();
    showToast({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been logged out successfully. Stay safe & healthy!',
    });
    navigate(redirectTo, { replace: true });
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
        role="patient"
        portalLabel={dashboardNavConfig.patient.portalLabel}
        pageTitle={pageTitle}
        navItems={dashboardNavConfig.patient.items}
        userName={profile?.full_name}
        userSubtitle={profile ? `Patient #${profile.id}` : ''}
        badge={unread}
        unread={unread}
        onLogout={handleLogout}
      >
        {ready ? <Outlet /> : <LoadingState label="Loading your dashboard…" />}
      </DashboardLayout>
    </>
  );
}
