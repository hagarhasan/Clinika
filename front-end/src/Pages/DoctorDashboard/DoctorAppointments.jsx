import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';

const API = 'https://clinika-backend.vercel.app';
const TOKEN_KEY = 'token'; // غيّريه لو Login.jsx بيخزن باسم تاني
const STATUS = { pending: 'pending', confirmed: 'confirmed', completed: 'completed', cancelled: 'cancelled' };

// مكان واحد لمطابقة أسماء الحقول مع الـ Response
const normalize = (a) => ({
  id: a.id ?? a._id,
  patient: a.patient_name ?? a.patientName ?? a.patient?.name ?? a.patient?.full_name ?? (typeof a.patient === 'string' ? a.patient : 'Unknown patient'),
  date: a.date ?? a.appointment_date ?? a.appointmentDate ?? '',
  time: a.time ?? a.appointment_time ?? a.start_time ?? '',
  duration: Number(a.duration ?? a.duration_minutes) || null,
  type: a.type ?? a.consultation_type ?? '',
  reason: a.reason ?? a.notes ?? '',
  notes: a.doctor_notes ?? a.clinical_notes ?? '',
  status: String(a.status ?? '').toLowerCase(),
});

const extractList = (data) => (Array.isArray(data) ? data : data?.appointments ?? data?.data ?? []);
const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const isOnline = (t) => /online|video|tele/i.test(t || '');

const C = {
  primary: '#0050cb', text: '#191c1e', muted: '#424655', secondary: '#d7e4f4', low: '#f2f4f6',
  container: '#eceef0', high: '#e6e8ea', white: '#ffffff', border: '#c2c6d8', errBg: '#ffdad6',
  errText: '#93000a', error: '#ba1a1a', primaryFixed: '#dae1ff', secondaryFixed: '#d7e4f4',
};
const shadow = '0 1px 8px rgba(0,0,0,0.05)';
const card = { backgroundColor: C.white, borderRadius: '16px', boxShadow: shadow };
const pill = (bg, color) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: bg, color, padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' });
const btn = (bg, color, extra = {}) => ({ backgroundColor: bg, color, padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer', ...extra });

const statusUI = {
  [STATUS.pending]: { bg: C.secondary, color: '#101d28', dot: '#53606d', avatarBg: C.secondaryFixed, avatarColor: '#101d28' },
  [STATUS.confirmed]: { bg: C.primaryFixed, color: C.primary, dot: C.primary, avatarBg: C.primaryFixed, avatarColor: C.primary },
  [STATUS.completed]: { bg: C.container, color: C.muted, dot: '#16a34a', avatarBg: C.container, avatarColor: C.muted },
  [STATUS.cancelled]: { bg: C.errBg, color: C.errText, dot: C.error, avatarBg: C.container, avatarColor: C.muted },
};

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [details, setDetails] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: 'reject' | 'cancel', appt }

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

  const load = useCallback(() => {
    return fetch(`${API}/doctors/appointments`, { headers: headers() })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data) => { setAppointments(extractList(data).map(normalize)); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`${API}/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const runConfirm = async () => {
    const { appt } = confirm;
    setConfirm(null);
    await updateStatus(appt.id, STATUS.cancelled);
  };

  const count = (s) => appointments.filter((a) => a.status === s).length;
  const val = (n) => (loading ? '...' : n);
  const visible = appointments.filter(
    (a) => (filter === 'all' || a.status === filter) && a.patient.toLowerCase().includes(search.toLowerCase().trim())
  );
  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const tabs = [
    { key: 'all', label: `All (${appointments.length})` },
    { key: STATUS.pending, label: `Pending (${count(STATUS.pending)})` },
    { key: STATUS.confirmed, label: `Confirmed (${count(STATUS.confirmed)})` },
    { key: STATUS.completed, label: `Completed (${count(STATUS.completed)})` },
  ];

  const metrics = [
    { label: 'Action Required', value: `${val(count(STATUS.pending))} Requests`, note: 'Pending confirmation', icon: '⏳', bg: C.secondaryFixed },
    { label: 'Active Scheduled', value: `${val(count(STATUS.confirmed))} Sessions`, note: 'Confirmed bookings', icon: '📅', bg: C.primaryFixed },
    { label: 'Total Load', value: `${val(appointments.length)} Bookings`, note: 'All appointments', icon: '📋', bg: C.container },
  ];

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: C.text, display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <Helmet><title>Doctor Appointments | Clinika</title></Helmet>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', color: C.muted }}>
            Doctor Dashboard › <b style={{ color: C.primary }}>Manage Appointments</b>
          </div>
          <h1 style={{ fontSize: '40px', lineHeight: '48px', fontWeight: 700, letterSpacing: '-0.025em', margin: '4px 0' }}>Manage Appointments</h1>
          <p style={{ fontSize: '14px', color: C.muted, margin: 0 }}>Review appointment requests, coordinate daily workflow, and manage consultation schedules.</p>
        </div>
        <div style={{ ...card, padding: '8px 14px', fontSize: '14px', fontWeight: 600 }}>📆 Today: {todayLabel}</div>
      </div>

      {error && (
        <div style={{ ...card, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px', padding: '14px 20px' }}>
          {error}
        </div>
      )}

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ ...card, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
              <div style={{ fontSize: '24px', fontWeight: 600, margin: '4px 0 2px' }}>{m.value}</div>
              <div style={{ fontSize: '13px', color: C.muted }}>{m.note}</div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: '12px', backgroundColor: m.bg, display: 'grid', placeItems: 'center', fontSize: '22px' }}>{m.icon}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ ...card, padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              style={filter === t.key
                ? btn(C.primary, C.white, { boxShadow: '0 2px 8px rgba(27,104,246,0.24)' })
                : btn('transparent', C.muted)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="🔍 Search patient name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ backgroundColor: C.low, border: 'none', outline: 'none', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', minWidth: '260px' }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ ...card, padding: '40px', textAlign: 'center', color: C.muted }}>Loading...</div>
      ) : visible.length === 0 ? (
        <div style={{ ...card, borderRadius: '24px', padding: '72px 16px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: C.low, display: 'grid', placeItems: 'center', fontSize: '38px', margin: '0 auto 16px' }}>🗓️</div>
          <h3 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>No appointments found</h3>
          <p style={{ fontSize: '14px', color: C.muted, maxWidth: '380px', margin: '4px auto 20px' }}>
            There are no consultation appointments matching your current criteria or filter selection.
          </p>
          <button onClick={() => { setFilter('all'); setSearch(''); }} style={btn(C.primary, C.white, { padding: '10px 20px', boxShadow: '0 4px 14px rgba(27,104,246,0.28)' })}>
            Reset Filter
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {visible.map((a) => {
            const s = statusUI[a.status] || statusUI[STATUS.cancelled];
            const busy = busyId === a.id;
            const online = isOnline(a.type);
            return (
              <div key={a.id} style={{ ...card, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', opacity: a.status === STATUS.completed ? 0.85 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', minWidth: 0 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '16px', backgroundColor: s.avatarBg, color: s.avatarColor, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '18px', flexShrink: 0 }}>
                    {initials(a.patient)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 600 }}>{a.patient}</span>
                      <span style={pill(s.bg, s.color)}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.dot }} /> {a.status || 'unknown'}
                      </span>
                      {a.type && (
                        <span style={{ ...pill(online ? C.primaryFixed : C.low, online ? C.primary : C.muted), textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
                          {online ? '📹' : '🚪'} {a.type}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: C.muted }}>
                      🕒 {[a.date, a.time].filter(Boolean).join(' • ') || '—'}{a.duration ? ` • ${a.duration} mins` : ''}
                    </div>
                    {a.reason && (
                      <p style={{ fontSize: '14px', margin: '4px 0 0' }}>
                        <b style={{ color: C.muted }}>Reason:</b> "{a.reason}"
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={() => setDetails(a)} style={btn(C.container, C.text)}>View Details</button>
                  {a.status === STATUS.pending && (
                    <>
                      <button disabled={busy} onClick={() => setConfirm({ type: 'reject', appt: a })} style={btn(C.errBg, C.errText)}>Reject</button>
                      <button disabled={busy} onClick={() => updateStatus(a.id, STATUS.confirmed)} style={btn(C.primary, C.white, { padding: '10px 20px', boxShadow: '0 4px 14px rgba(27,104,246,0.28)' })}>Accept</button>
                    </>
                  )}
                  {a.status === STATUS.confirmed && (
                    <>
                      <button disabled={busy} onClick={() => setConfirm({ type: 'cancel', appt: a })} style={btn(C.container, C.error)}>Cancel</button>
                      <button disabled={busy} onClick={() => updateStatus(a.id, STATUS.completed)} style={btn(C.primaryFixed, C.primary)}>Mark as Completed</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details modal */}
      {details && (
        <div onClick={() => setDetails(null)} style={overlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, borderRadius: '24px', maxWidth: '520px', width: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: C.primaryFixed, display: 'grid', placeItems: 'center' }}>📅</div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Appointment Details</h3>
                  <span style={{ fontSize: '12px', color: C.muted }}>Reference #{details.id}</span>
                </div>
              </div>
              <button onClick={() => setDetails(null)} style={{ ...btn(C.container, C.muted), padding: '6px 11px', borderRadius: '50%' }}>✕</button>
            </div>

            <div style={{ backgroundColor: C.low, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                ['Patient Name', details.patient],
                ['Date & Time', [details.date, details.time, details.duration && `${details.duration} mins`].filter(Boolean).join(' • ') || '—'],
                ['Consultation Type', details.type || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                  <span style={{ fontSize: '12px', color: C.muted }}>{k}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: C.muted }}>Current Status</span>
                <span style={pill((statusUI[details.status] || statusUI[STATUS.cancelled]).bg, (statusUI[details.status] || statusUI[STATUS.cancelled]).color)}>{details.status || 'unknown'}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Reason for Visit</div>
              <p style={{ fontSize: '14px', color: C.muted, backgroundColor: C.container, padding: '14px', borderRadius: '12px', margin: 0 }}>{details.reason || '—'}</p>
            </div>
            {details.notes && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Doctor Clinical Notes</div>
                <p style={{ fontSize: '14px', color: C.muted, backgroundColor: C.container, padding: '14px', borderRadius: '12px', margin: 0 }}>{details.notes}</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setDetails(null)} style={btn(C.container, C.text, { padding: '10px 24px' })}>Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div onClick={() => setConfirm(null)} style={overlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, borderRadius: '24px', maxWidth: '440px', width: '100%', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '16px', backgroundColor: C.errBg, display: 'grid', placeItems: 'center', fontSize: '24px' }}>⚠️</div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px' }}>
                {confirm.type === 'reject' ? 'Reject Appointment Request?' : 'Cancel Appointment?'}
              </h3>
              <p style={{ fontSize: '14px', color: C.muted, margin: 0, lineHeight: '22px' }}>
                {confirm.type === 'reject'
                  ? <>Are you sure you want to decline this appointment request for <b style={{ color: C.text }}>{confirm.appt.patient}</b>? The patient will be notified to choose an alternative slot.</>
                  : <>Are you sure you want to cancel the confirmed appointment with <b style={{ color: C.text }}>{confirm.appt.patient}</b>? The patient will be notified.</>}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setConfirm(null)} style={btn(C.container, C.text, { padding: '10px 20px' })}>
                {confirm.type === 'reject' ? 'Keep Request' : 'Keep Appointment'}
              </button>
              <button onClick={runConfirm} style={btn(C.error, C.white, { padding: '10px 20px', boxShadow: '0 4px 14px rgba(186,26,26,0.25)' })}>
                {confirm.type === 'reject' ? 'Confirm Rejection' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, backgroundColor: 'rgba(45,49,51,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 };
