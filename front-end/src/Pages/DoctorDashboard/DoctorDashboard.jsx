import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Outlet } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from './DashboardLayout';
/* eslint-disable react-refresh/only-export-components */

export const TOKEN_KEY = 'token';
export const api = axios.create({ baseURL: 'https://clinika-backend.vercel.app' });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

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
export const drName = (n = '') => (/^dr\.?\s/i.test(n) ? n : `Dr. ${n}`);

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

const DOCTOR_LINKS = [
  { to: '/doctor-dashboard', label: 'Overview', icon: 'fa-chart-line', end: true },
  { to: '/doctor-dashboard/manage-appointments', label: 'Manage Appointments', icon: 'fa-calendar-check' },
  { to: '/doctor-dashboard/manage-availability', label: 'Manage Availability', icon: 'fa-clock' },
  { to: '/doctor-dashboard/my-profile', label: 'My Profile', icon: 'fa-user-doctor' },
];

export default function DoctorDashboard() {
  const [state, setState] = useState({
    user: null, profile: null, stats: null, today: [], appointments: [], slots: [], schedules: [], loading: true, error: '',
  });
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setNeedsLogin(true);
    setState((p) => ({ ...p, user: null, profile: null, loading: false }));
  }, []);

  const load = useCallback(async (isActive = () => true) => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      if (isActive()) {
        setNeedsLogin(true);
        setState((p) => ({ ...p, loading: false, error: '' }));
      }
      return;
    }
    if (isActive()) setState((p) => ({ ...p, loading: true, error: '' }));
    try {
      const { data: me } = await api.get('/auth/me');
      if (!isActive()) return;
      if (!me || me.role !== 'doctor') {
        localStorage.removeItem(TOKEN_KEY);
        setNeedsLogin(true);
        setState((p) => ({ ...p, loading: false, error: 'This account is not a doctor account.' }));
        return;
      }

      const { data: prof } = await api.get('/doctors/me/profile');
      if (!isActive()) return;

      const docId = Number(prof?.id);
      const validId = Number.isInteger(docId) && docId > 0;
      const [st, td, ap, sl, sc] = await Promise.all([
        api.get('/doctors/me/stats').catch(() => ({ data: null })),
        api.get('/appointments/today').catch(() => ({ data: [] })),
        api.get('/appointments', { params: { limit: 100 } }).catch(() => ({ data: [] })),
        validId ? api.get(`/doctors/${docId}/slots`, { params: { date: isoDate() } }).catch(() => ({ data: [] })) : { data: [] },
        validId ? api.get(`/doctors/${docId}/schedules`).catch(() => ({ data: [] })) : { data: [] },
      ]);
      if (!isActive()) return;

      setNeedsLogin(false);
      setState({
        user: me, profile: prof, stats: st?.data ?? null,
        today: Array.isArray(td?.data) ? td.data : [],
        appointments: Array.isArray(ap?.data) ? ap.data : [],
        slots: Array.isArray(sl?.data) ? sl.data : [],
        schedules: Array.isArray(sc?.data) ? sc.data : [],
        loading: false, error: '',
      });
    } catch (e) {
      if (!isActive()) return;
      const code = e?.response?.status;
      if (code === 401 || code === 403) {
        localStorage.removeItem(TOKEN_KEY);
        setNeedsLogin(true);
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

  const handleInlineLogin = async (e) => {
    e.preventDefault();
    setAuthErr('');
    setAuthBusy(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: authForm.email.trim(),
        password: authForm.password,
      });
      const token = data?.access_token || data?.token || data?.data?.access_token || data?.data?.token;
      if (!token) {
        setAuthErr('No token returned from server.');
        return;
      }
      localStorage.setItem(TOKEN_KEY, token);
      await load(() => true);
    } catch (err) {
      setAuthErr(errMsg(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const refresh = useCallback(() => load(() => true), [load]);
  const setUser = useCallback((fn) => setState((p) => ({ ...p, user: typeof fn === 'function' ? fn(p.user) : fn })), []);
  const setProfile = useCallback((fn) => setState((p) => ({ ...p, profile: typeof fn === 'function' ? fn(p.profile) : fn })), []);
  const setAppointments = useCallback((fn) => setState((p) => ({ ...p, appointments: typeof fn === 'function' ? fn(p.appointments) : fn })), []);
  const setSchedules = useCallback((fn) => setState((p) => ({ ...p, schedules: typeof fn === 'function' ? fn(p.schedules) : fn })), []);

  const ctx = useMemo(
    () => ({ ...state, setUser, setProfile, setAppointments, setSchedules, refresh }),
    [state, setUser, setProfile, setAppointments, setSchedules, refresh]
  );

  if (needsLogin) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: '#f6f8fb', padding: 20 }}>
        <Helmet><title>Doctor Sign In | Clinika</title></Helmet>
        <form onSubmit={handleInlineLogin} style={{ ...card, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Doctor Sign In</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Sign in with your approved doctor account.</p>
          {(authErr || state.error) && (
            <div style={{ backgroundColor: C.errBg, color: C.errText, padding: '10px 12px', borderRadius: 10, fontSize: 13 }}>
              {authErr || state.error}
            </div>
          )}
          <input
            type="email"
            required
            placeholder="Email address"
            value={authForm.email}
            onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
            style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14 }}
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={authForm.password}
            onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))}
            style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14 }}
          />
          <button type="submit" disabled={authBusy} style={btn(C.primary, C.white)}>
            {authBusy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    );
  }

  const name = drName(state.user?.full_name || [state.user?.first_name, state.user?.last_name].filter(Boolean).join(' ') || 'Doctor');
  const specialty = state.profile?.specialty?.name || 'General Medicine';

  return (
    <DoctorDataContext.Provider value={ctx}>
      <Helmet><title>Doctor Portal | Clinika</title></Helmet>
      <DashboardLayout
        portalLabel="DOCTOR PORTAL"
        userName={name}
        subtitle={specialty}
        links={DOCTOR_LINKS}
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