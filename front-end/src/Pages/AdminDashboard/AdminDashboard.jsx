import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearSession } from '../../api/adminApi';
import { showToast } from '../../Components/Toast/toastService';
import { DashboardProvider, useDashboard } from '../../context/DashboardContext';
import DashboardLayout from '../../Components/Dashboard/DashboardLayout';
import { dashboardNavConfig } from '../../Components/Dashboard/navConfig';
import '../PatientDashboard/patient-dashboard.css';
import './admin.css';

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
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    window.dispatchEvent(new Event('authChange'));
    showToast({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been logged out successfully. Stay safe & healthy!',
    });
    navigate('/', { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Clinika</title>
      </Helmet>
      <DashboardLayout
        portalLabel={dashboardNavConfig.admin.portalLabel}
        pageTitle={pageTitle}
        navItems={dashboardNavConfig.admin.items}
        badge={stats.newMessages}
        onLogout={handleLogout}
      />
    </>
  );
}
