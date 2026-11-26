export const dashboardNavConfig = {
  patient: {
    portalLabel: 'PATIENT PORTAL',
    items: [
      { label: 'Overview', to: '/patient-dashboard', icon: 'dashboard', end: true },
      { label: 'My Appointments', to: '/patient-dashboard/my-appointments', icon: 'calendar_month' },
      { label: 'Medical Records', to: '/patient-dashboard/medical-records', icon: 'folder_shared' },
      { label: 'My Profile', to: '/patient-dashboard/my-profile', icon: 'person' },
      { label: 'Notifications', to: '/patient-dashboard/notifications', icon: 'notifications', badge: true },
    ],
  },
  doctor: {
    portalLabel: 'DOCTOR PORTAL',
    items: [
      { label: 'Overview', to: '/doctor-dashboard', icon: 'dashboard', end: true },
      { label: 'Manage Appointments', to: '/doctor-dashboard/manage-appointments', icon: 'calendar_month' },
      { label: 'Manage Availability', to: '/doctor-dashboard/manage-availability', icon: 'schedule' },
      { label: 'My Profile', to: '/doctor-dashboard/my-profile', icon: 'person' },
      { label: 'Notifications', to: '/doctor-dashboard/notifications', icon: 'notifications', badge: true },
    ],
  },
  admin: {
    portalLabel: 'ADMIN PORTAL',
    items: [
      { label: 'Overview', to: '/admin-dashboard', icon: 'dashboard', end: true },
      { label: 'Manage Doctors', to: '/admin-dashboard/manage-doctors', icon: 'stethoscope' },
      { label: 'Users & Appointments', to: '/admin-dashboard/manage-users-and-appointments', icon: 'calendar_month' },
      { label: 'Contact Messages', to: '/admin-dashboard/messages', icon: 'mail', badge: true },
      { label: 'Specialties & Clinics', to: '/admin-dashboard/catalog', icon: 'local_hospital' },
      { label: 'Reports', to: '/admin-dashboard/reports', icon: 'bar_chart' },
      { label: 'Admin Team', to: '/admin-dashboard/team', icon: 'admin_panel_settings' },
      { label: 'Notifications', to: '/admin-dashboard/notifications', icon: 'notifications', badge: 'unread' },
      { label: 'My Profile', to: '/admin-dashboard/my-profile', icon: 'person' },
    ],
  },
};
