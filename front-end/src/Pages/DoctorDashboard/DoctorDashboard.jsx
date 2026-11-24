import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Outlet, useNavigate } from 'react-router-dom';
import { getMe } from '../../api/authApi';
import { getMyDoctorProfile, getDoctorStats, getSlots, getSchedules } from '../../api/doctorsApi';
import { getTodayAppointments, listAppointments } from '../../api/appointmentsApi';
import DashboardLayout from '../../Components/Dashboard/DashboardLayout';
import { dashboardNavConfig } from '../../Components/Dashboard/navConfig';
import { stripDoctorTitle } from '../../utils/nameUtils';
import { showToast } from '../../Components/Toast/toastService';


export const TOKEN_KEY = 'token';
export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).filter(Boolean).join(', ');
  return e?.message || 'Something went wrong';
};
export const hhmm = (t) => (t || '').slice(0, 5);
export const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const to12 = (t) => {
  const h = Number(t.slice(0, 2));
  return `${String(h % 12 || 12).padStart(2, '0')}:${t.slice(3, 5)} ${h < 12 ? 'AM' : 'PM'}`;
};
export const fmtDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
export const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dayText = (d) => {
  const diff = Math.round((new Date(`${d}T00:00:00`) - new Date(new Date().toDateString())) / 864e5);
  const tag = { 0: 'Today', 1: 'Tomorrow', '-1': 'Yesterday' }[diff];
  return tag ? `${tag}, ${fmtDate(d)}` : fmtDate(d);
};
export const initials = (n = '') =>
  n.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
export const drName = (n = '') => stripDoctorTitle(n);

export const C = {
  primary: '#0050cb', text: '#191c1e', muted: '#424655', secondary: '#d7e4f4', low: '#f2f4f6',
  container: '#eceef0', high: '#e6e8ea', white: '#ffffff', border: '#c2c6d8', outline: '#737687',
  errBg: '#ffdad6', errText: '#93000a', error: '#ba1a1a', primaryFixed: '#dae1ff', sec: '#53606d',
};
export const card = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', padding: '24px' };
export const pill = (bg, color) => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: bg, color,
  padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
  letterSpacing: '0.06em', textTransform: 'uppercase',
});
export const btn = (bg, color, extra = {}) => ({
  backgroundColor: bg, color, padding: '10px 16px', borderRadius: '12px', border: 'none',
  fontWeight: 600, fontSize: 14, cursor: 'pointer', ...extra,
});
export const STATUS_UI = {
  pending: { bg: C.secondary, color: '#101d28', dot: C.sec },
  confirmed: { bg: C.primaryFixed, color: C.primary, dot: C.primary },
  completed: { bg: C.container, color: C.muted, dot: C.primary },
  cancelled: { bg: C.errBg, color: C.errText, dot: C.error },
  rejected: { bg: C.errBg, color: C.errText, dot: C.error },
  no_show: { bg: C.errBg, color: C.errText, dot: C.error },
};

const DoctorDataContext = createContext(null);
export const useDoctorData = () => useContext(DoctorDataContext);

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [state, setState] = useState({
    user: null, profile: null, stats: null, today: [], appointments: [], slots: [], schedules: [], loading: true, error: '',
  });
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    window.dispatchEvent(new Event('authChange'));
    showToast({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been logged out successfully. Stay safe & healthy!',
    });
    setState((p) => ({ ...p, user: null, profile: null, loading: false }));
    navigate('/', { replace: true });
  }, [navigate]);

  const load = useCallback(async (isActive = () => true) => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      if (isActive()) {
        setState((p) => ({ ...p, loading: false, error: '' }));
      }
      return;
    }
    if (isActive()) setState((p) => ({ ...p, loading: true, error: '' }));
    try {
      const me = await getMe();
      if (!isActive()) return;
      if (!me || me.role !== 'doctor') {
        localStorage.removeItem(TOKEN_KEY);
        setState((p) => ({ ...p, loading: false, error: 'This account is not a doctor account.' }));
        return;
      }

      const prof = await getMyDoctorProfile();
      if (!isActive()) return;

      const docId = Number(prof?.id);
      const validId = Number.isInteger(docId) && docId > 0;
      const [st, td, ap, sl, sc] = await Promise.all([
        getDoctorStats().catch(() => null),
        getTodayAppointments().catch(() => ({ data: [] })),
        listAppointments({ limit: 100 }).catch(() => ({ data: [] })),
        validId ? getSlots(docId, isoDate()).catch(() => []) : [],
        validId ? getSchedules(docId).catch(() => []) : [],
      ]);
      if (!isActive()) return;

      setState({
        user: me, profile: prof, stats: st ?? null,
        today: Array.isArray(td?.data) ? td.data : [],
        appointments: Array.isArray(ap?.data) ? ap.data : [],
        slots: Array.isArray(sl) ? sl : [],
        schedules: Array.isArray(sc) ? sc : [],
        loading: false, error: '',
      });
    } catch (e) {
      if (!isActive()) return;
      const code = e?.status;
      if (code === 401 || code === 403) {
        localStorage.removeItem(TOKEN_KEY);
        setState((p) => ({ ...p, loading: false, error: '' }));
        return;
      }
      setState((p) => ({ ...p, loading: false, error: errMsg(e) }));
    }
  }, []);

  useEffect(() => {
    let active = true;
    const t = setTimeout(() => load(() => active), 0);
    return () => { active = false; clearTimeout(t); };
  }, [load]);

  const refresh = useCallback(() => load(() => true), [load]);
  const setUser = useCallback((fn) => setState((p) => ({ ...p, user: typeof fn === 'function' ? fn(p.user) : fn })), []);
  const setProfile = useCallback((fn) => setState((p) => ({ ...p, profile: typeof fn === 'function' ? fn(p.profile) : fn })), []);
  const setAppointments = useCallback((fn) => setState((p) => ({ ...p, appointments: typeof fn === 'function' ? fn(p.appointments) : fn })), []);
  const setSchedules = useCallback((fn) => setState((p) => ({ ...p, schedules: typeof fn === 'function' ? fn(p.schedules) : fn })), []);

  const ctx = useMemo(
    () => ({ ...state, setUser, setProfile, setAppointments, setSchedules, refresh }),
    [state, setUser, setProfile, setAppointments, setSchedules, refresh]
  );

  const name = drName(state.user?.full_name || [state.user?.first_name, state.user?.last_name].filter(Boolean).join(' ') || 'Doctor');
  const specialty = state.profile?.specialty?.name || 'General Medicine';

  return (
    <DoctorDataContext.Provider value={ctx}>
      <Helmet><title>Doctor Portal | Clinika</title></Helmet>
      <DashboardLayout
        portalLabel={dashboardNavConfig.doctor.portalLabel}
        userName={name}
        userSubtitle={specialty}
        navItems={dashboardNavConfig.doctor.items}
        onLogout={logout}
      >
        {state.error && (
          <div style={{ ...card, backgroundColor: '#fdecec', color: '#b71c1c', fontSize: 13, padding: '12px 16px', marginBottom: 18 }}>
            <i className="fa-solid fa-circle-exclamation" /> {state.error}
          </div>
        )}
        <Outlet context={{ user: state.user, profile: state.profile, refresh }} />
      </DashboardLayout>
    </DoctorDataContext.Provider>
  );
}
