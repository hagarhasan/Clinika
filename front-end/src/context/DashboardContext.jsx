import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DashboardContext = createContext(null);

const API_BASE_URL = 'https://clinika-backend.vercel.app';
const CACHE_KEY = 'clinika_admin_dashboard_cache_v1';

const DEFAULT_STATS = {
  totalDoctors: 0,
  totalPatients: 0,
  totalAppointments: 0,
  pendingRequests: 0,
};

const readDashboardCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      stats: {
        ...DEFAULT_STATS,
        ...(parsed.stats && typeof parsed.stats === 'object' ? parsed.stats : {}),
      },
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      doctors: Array.isArray(parsed.doctors) ? parsed.doctors : [],
    };
  } catch {
    return null;
  }
};

const writeDashboardCache = (payload) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
       // ignore: sessionStorage may be unavailable or full
  }
};

const clearDashboardCache = () => {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
        // ignore: sessionStorage may be unavailable
  }
};

const hasMeaningfulCache = (cache) => {
  if (!cache) return false;
  const s = cache.stats || DEFAULT_STATS;
  return (
    (Array.isArray(cache.doctors) && cache.doctors.length > 0) ||
    (Array.isArray(cache.activities) && cache.activities.length > 0) ||
    Number(s.totalDoctors) > 0 ||
    Number(s.totalPatients) > 0 ||
    Number(s.totalAppointments) > 0 ||
    Number(s.pendingRequests) > 0
  );
};

export function DashboardProvider({ children }) {
  const initialCache = readDashboardCache();
  const hasCache = hasMeaningfulCache(initialCache);

  const [stats, setStats] = useState(initialCache?.stats || DEFAULT_STATS);
  const [activities, setActivities] = useState(initialCache?.activities || []);
  const [doctors, setDoctors] = useState(initialCache?.doctors || []);
  const [loading, setLoading] = useState(!hasCache);
  const [errorMsg, setErrorMsg] = useState('');

  const getToken = useCallback(() => {
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [getToken]);

  const fetchDashboardData = useCallback(
    async ({ silent = false } = {}) => {
      const token = getToken();
      if (!token) {
        clearDashboardCache();
        setStats(DEFAULT_STATS);
        setActivities([]);
        setDoctors([]);
        setLoading(false);
        return;
      }

      const currentCache = readDashboardCache();
      const hasAnyData =
        hasMeaningfulCache(currentCache) ||
        doctors.length > 0 ||
        activities.length > 0 ||
        Number(stats.totalDoctors) > 0 ||
        Number(stats.totalPatients) > 0 ||
        Number(stats.totalAppointments) > 0 ||
        Number(stats.pendingRequests) > 0;

      if (!silent && !hasAnyData) {
        setLoading(true);
      }
      setErrorMsg('');

      try {
        const headers = getAuthHeaders();
        const [statsRes, activityRes, patientsRes, doctorsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/stats`, { headers }),
          fetch(`${API_BASE_URL}/admin/activity?limit=10&offset=0`, { headers }),
          fetch(`${API_BASE_URL}/admin/users?role=patient`, { headers }),
          fetch(`${API_BASE_URL}/admin/doctors/`, { headers }),
        ]);

        if (
          statsRes.status === 401 ||
          statsRes.status === 403 ||
          activityRes.status === 401 ||
          activityRes.status === 403
        ) {
          clearDashboardCache();
          setErrorMsg('You are not authorized to view admin data.');
          setLoading(false);
          return;
        }

        let updatedStats = {
          ...DEFAULT_STATS,
          ...(currentCache?.stats || stats),
        };
        let updatedActivities = Array.isArray(currentCache?.activities)
          ? currentCache.activities
          : Array.isArray(activities)
          ? activities
          : [];
        let updatedDoctors = Array.isArray(currentCache?.doctors)
          ? currentCache.doctors
          : Array.isArray(doctors)
          ? doctors
          : [];

        let patientsCountFromUsers = null;
        if (patientsRes && patientsRes.ok) {
          const patientsData = await patientsRes.json();
          const pList = Array.isArray(patientsData)
            ? patientsData
            : patientsData?.items || patientsData?.users || patientsData?.patients || patientsData?.data || [];
          if (Array.isArray(pList)) {
            patientsCountFromUsers = pList.length;
          }
        }

        if (statsRes && statsRes.ok) {
          const statsData = await statsRes.json();
          updatedStats = {
            ...updatedStats,
            totalDoctors:
              statsData.totalDoctors ?? statsData.doctorsCount ?? updatedStats.totalDoctors,
            totalPatients:
              patientsCountFromUsers ??
              statsData.totalPatients ??
              statsData.patientsCount ??
              updatedStats.totalPatients,
            totalAppointments:
              statsData.totalAppointments ??
              statsData.appointmentsCount ??
              updatedStats.totalAppointments,
            pendingRequests:
              statsData.pendingRequests ??
              statsData.pendingDoctors ??
              updatedStats.pendingRequests,
          };
          setStats(updatedStats);
        }

        if (activityRes && activityRes.ok) {
          const activityData = await activityRes.json();
          const list = Array.isArray(activityData)
            ? activityData
            : activityData?.items || activityData?.activities || activityData?.data || [];
          updatedActivities = Array.isArray(list) ? list : [];
          setActivities(updatedActivities);
        }

        if (doctorsRes && doctorsRes.ok) {
          const doctorsData = await doctorsRes.json();
          const docList = Array.isArray(doctorsData)
            ? doctorsData
            : doctorsData?.items || doctorsData?.doctors || doctorsData?.data || [];
          updatedDoctors = Array.isArray(docList) ? docList : [];
          setDoctors(updatedDoctors);
        }

        writeDashboardCache({
          stats: updatedStats,
          activities: updatedActivities,
          doctors: updatedDoctors,
        });
      } catch {
        if (!hasAnyData) {
          setErrorMsg('Failed to load dashboard data.');
        }
      } finally {
        setLoading(false);
      }
    },
    [getToken, getAuthHeaders, doctors, activities, stats]
  );

  useEffect(() => {
    fetchDashboardData({ silent: hasCache });
  }, [fetchDashboardData, hasCache]);

  const clearCacheAndState = useCallback(() => {
    clearDashboardCache();
    setStats(DEFAULT_STATS);
    setActivities([]);
    setDoctors([]);
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        API_BASE_URL,
        stats,
        setStats,
        activities,
        setActivities,
        doctors,
        setDoctors,
        loading,
        errorMsg,
        getToken,
        getAuthHeaders,
        refreshDashboard: fetchDashboardData,
        clearDashboardCache: clearCacheAndState,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return ctx;
}
