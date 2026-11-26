import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getAdminActivity, getAdminStats } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdminStats } from '../../hooks/useAdmin';
import { queryKeys } from '../../hooks/queryKeys';
import DashboardLayout from '../../Components/Dashboard/DashboardLayout';
import { dashboardNavConfig } from '../../Components/Dashboard/navConfig';
import {
  ADMIN_CACHE_TIME,
  ADMIN_GC_TIME,
  prefetchAdminAllList,
  prefetchAdminRequest,
} from './adminQueries';
import { prefetchServerListPages } from './useServerList';
import './admin.css';

const ADMIN_LISTS = [
  ['/admin/doctors', { limit: 8, offset: 0 }],
  ['/admin/patients', { limit: 8, offset: 0 }],
  ['/appointments', { limit: 8, offset: 0 }],
  ['/admin/contact-messages', { limit: 10, offset: 0 }],
  ['/admin/users', { role: 'admin', limit: 10, offset: 0 }],
  ['/admin/audit-logs', { limit: 20, offset: 0 }],
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

export default function AdminDashboard() {
  return <AdminShell />;
}

function AdminShell() {
  const queryClient = useQueryClient();
  const statsQuery = useAdminStats();
  const stats = statsQuery.data || {};
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { pathname } = useLocation();
  const pageTitle = PAGE_TITLES.find(([key]) => pathname.includes(key))?.[1] ?? 'Overview';
  const userName = user?.full_name
    || [user?.first_name, user?.last_name].filter(Boolean).join(' ')
    || 'Administrator';

  useEffect(() => {
    const tasks = [
      queryClient.prefetchQuery({
        queryKey: queryKeys.admin.stats,
        queryFn: ({ signal }) => getAdminStats(signal),
        staleTime: ADMIN_CACHE_TIME,
        gcTime: ADMIN_GC_TIME,
      }),
      queryClient.prefetchQuery({
        queryKey: [...queryKeys.admin.activity, 10],
        queryFn: ({ signal }) => getAdminActivity({ limit: 10, offset: 0 }, signal),
        staleTime: ADMIN_CACHE_TIME,
        gcTime: ADMIN_GC_TIME,
      }),
      ...ADMIN_LISTS.map(([path, params]) => prefetchServerListPages(queryClient, path, params)),
      prefetchAdminRequest(queryClient, '/admin/doctors/counts'),
      prefetchAdminRequest(queryClient, '/admin/patients/counts'),
      prefetchAdminRequest(queryClient, '/specialties'),
      prefetchAdminRequest(queryClient, '/admin/reports/appointments'),
      prefetchAdminAllList(queryClient, '/clinics', { limit: 100 }),
      prefetchAdminAllList(queryClient, '/admin/patients', { limit: 100 }),
      prefetchAdminAllList(queryClient, '/admin/doctors', { status: 'active', limit: 100 }),
    ];

    void Promise.all(tasks);
  }, [queryClient]);

  const handleLogout = () => {
    logout();
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
        role="admin"
        portalLabel={dashboardNavConfig.admin.portalLabel}
        pageTitle={pageTitle}
        userName={userName}
        userSubtitle={user?.email || 'Administrator'}
        navItems={dashboardNavConfig.admin.items}
        badge={stats.new_contact_messages || 0}
        onLogout={handleLogout}
      />
    </>
  );
}
