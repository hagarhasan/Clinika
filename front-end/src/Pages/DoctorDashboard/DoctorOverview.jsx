import { useEffect, useState } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { Link, useOutletContext } from 'react-router-dom';

const TOKEN = 'token';
const API = 'https://clinika-backend.vercel.app';
const C = { p: '#0050cb', m: '#424655', s: '#d7e4f4', low: '#f2f4f6', cnt: '#eceef0', w: '#fff', eb: '#ffdad6', et: '#93000a', er: '#ba1a1a', pf: '#dae1ff' };
const card = { background: C.w, borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.05)', padding: 24 };
const UI = {
  pending: { bg: C.s, c: '#101d28', d: '#53606d' },
  confirmed: { bg: C.pf, c: C.p, d: C.p },
  completed: { bg: C.cnt, c: C.m, d: '#16a34a' },
  cancelled: { bg: C.eb, c: C.et, d: C.er },
  no_show: { bg: C.eb, c: C.et, d: C.er },
};
const hhmm = (t) => (typeof t === 'string' ? t.slice(0, 5) : '00:00');
const to12 = (t) => {
  const x = hhmm(t);
  const h = Number(x.slice(0, 2));
  return `${String(h % 12 || 12).padStart(2, '0')}:${x.slice(3, 5)} ${h < 12 ? 'AM' : 'PM'}`;
};
const fmtDate = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not specified');
const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  return typeof d === 'string' ? d : Array.isArray(d) ? d.map((x) => x.msg || String(x)).join(', ') : e?.message || 'Request failed';
};

export default function DoctorOverview() {
  const { user, profile } = useOutletContext() || {};
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const token = localStorage.getItem(TOKEN);
      if (!token) {
        if (alive) { setError('Authentication required.'); setLoading(false); }
        return;
      }
      try {
        const r = await axios.get(`${API}/appointments`, { headers: { Authorization: `Bearer ${token}` }, params: { limit: 100 } });
        if (alive) { setList(Array.isArray(r.data) ? r.data : []); setError(''); }
      } catch (e) {
        if (alive) setError(errMsg(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, []);

  const by = (s) => list.filter((a) => a.status === s).length;
  const stats = [
    ['Pending', loading ? '...' : by('pending'), 'fa-hourglass-half', C.s],
    ['Confirmed', loading ? '...' : by('confirmed'), 'fa-calendar-check', C.pf],
    ['Completed', loading ? '...' : by('completed'), 'fa-circle-check', C.cnt],
    ['Total', loading ? '...' : list.length, 'fa-notes-medical', C.low],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Helmet><title>Doctor Overview | Clinika</title></Helmet>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: C.m }}>
            Doctor Dashboard <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} /> <b style={{ color: C.p }}>Overview</b>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 700, margin: '4px 0' }}>Welcome, {profile?.full_name || user?.full_name || 'Doctor'}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/doctor-dashboard/manage-availability" style={{ padding: '10px 16px', borderRadius: 12, background: C.cnt, color: '#191c1e', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            <i className="fa-solid fa-clock" /> Availability
          </Link>
          <Link to="/doctor-dashboard/manage-appointments" style={{ padding: '10px 16px', borderRadius: 12, background: C.p, color: C.w, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            <i className="fa-solid fa-calendar-check" /> Appointments
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ ...card, background: C.eb, color: C.et, padding: 14, fontSize: 13 }}>
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
        {stats.map(([k, v, ic, bg]) => (
          <div key={k} style={{ ...card, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: C.m, fontWeight: 600 }}>{k}</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{v}</div>
            </div>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: 'grid', placeItems: 'center' }}>
              <i className={`fa-solid ${ic}`} style={{ color: C.p, fontSize: 18 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Recent Appointments</h2>
          <Link to="/doctor-dashboard/manage-appointments" style={{ fontSize: 13, fontWeight: 600, color: C.p, textDecoration: 'none' }}>
            All <i className="fa-solid fa-arrow-right" />
          </Link>
        </div>
        {loading ? (
          <div style={{ color: C.m, padding: 16 }}><i className="fa-solid fa-spinner fa-spin" /> Loading...</div>
        ) : !list.length ? (
          <div style={{ color: C.m, padding: 16 }}>No appointments found.</div>
        ) : (
          list.slice(0, 5).map((a) => {
            const s = UI[a.status] || UI.cancelled;
            return (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: 12, borderRadius: 12, background: C.low, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <i className="fa-solid fa-user" style={{ color: C.p }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.patient?.full_name || 'Patient'}</div>
                    <div style={{ fontSize: 12, color: C.m }}>
                      <i className="fa-regular fa-clock" /> {fmtDate(a.appointment_date)}{' '}
                      <i className="fa-solid fa-circle" style={{ fontSize: 4 }} /> {to12(hhmm(a.start_time))}
                    </div>
                  </div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: s.bg, color: s.c, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  <i className="fa-solid fa-circle" style={{ fontSize: 7, color: s.d }} />
                  {String(a.status || '').replace('_', ' ')}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}