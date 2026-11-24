import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import adminApi, { getErrorMessage } from '../api/adminApi';

const DashboardContext = createContext(null);

const DEFAULT_STATS = {
  totalDoctors: 0,
  totalPatients: 0,
  totalAppointments: 0,
  pendingRequests: 0,
  todayAppointments: 0,
  newMessages: 0,
  topSpecialties: [],
};

// GET /admin/stats -> { users: { patients, doctors }, appointments: { total, today }, pending_doctor_requests, ... }
const mapStats = (data) => ({
  totalDoctors: data?.users?.doctors ?? 0,
  totalPatients: data?.users?.patients ?? 0,
  totalAppointments: data?.appointments?.total ?? 0,
  pendingRequests: data?.pending_doctor_requests ?? 0,
  todayAppointments: data?.appointments?.today ?? 0,
  newMessages: data?.new_contact_messages ?? 0,
  topSpecialties: Array.isArray(data?.top_specialties) ? data.top_specialties : [],
});

export function DashboardProvider({ children }) {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const refreshDashboard = useCallback(async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        adminApi.get('/admin/stats'),
        adminApi.get('/admin/activity', { params: { limit: 10, offset: 0 } }),
      ]);
      setStats(mapStats(statsRes.data));
      setActivities(Array.isArray(activityRes.data) ? activityRes.data : []);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to load dashboard data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  return (
    <DashboardContext.Provider value={{ stats, activities, loading, errorMsg, refreshDashboard }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within a DashboardProvider');
  return ctx;
}
