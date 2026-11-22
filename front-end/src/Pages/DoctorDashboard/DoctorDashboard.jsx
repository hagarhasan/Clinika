import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Outlet, NavLink, Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
/* eslint-disable react-refresh/only-export-components */
// ===== ملحقات مشتركة لصفحات الدكتور (الصفحات بتستوردها من هنا) =====
export const TOKEN_KEY = 'token'; // غيّريه لو Login.jsx بيخزن باسم تاني

const api = axios.create({ baseURL: 'https://clinika-backend.vercel.app' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export { api };

export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ');
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
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// "Today, May 20, 2025" / "Tomorrow, ..." / "Yesterday, ..." أو التاريخ بس
export const dayText = (d) => {
  const diff = Math.round((new Date(`${d}T00:00:00`) - new Date(new Date().toDateString())) / 864e5);
  const tag = { 0: 'Today', 1: 'Tomorrow', '-1': 'Yesterday' }[diff];
  return tag ? `${tag}, ${fmtDate(d)}` : fmtDate(d);
};
export const initials = (n = '') => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
export const drName = (n = '') => (/^dr\.?\s/i.test(n) ? n : `Dr. ${n}`);

export const C = {
  primary: '#0050cb', text: '#191c1e', muted: '#424655', secondary: '#d7e4f4', low: '#f2f4f6',
  container: '#eceef0', high: '#e6e8ea', white: '#ffffff', border: '#c2c6d8', outline: '#737687',
  errBg: '#ffdad6', errText: '#93000a', error: '#ba1a1a', primaryFixed: '#dae1ff', sec: '#53606d',
};
export const card = { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', padding: '24px' };
export const pill = (bg, color) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: bg, color, padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' });
export const btn = (bg, color, extra = {}) => ({ backgroundColor: bg, color, padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer', ...extra });

export const STATUS_UI = {
  pending: { bg: C.secondary, color: '#101d28', dot: C.sec },
  confirmed: { bg: C.primaryFixed, color: C.primary, dot: C.primary },
  completed: { bg: C.container, color: C.muted, dot: C.primary },
  cancelled: { bg: C.errBg, color: C.errText, dot: C.error },
  no_show: { bg: C.errBg, color: C.errText, dot: C.error },
};

const DAYS = [[0, 'Mon', 'Monday'], [1, 'Tue', 'Tuesday'], [2, 'Wed', 'Wednesday'], [3, 'Thu', 'Thursday'], [4, 'Fri', 'Friday'], [5, 'Sat', 'Saturday'], [6, 'Sun', 'Sunday']];
const POLICIES = ['Patients cannot book within 2 hours of current time to prevent last-minute clinic disruption.', 'Modifications to active slots take effect immediately for upcoming patient searches.', 'Pre-existing patient appointments are preserved during slot reconfigurations.'];
const Ic = ({ n, s = 16, c }) => <i className={`fa-solid ${n}`} style={{ fontSize: s, color: c }} />;
const Chip = ({ bg, children }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, backgroundColor: bg, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#101d28' }}>{children}</span>;

// حسابات الجدول (ساعات/سلوتات) مشتركة بين صفحة الـ Availability وملخّصها
export const calc = (s) => {
  const active = DAYS.filter(([k]) => s.days[k].on);
  const hours = (d) => Math.max(0, toMin(d.end) - toMin(d.start)) / 60;
  const brk = (d) => (s.breakOn ? Math.max(0, Math.min(toMin(d.end), toMin(s.bEnd)) - Math.max(toMin(d.start), toMin(s.bStart))) : 0);
  const slots = (d) => Math.max(0, Math.floor((hours(d) * 60 - brk(d)) / s.duration));
  const weekHours = active.reduce((a, [k]) => a + hours(s.days[k]), 0);
  const weekSlots = active.reduce((a, [k]) => a + slots(s.days[k]), 0);
  const maxSlots = Math.max(1, ...DAYS.map(([k]) => (s.days[k].on ? slots(s.days[k]) : 0)));
  const invalid = active.some(([k]) => hours(s.days[k]) <= 0) || (s.breakOn && toMin(s.bEnd) <= toMin(s.bStart));
  return { active, hours, slots, weekHours, weekSlots, maxSlots, invalid };
};

export function AvailabilitySummary({ user, profile, s, cur, where, doctorId }) {
  const { active, slots, weekHours, weekSlots, maxSlots } = calc(s);
  const next = (() => {
    const t = (new Date().getDay() + 6) % 7; // 0 = Monday
    for (let i = 0; i < 7; i++) { const k = (t + i) % 7; if (s.days[k].on) return { when: i === 0 ? 'Today' : DAYS[k][2], d: s.days[k] }; }
    return null;
  })();
  return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          <div style={{ ...card, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                {profile?.photo_url || user?.avatar_url ? <img src={profile?.photo_url || user.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'cover' }} /> : <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: C.secondary, display: 'grid', placeItems: 'center' }}><Ic n="fa-user" s={24} c={C.primary} /></div>}
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', backgroundColor: C.primary, border: '2px solid #fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{user?.full_name ? drName(user.full_name) : ''}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{profile?.specialty?.name}</div>
                {profile?.rating_avg != null && <div style={{ fontSize: 12, marginTop: 4 }}><i className="fa-solid fa-star" style={{ color: '#f59e0b' }} /> <b>{profile.rating_avg}</b> <span style={{ color: C.outline }}>({profile.reviews_count} reviews)</span></div>}
              </div>
            </div>
            {cur && <div style={{ padding: 14, borderRadius: 12, backgroundColor: C.low, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div style={{ fontSize: 12, color: C.outline }}>Configuring Clinic</div><div style={{ fontSize: 14, fontWeight: 600 }}>{where}</div></div><Ic n="fa-building" s={18} c={C.primary} /></div>}
          </div>

          <div style={{ ...card, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}><Ic n="fa-gauge-high" c={C.primary} /> Live Schedule Capacity</h3>
              <Chip bg={C.secondary}>Calculated</Chip>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ backgroundColor: C.low, borderRadius: 12, padding: 16 }}><div style={{ fontSize: 12, color: C.outline }}>Weekly Consulting</div><div style={{ fontSize: 24, fontWeight: 600, margin: '4px 0' }}>{+weekHours.toFixed(1)} hrs</div><div style={{ fontSize: 11, fontWeight: 600, color: C.primary }}>Across {active.length} days</div></div>
              <div style={{ backgroundColor: C.low, borderRadius: 12, padding: 16 }}><div style={{ fontSize: 12, color: C.outline }}>Available Daily</div><div style={{ fontSize: 24, fontWeight: 600, margin: '4px 0' }}>~{active.length ? Math.round(weekSlots / active.length) : 0} Slots</div><div style={{ fontSize: 11, fontWeight: 600, color: C.primary }}>At {s.duration}m / patient</div></div>
            </div>
            <div style={{ backgroundColor: C.low, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Weekly Slot Allocation <span style={{ fontSize: 12, color: C.sec, fontWeight: 500 }}>{weekSlots} Slots / Week</span></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 48, borderBottom: `1px dashed ${C.border}` }}>
                {DAYS.map(([k]) => { const n = s.days[k].on ? slots(s.days[k]) : 0; return <div key={k} style={{ width: 24, height: n > 0 ? Math.max(6, (n / maxSlots) * 44) : 4, borderRadius: 4, backgroundColor: n > 0 ? C.primary : '#e0e3e5' }} />; })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: C.outline, marginTop: 6, padding: '0 8px' }}>{DAYS.map(([k, short]) => <span key={k}>{short[0]}</span>)}</div>
            </div>
            {next && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: C.secondary }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Ic n="fa-calendar-day" s={20} c={C.primary} />
                  <div><div style={{ fontSize: 14, fontWeight: 600, color: '#101d28' }}>Next Operating Day</div><div style={{ fontSize: 13, color: '#3c4855' }}>{next.when} • {to12(next.d.start)} – {to12(next.d.end)}</div></div>
                </div>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: C.primary }} />
              </div>
            )}
            {doctorId && <Link to={`/doctors/doctor_profile/${doctorId}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, backgroundColor: C.low, color: C.primary, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Preview Public Profile & Booking <Ic n="fa-arrow-right" s={14} /></Link>}
          </div>

          <div style={{ ...card, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h4 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}><Ic n="fa-shield-halved" s={18} c={C.sec} /> Clinika Schedule Policies</h4>
            {POLICIES.map((p) => <div key={p} style={{ display: 'flex', gap: 10, fontSize: 13, color: C.muted, lineHeight: '18px' }}><Ic n="fa-check" s={14} c={C.primary} /><span>{p}</span></div>)}
          </div>
        </div>
  );
}

// ===== الـ Layout =====
const links = [
  { to: '/doctor-dashboard', label: 'Overview', icon: 'fa-table-columns', end: true },
  { to: '/doctor-dashboard/manage-appointments', label: 'Manage Appointments', icon: 'fa-calendar-days' },
  { to: '/doctor-dashboard/manage-availability', label: 'Manage Availability', icon: 'fa-clock' },
  { to: '/doctor-dashboard/my-profile', label: 'My Profile', icon: 'fa-circle-user' },
];

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem(TOKEN_KEY);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => { localStorage.removeItem(TOKEN_KEY); navigate('/login'); }, [navigate]);

  const load = useCallback(async () => {
    try {
      const u = await api.get('/auth/me');
      setUser(u.data);
      if (u.data.role !== 'doctor') {
        setError('This account is not a doctor account. Please sign in with an approved doctor account.');
      } else {
        setProfile((await api.get('/doctors/me/profile')).data);
        setError('');
      }
    } catch (e) {
      if (e?.response?.status === 401) return logout();
      setError(errMsg(e));
    }
    setReady(true);
  }, [logout]);
// eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(() => { if (token) load(); }, [token, load]);
  if (!token) return <Navigate to="/login" replace />;

  const name = user?.full_name || '';
  const avatar = profile?.photo_url || user?.avatar_url;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f7f9fb', fontFamily: 'Inter, sans-serif', color: C.text }}>
      <Helmet><title>Doctor Dashboard | Clinika</title></Helmet>

      <aside style={{ width: 288, flexShrink: 0, backgroundColor: '#fff', padding: '24px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px', marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#1b68f6', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 4px 14px rgba(27,104,246,0.28)' }}><i className="fa-solid fa-plus" /></div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}>Clinika</div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: C.primary, marginTop: 4 }}>DOCTOR PORTAL</div>
            </div>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 16 }}>
            {links.map(({ to, label, icon, end }) => (
              <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, textDecoration: 'none', fontSize: 14, fontWeight: 600,
                backgroundColor: isActive ? '#1b68f6' : 'transparent', color: isActive ? '#fff' : C.muted,
                boxShadow: isActive ? '0 4px 14px rgba(27,104,246,0.28)' : 'none',
              })}>
                <i className={`fa-solid ${icon}`} style={{ width: 20, textAlign: 'center' }} />{label}
              </NavLink>
            ))}
          </nav>
        </div>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: 'none', background: 'none', color: C.error, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          <i className="fa-solid fa-right-from-bracket" style={{ width: 20, textAlign: 'center' }} />Logout
        </button>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 40, height: 64, backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted, fontWeight: 500 }}>
            Clinika Practice Network
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: C.border }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: C.secondary, color: '#101d28', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: C.primary }} />Online Consultation Ready
            </span>
          </div>
          <Link to="/doctor-dashboard/my-profile" title="Account settings" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: C.text }}>
            <span style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, lineHeight: '20px' }}>{name ? drName(name) : '...'}</span>
              <span style={{ display: 'block', fontSize: 12, color: C.muted }}>{profile?.specialty?.name || ''}</span>
            </span>
            {avatar
              ? <img src={avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              : <span style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: C.primary, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14 }}><i className="fa-solid fa-user" /></span>}
          </Link>
        </header>

        <main style={{ padding: '32px 32px 48px' }}>
          {!ready ? <div style={{ color: C.muted }}>Loading...</div>
            : error ? (
              <div style={{ backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.05)', padding: '56px 24px', textAlign: 'center', maxWidth: 520, margin: '40px auto' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: C.errBg, color: C.error, display: 'grid', placeItems: 'center', margin: '0 auto 16px', fontSize: 28 }}><i className="fa-solid fa-user-slash" /></div>
                <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>Can't load the doctor dashboard</h2>
                <p style={{ fontSize: 14, color: C.muted, margin: '0 0 20px', lineHeight: '22px' }}>{error}</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button onClick={() => { setReady(false); load(); }} style={{ backgroundColor: C.low, color: C.text, padding: '10px 18px', borderRadius: 12, border: 'none', fontWeight: 600, cursor: 'pointer' }}>Try again</button>
                  <button onClick={logout} style={{ backgroundColor: C.primary, color: '#fff', padding: '10px 18px', borderRadius: 12, border: 'none', fontWeight: 600, cursor: 'pointer' }}>Back to login</button>
                </div>
              </div>
            ) : <Outlet context={{ user, profile, refresh: load }} />}
        </main>
      </div>
    </div>
  );
}
