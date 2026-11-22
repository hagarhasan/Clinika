import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

const TOKEN = 'token';
const API = 'https://clinika-backend.vercel.app';
const C = { p: '#0050cb', t: '#191c1e', m: '#424655', low: '#f2f4f6', w: '#fff', b: '#c2c6d8', eb: '#ffdad6', et: '#93000a', pf: '#dae1ff' };
const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  return typeof d === 'string' ? d : Array.isArray(d) ? d.map((x) => x.msg || String(x)).join(', ') : e?.message || 'Request failed';
};
const NAV = [
  { to: '/doctor-dashboard', label: 'Overview', icon: 'fa-chart-line', end: true },
  { to: '/doctor-dashboard/manage-appointments', label: 'Appointments', icon: 'fa-calendar-check' },
  { to: '/doctor-dashboard/manage-availability', label: 'Availability', icon: 'fa-clock' },
  { to: '/doctor-dashboard/my-profile', label: 'Account & Profile', icon: 'fa-gear' },
];

export default function DoctorDashboard() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem(TOKEN);
    if (!token) {
      nav('/login', { replace: true });
      return;
    }
    let alive = true;
    const headers = { Authorization: `Bearer ${token}` };
    axios.get(`${API}/auth/me`, { headers })
      .then((r) => {
        if (!alive) return;
        if (String(r.data?.role || '').toLowerCase() !== 'doctor') {
          nav('/login', { replace: true });
          return;
        }
        setUser(r.data);
        return axios.get(`${API}/doctors/me`, { headers }).then((d) => alive && setProfile(d.data));
      })
      .catch((e) => {
        if (!alive) return;
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          localStorage.removeItem(TOKEN);
          nav('/login', { replace: true });
          return;
        }
        setError(errMsg(e));
      })
      .finally(() => alive && setChecking(false));
    return () => { alive = false; };
  }, [nav]);

  const logout = () => {
    localStorage.removeItem(TOKEN);
    nav('/login', { replace: true });
  };

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: C.m, background: C.low }}>
        <span><i className="fa-solid fa-spinner fa-spin" /> Checking session...</span>
      </div>
    );
  }

  const name = profile?.full_name || user?.full_name || 'Doctor';
  const spec = profile?.specialty?.name || 'Specialty not set';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexWrap: 'wrap', background: C.low, color: C.t }}>
      <aside style={{ width: 264, background: C.w, borderRight: `1px solid ${C.b}`, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.p, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fa-solid fa-hospital" /><span>Clinika</span>
          </div>
          <Link to="/doctor-dashboard/my-profile" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: C.low, textDecoration: 'none', color: C.t, border: `1px solid ${C.b}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.pf, color: C.p, display: 'grid', placeItems: 'center', fontSize: 17 }}>
              <i className="fa-solid fa-user-doctor" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: 12, color: C.m, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spec}</div>
            </div>
          </Link>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  background: isActive ? C.pf : 'transparent',
                  color: isActive ? C.p : C.m,
                })}
              >
                <i className={`fa-solid ${item.icon}`} style={{ width: 16 }} /><span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <button
          type="button"
          onClick={logout}
          style={{ padding: '10px 14px', borderRadius: 12, border: 'none', background: C.eb, color: C.et, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <i className="fa-solid fa-right-from-bracket" /><span>Sign Out</span>
        </button>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: C.w, borderBottom: `1px solid ${C.b}`, padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.m }}>
            <i className="fa-solid fa-stethoscope" style={{ color: C.p }} /> Doctor Workspace
          </div>
          <Link to="/doctor-dashboard/my-profile" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: C.t, padding: '6px 12px', borderRadius: 10, background: C.low }}>
            <i className="fa-solid fa-user-doctor" style={{ color: C.p, fontSize: 16 }} />
            <span>
              <b style={{ display: 'block', fontSize: 13 }}>{name}</b>
              <small style={{ color: C.m }}>{spec}</small>
            </span>
          </Link>
        </header>
        <main style={{ flex: 1, padding: 28 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {error && (
              <div style={{ background: C.eb, color: C.et, padding: '12px 16px', borderRadius: 12, fontSize: 13, marginBottom: 18 }}>
                <i className="fa-solid fa-circle-exclamation" /> {error}
              </div>
            )}
            <Outlet context={{ user, profile, setUser, setProfile }} />
          </div>
        </main>
      </div>
    </div>
  );
}