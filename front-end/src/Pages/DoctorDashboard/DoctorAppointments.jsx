import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';

const TOKEN = 'token';
const API = 'https://clinika-backend.vercel.app';
const C = { p: '#0050cb', t: '#191c1e', m: '#424655', s: '#d7e4f4', low: '#f2f4f6', cnt: '#eceef0', w: '#fff', b: '#c2c6d8', eb: '#ffdad6', et: '#93000a', er: '#ba1a1a', pf: '#dae1ff' };
const card = { background: C.w, borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.05)', padding: 22 };
const btn = (bg, color, ex = {}) => ({ background: bg, color, padding: '9px 14px', borderRadius: 12, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, ...ex });
const UI = {
  pending: { bg: C.s, c: '#101d28', d: '#53606d' },
  confirmed: { bg: C.pf, c: C.p, d: C.p },
  completed: { bg: C.cnt, c: C.m, d: '#16a34a' },
  cancelled: { bg: C.eb, c: C.et, d: C.er },
  no_show: { bg: C.eb, c: C.et, d: C.er },
};
const hhmm = (t) => (typeof t === 'string' ? t.slice(0, 5) : '00:00');
const toMin = (t) => {
  const x = hhmm(t);
  return Number(x.slice(0, 2)) * 60 + Number(x.slice(3, 5));
};
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
const hdr = () => {
  const t = localStorage.getItem(TOKEN);
  return t ? { Authorization: `Bearer ${t}` } : {};
};
const mins = (a) => Math.max(0, toMin(hhmm(a.end_time)) - toMin(hhmm(a.start_time)));
const typeLabel = (a) => (a.consultation_type === 'online' ? 'Online Consultation' : `In-person${a.clinic?.name ? ` (${a.clinic.name})` : ''}`);

export default function DoctorAppointments() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [details, setDetails] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [reason, setReason] = useState('');

  const fetchList = useCallback(async () => {
    if (!localStorage.getItem(TOKEN)) {
      setError('Authentication required.');
      setLoading(false);
      return;
    }
    try {
      const r = await axios.get(`${API}/appointments`, { headers: hdr(), params: { limit: 100 } });
      setList(Array.isArray(r.data) ? r.data : []);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetchList);
  }, [fetchList]);

  const act = async (id, fn) => {
    setBusyId(id);
    setError('');
    try {
      await fn();
      await fetchList();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };
  const setStatus = (id, status) => act(id, () => axios.patch(`${API}/appointments/${id}/status`, { status }, { headers: hdr() }));
  const cancelAppt = (a) => {
    const p = reason.trim() ? { reason: reason.trim() } : {};
    setConfirm(null);
    act(a.id, () => axios.patch(`${API}/appointments/${a.id}/cancel`, p, { headers: hdr() }));
  };

  const count = (s) => list.filter((a) => a.status === s).length;
  const visible = list.filter((a) => (filter === 'all' || a.status === filter) && String(a.patient?.full_name || '').toLowerCase().includes(search.toLowerCase().trim()));
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Helmet><title>Doctor Appointments | Clinika</title></Helmet>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: C.m }}>
            Doctor Dashboard <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} /> <b style={{ color: C.p }}>Manage Appointments</b>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 700, margin: '4px 0' }}>Manage Appointments</h1>
        </div>
        <div style={{ ...card, padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>
          <i className="fa-regular fa-calendar" style={{ color: C.p }} /> Today: {today}
        </div>
      </div>

      {error && (
        <div style={{ ...card, background: C.eb, color: C.et, padding: 14, fontSize: 13 }}>
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[
          ['Pending', `${loading ? '...' : count('pending')} Requests`, 'fa-hourglass-half', C.s],
          ['Confirmed', `${loading ? '...' : count('confirmed')} Sessions`, 'fa-calendar-check', C.pf],
          ['Total', `${loading ? '...' : list.length} Bookings`, 'fa-notes-medical', C.cnt],
        ].map(([k, v, ic, bg]) => (
          <div key={k} style={{ ...card, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: C.m, fontWeight: 600 }}>{k}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{v}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'grid', placeItems: 'center' }}>
              <i className={`fa-solid ${ic}`} style={{ color: C.p, fontSize: 18 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            ['all', `All (${list.length})`],
            ['pending', `Pending (${count('pending')})`],
            ['confirmed', `Confirmed (${count('confirmed')})`],
            ['completed', `Completed (${count('completed')})`],
          ].map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} style={filter === k ? btn(C.p, C.w) : btn('transparent', C.m)}>
              {lbl}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.m, fontSize: 13 }} />
          <input
            placeholder="Search patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: C.low, border: 'none', outline: 'none', padding: '9px 14px 9px 34px', borderRadius: 12, fontSize: 13 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: 'center', color: C.m }}><i className="fa-solid fa-spinner fa-spin" /> Loading...</div>
      ) : !visible.length ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <i className="fa-solid fa-calendar-xmark" style={{ fontSize: 32, color: C.m }} />
          <h3 style={{ margin: '12px 0 6px' }}>No appointments found</h3>
          <button type="button" onClick={() => { setFilter('all'); setSearch(''); }} style={btn(C.p, C.w)}>
            <i className="fa-solid fa-rotate-left" /> Reset
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {visible.map((a) => {
            const s = UI[a.status] || UI.cancelled;
            const busy = busyId === a.id;
            return (
              <div key={a.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, color: s.c, display: 'grid', placeItems: 'center', fontSize: 18 }}>
                    <i className="fa-solid fa-user" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{a.patient?.full_name || 'Patient'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: s.bg, color: s.c, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                        <i className="fa-solid fa-circle" style={{ fontSize: 6, color: s.d }} />
                        {String(a.status || '').replace('_', ' ')}
                      </span>
                      <span style={{ padding: '3px 10px', borderRadius: 999, background: C.low, color: C.m, fontSize: 12, fontWeight: 600 }}>
                        <i className={`fa-solid ${a.consultation_type === 'online' ? 'fa-video' : 'fa-door-open'}`} /> {typeLabel(a)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.m }}>
                      <i className="fa-regular fa-clock" style={{ color: C.p }} /> {fmtDate(a.appointment_date)}{' '}
                      <i className="fa-solid fa-circle" style={{ fontSize: 4 }} /> {to12(hhmm(a.start_time))}{' '}
                      <i className="fa-solid fa-circle" style={{ fontSize: 4 }} /> {mins(a)} mins
                    </div>
                    {a.reason && <div style={{ fontSize: 13 }}><b>Reason:</b> {a.reason}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setDetails(a)} style={btn(C.cnt, C.t)}>
                    <i className="fa-regular fa-eye" /> Details
                  </button>
                  {a.status === 'pending' && (
                    <>
                      <button type="button" disabled={busy} onClick={() => { setReason(''); setConfirm({ type: 'reject', appt: a }); }} style={btn(C.eb, C.et)}>
                        <i className="fa-solid fa-xmark" /> Decline
                      </button>
                      <button type="button" disabled={busy} onClick={() => setStatus(a.id, 'confirmed')} style={btn(C.p, C.w)}>
                        <i className="fa-solid fa-check" /> Accept
                      </button>
                    </>
                  )}
                  {a.status === 'confirmed' && (
                    <>
                      <button type="button" disabled={busy} onClick={() => { setReason(''); setConfirm({ type: 'cancel', appt: a }); }} style={btn(C.cnt, C.er)}>
                        <i className="fa-solid fa-ban" /> Cancel
                      </button>
                      <button type="button" disabled={busy} onClick={() => setStatus(a.id, 'completed')} style={btn(C.pf, C.p)}>
                        <i className="fa-solid fa-circle-check" /> Completed
                      </button>
                      <button type="button" disabled={busy} onClick={() => setStatus(a.id, 'no_show')} style={btn(C.low, C.m)}>
                        <i className="fa-solid fa-user-slash" /> No Show
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {details && (
        <div onClick={() => setDetails(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', padding: 16, zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 480, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Appointment Details</h3>
              <button type="button" onClick={() => setDetails(null)} style={btn(C.cnt, C.m)}><i className="fa-solid fa-xmark" /></button>
            </div>
            {[
              ['Patient', details.patient?.full_name || 'N/A'],
              ['Phone', details.patient?.phone || 'Not provided'],
              ['Date & Time', `${fmtDate(details.appointment_date)} ${to12(hhmm(details.start_time))} (${mins(details)}m)`],
              ['Type', typeLabel(details)],
              ['Status', String(details.status || '').replace('_', ' ')],
              ['Reason', details.reason || 'None'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                <span style={{ color: C.m }}>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirm && (
        <div onClick={() => setConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', padding: 16, zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: C.er }} />{' '}
              {confirm.type === 'reject' ? 'Decline Request?' : 'Cancel Appointment?'}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: C.m }}>Patient: <b>{confirm.appt.patient?.full_name || 'Patient'}</b></p>
            <input
              placeholder="Optional reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.b}`, fontSize: 13 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setConfirm(null)} style={btn(C.cnt, C.t)}>Keep</button>
              <button type="button" onClick={() => cancelAppt(confirm.appt)} style={btn(C.er, C.w)}>
                <i className="fa-solid fa-check" /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}