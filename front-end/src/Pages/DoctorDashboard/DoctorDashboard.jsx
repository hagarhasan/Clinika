import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
/* eslint-disable react-refresh/only-export-components */

export const TOKEN_KEY = 'token';

export const api = axios.create({ baseURL: 'https://clinika-backend.vercel.app' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
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
export const card = {
  backgroundColor: '#fff',
  borderRadius: '16px',
  boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
  padding: '24px',
};
export const pill = (bg, color) => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: bg, color,
  padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
  letterSpacing: '0.06em', textTransform: 'uppercase',
});
export const btn = (bg, color, extra = {}) => ({
  backgroundColor: bg, color, padding: '10px 16px', borderRadius: '12px', border: 'none',
  fontWeight: 600, fontSize: '14px', cursor: 'pointer', ...extra,
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

const links = [
  { to: '/doctor-dashboard', label: 'Overview', icon: 'fa-table-columns', end: true },
  { to: '/doctor-dashboard/manage-appointments', label: 'Manage Appointments', icon: 'fa-calendar-days' },
  { to: '/doctor-dashboard/manage-availability', label: 'Manage Availability', icon: 'fa-clock' },
  { to: '/doctor-dashboard/my-profile', label: 'My Profile', icon: 'fa-circle-user' },
];

function SiteLogo() {
  return (
    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: C.primary,
          color: C.white,
          display: 'grid',
          placeItems: 'center',
          fontSize: 19,
          flexShrink: 0,
          boxShadow: '0 6px 16px rgba(0, 80, 203, 0.28)',
        }}
      >
        <i className="fa-solid fa-plus" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ fontSize: 19, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>
          Clinika
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.12em' }}>
          DOCTOR PORTAL
        </span>
      </div>
    </Link>
  );
}

export default function DoctorDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const redirectToLogin = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    navigate('/login', { replace: true });
  }, [navigate]);

  const fetchDoctorData = useCallback(async (isActive = () => true) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      if (isActive()) navigate('/login', { replace: true });
      return;
    }

    if (isActive()) {
      setLoading(true);
      setError('');
    }

    try {
      const { data: me } = await api.get('/auth/me');
      if (!isActive()) return;

      if (!me || me.role !== 'doctor') {
        redirectToLogin();
        return;
      }
      setUser(me);

      const { data: prof } = await api.get('/doctors/me/profile');
      if (!isActive()) return;
      setProfile(prof);

      const docId = Number(prof?.id);
      const validDocId = Number.isInteger(docId) && docId > 0;

      const [st, td, ap, sl, sc] = await Promise.all([
        api.get('/doctors/me/stats').catch(() => ({ data: null })),
        api.get('/appointments/today').catch(() => ({ data: [] })),
        api.get('/appointments', { params: { limit: 100 } }).catch(() => ({ data: [] })),
        validDocId
          ? api.get(`/doctors/${docId}/slots`, { params: { date: isoDate() } }).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        validDocId
          ? api.get(`/doctors/${docId}/schedules`).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);

      if (!isActive()) return;
      setStats(st?.data ?? null);
      setToday(Array.isArray(td?.data) ? td.data : []);
      setAppointments(Array.isArray(ap?.data) ? ap.data : []);
      setSlots(Array.isArray(sl?.data) ? sl.data : []);
      setSchedules(Array.isArray(sc?.data) ? sc.data : []);
    } catch (e) {
      if (!isActive()) return;
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        redirectToLogin();
        return;
      }
      setError(errMsg(e));
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [navigate, redirectToLogin]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      fetchDoctorData(() => active);
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchDoctorData]);

  const refresh = useCallback(() => fetchDoctorData(() => true), [fetchDoctorData]);

  const ctxValue = useMemo(
    () => ({
      user,
      profile,
      stats,
      today,
      appointments,
      slots,
      schedules,
      loading,
      error,
      setUser,
      setProfile,
      setAppointments,
      setSchedules,
      refresh,
    }),
    [user, profile, stats, today, appointments, slots, schedules, loading, error, refresh]
  );

  const name = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Doctor';
  const specialty = profile?.specialty?.name || '';

  return (
    <DoctorDataContext.Provider value={ctxValue}>
      <Helmet><title>Doctor Workspace | Clinika</title></Helmet>
      <div style={{ minHeight: '100vh', backgroundColor: C.low, color: C.text, display: 'flex' }}>
        <aside style={{
          width: 264, flexShrink: 0, backgroundColor: C.white, borderRight: `1px solid ${C.container}`,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20,
          position: 'sticky', top: 0, height: '100vh',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ padding: '4px 6px' }}>
              <SiteLogo />
            </div>

            <Link
              to="/doctor-dashboard/my-profile"
              title="Open My Profile & Account Settings"
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12,
                backgroundColor: C.low, textDecoration: 'none', color: C.text,
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 12, backgroundColor: C.secondary, color: C.primary,
                display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0,
              }}>
                <i className="fa-solid fa-user-doctor" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {drName(name)}
                </div>
                {specialty && (
                  <div style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {specialty}
                  </div>
                )}
              </div>
            </Link>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {links.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12,
                    textDecoration: 'none', fontSize: 14, fontWeight: isActive ? 700 : 500,
                    backgroundColor: isActive ? C.secondary : 'transparent',
                    color: isActive ? C.primary : C.muted,
                  })}
                >
                  <i className={`fa-solid ${item.icon}`} style={{ width: 18, textAlign: 'center' }} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16, borderTop: `1px solid ${C.container}` }}>
            <button
              type="button"
              onClick={redirectToLogin}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                backgroundColor: C.errBg, color: C.errText, fontWeight: 600, fontSize: 14,
              }}
            >
              <i className="fa-solid fa-right-from-bracket" />
              <span>Sign Out</span>
            </button>

            <Link
              to="/"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 12, textDecoration: 'none',
                backgroundColor: C.low, color: C.text, fontWeight: 600, fontSize: 14,
              }}
            >
              <i className="fa-solid fa-arrow-left" />
              <span>Back to site</span>
            </Link>
          </div>
        </aside>

        <main style={{ flex: 1, padding: 28, minWidth: 0 }}>
          {error && (
            <div style={{
              ...card,
              backgroundColor: C.errBg,
              color: C.errText,
              fontSize: 13,
              padding: '12px 18px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <i className="fa-solid fa-circle-exclamation" />
              <span>{error}</span>
            </div>
          )}
          <Outlet context={{ user, profile, refresh }} />
        </main>
      </div>
    </DoctorDataContext.Provider>
  );
}