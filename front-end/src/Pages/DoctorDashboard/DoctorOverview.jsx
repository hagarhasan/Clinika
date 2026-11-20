import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

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
  status: String(a.status ?? '').toLowerCase(),
});

const extractList = (data) => (Array.isArray(data) ? data : data?.appointments ?? data?.data ?? []);

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isToday = (d) => !!d && String(d).startsWith(localDate());
const isOnline = (t) => /online|video|tele/i.test(t || '');
const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// اسم الدكتور: عدّلي المصدر حسب اللي Login.jsx بيخزنه
const getDoctorName = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.name ?? u.full_name ?? u.fullName ?? '';
  } catch {
    return '';
  }
};

const C = {
  primary: '#0050cb', primaryContainer: '#1b68f6', text: '#191c1e', muted: '#424655',
  secondary: '#d7e4f4', low: '#f2f4f6', high: '#e6e8ea', white: '#ffffff', border: '#c2c6d8',
  errBg: '#ffdad6', errText: '#93000a', tertiary: '#dae2fd', primaryFixed: '#dae1ff', onPrimaryFixed: '#003fa3',
};
const shadow = '0 1px 8px rgba(0,0,0,0.05)';
const card = { backgroundColor: C.white, borderRadius: '16px', boxShadow: shadow, padding: '24px' };
const pill = (bg, color) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: bg, color, padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 });

const statusStyle = {
  [STATUS.confirmed]: { bg: C.secondary, color: '#101d28', dot: C.primary },
  [STATUS.pending]: { bg: C.errBg, color: C.errText, dot: '#ba1a1a' },
  [STATUS.completed]: { bg: '#dcfce7', color: '#166534', dot: '#16a34a' },
  [STATUS.cancelled]: { bg: C.high, color: C.muted, dot: '#737687' },
};

export default function DoctorOverview() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${API}/doctors/appointments`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data) => setAppointments(extractList(data).map(normalize)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const doctorName = getDoctorName();
  const todayList = appointments.filter((a) => isToday(a.date));
  const pending = appointments.filter((a) => a.status === STATUS.pending).length;
  const completed = appointments.filter((a) => a.status === STATUS.completed).length;
  const onlineCount = todayList.filter((a) => isOnline(a.type)).length;
  const bookedMinutes = todayList.filter((a) => a.status !== STATUS.cancelled).reduce((s, a) => s + (a.duration || 0), 0);
  const val = (n) => (loading ? '...' : n);
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const metrics = [
    { label: "Today's Appointments", value: todayList.length, icon: '📅', iconBg: C.secondary, badge: 'Today', badgeStyle: pill(C.tertiary, '#3c4855'), foot: `${onlineCount} online • ${todayList.length - onlineCount} in-person` },
    { label: 'Pending Requests', value: pending, icon: '⏳', iconBg: 'rgba(255,218,214,0.5)', badge: pending > 0 ? 'Action needed' : 'All clear', badgeStyle: pending > 0 ? pill(C.errBg, C.errText) : pill(C.high, C.text), foot: 'Awaiting your confirmation' },
    { label: 'Completed Appointments', value: completed, icon: '✅', iconBg: C.low, badge: 'Total', badgeStyle: pill(C.high, C.text), foot: 'Finished consultations' },
  ];

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: C.text, display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <Helmet><title>Doctor Overview | Clinika</title></Helmet>

      {/* Breadcrumb + context */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '12px', color: C.muted }}>
          Doctor Dashboard <span style={{ color: C.border }}>/</span> <b style={{ color: C.primary, fontSize: '14px' }}>Overview</b>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ ...pill(C.low, C.text), fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: C.primary }} /> Clinic Open
          </span>
          <span style={{ ...pill(C.white, C.muted), boxShadow: shadow }}>📆 Today • {todayLabel}</span>
        </div>
      </div>

      {error && (
        <div style={{ ...card, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px', padding: '16px 24px' }}>
          Could not load appointments: {error}
        </div>
      )}

      {/* Welcome banner */}
      <div style={{ ...card, padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', background: 'linear-gradient(to left, rgba(0,80,203,0.06), #ffffff 60%)' }}>
        <div style={{ maxWidth: '640px' }}>
          <span style={{ ...pill(C.secondary, '#101d28'), borderRadius: '6px', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>🩺 Clinical Schedule Active</span>
          <h1 style={{ fontSize: '40px', lineHeight: '48px', fontWeight: 700, letterSpacing: '-0.025em', margin: '12px 0 8px' }}>
            Welcome back{doctorName ? `, ${doctorName}` : ', Doctor'}
          </h1>
          <p style={{ fontSize: '16px', lineHeight: '26px', color: C.muted, margin: 0 }}>
            {loading ? 'Loading your schedule...' : (
              <>Here is an overview of your appointments for today. You have <b style={{ color: C.primary }}>{todayList.length} consultation{todayList.length === 1 ? '' : 's'}</b> lined up.</>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/doctor-dashboard/manage-availability" style={{ backgroundColor: C.low, color: C.text, padding: '10px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
            🕒 Manage Availability
          </Link>
          <Link to="/doctor-dashboard/manage-appointments" style={{ backgroundColor: C.primary, color: C.white, padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(27,104,246,0.28)' }}>
            📅 View All Appointments
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
        {metrics.map((m) => (
          <div key={m.label} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: C.muted }}>{m.label}</span>
              <span style={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: m.iconBg, display: 'grid', placeItems: 'center', fontSize: '18px' }}>{m.icon}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '20px' }}>
              <span style={{ fontSize: '56px', lineHeight: '64px', fontWeight: 700, letterSpacing: '-0.03em' }}>{val(m.value)}</span>
              <span style={{ ...m.badgeStyle, borderRadius: '6px', fontSize: '12px' }}>{m.badge}</span>
            </div>
            <div style={{ marginTop: '12px', fontSize: '13px', color: C.muted }}>{m.foot}</div>
          </div>
        ))}
      </div>

      {/* Schedule + side column */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', alignItems: 'start' }}>
        <div style={{ gridColumn: 'span 2', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Today's Appointments</h2>
              <span style={{ ...pill(C.secondary, C.primary), fontSize: '11px' }}>{val(todayList.length)} Active</span>
            </div>
            <Link to="/doctor-dashboard/manage-appointments" style={{ color: C.primary, fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>View All →</Link>
          </div>

          {loading ? (
            <div style={{ ...card, textAlign: 'center', color: C.muted }}>Loading...</div>
          ) : todayList.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '16px', backgroundColor: C.low, display: 'grid', placeItems: 'center', fontSize: '30px', margin: '0 auto 16px' }}>🗓️</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>No appointments scheduled for today</h3>
              <p style={{ fontSize: '14px', color: C.muted, margin: '4px auto 20px', maxWidth: '380px' }}>You currently have no patient bookings on your schedule for today.</p>
              <Link to="/doctor-dashboard/manage-availability" style={{ backgroundColor: C.primary, color: C.white, padding: '10px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Adjust Open Slots</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todayList.map((a) => {
                const s = statusStyle[a.status] || statusStyle[STATUS.cancelled];
                const online = isOnline(a.type);
                return (
                  <div key={a.id} style={{ ...card, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '12px', backgroundColor: online ? C.primaryFixed : C.secondary, color: online ? C.onPrimaryFixed : C.primary, display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: '16px', flexShrink: 0 }}>
                        {initials(a.patient)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '18px', fontWeight: 600 }}>{a.patient}</span>
                          {a.type && <span style={{ ...pill(online ? C.primaryFixed : C.secondary, online ? C.onPrimaryFixed : '#3c4855'), fontSize: '11px' }}>{online ? '📹' : '🏢'} {online ? 'Online' : 'In-person'}</span>}
                        </div>
                        <div style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
                          {[a.time && `🕒 ${a.time}`, a.duration && `${a.duration} mins`, a.reason].filter(Boolean).join(' • ')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ ...pill(s.bg, s.color), fontSize: '12px', textTransform: 'capitalize' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.dot }} /> {a.status || 'unknown'}
                      </span>
                      <button
                        onClick={() => setSelected(a)}
                        style={a.status === STATUS.pending
                          ? { backgroundColor: C.primary, color: C.white, padding: '8px 16px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }
                          : { backgroundColor: C.low, color: C.text, padding: '8px 16px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                      >
                        {a.status === STATUS.pending ? 'Review' : 'View Details'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Daily Capacity</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, backgroundColor: C.low, borderRadius: '12px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>Booked</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{val(+(bookedMinutes / 60).toFixed(1))}<span style={{ fontSize: '13px', fontWeight: 500, color: C.muted }}> hrs</span></div>
              </div>
              <div style={{ flex: 1, backgroundColor: C.low, borderRadius: '12px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>Sessions</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{val(todayList.length)}</div>
              </div>
            </div>
          </div>

          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', lineHeight: '20px', color: C.muted, margin: 0 }}>
              Need to block urgent clinical leave or modify consultation lengths? Updates sync immediately to patient booking.
            </p>
            <Link to="/doctor-dashboard/manage-availability" style={{ textAlign: 'center', backgroundColor: C.low, color: C.primary, padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
              📝 Update Time Slots
            </Link>
          </div>
        </div>
      </div>

      {/* Details modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(45,49,51,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: '440px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Appointment Overview</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: C.muted }}>✕</button>
            </div>
            <div style={{ backgroundColor: C.low, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                ['Patient Name', selected.patient],
                ['Date & Time', [selected.date, selected.time, selected.duration && `${selected.duration} mins`].filter(Boolean).join(' • ') || '—'],
                ['Format', selected.type || '—'],
                ['Reason', selected.reason || '—'],
                ['Status', selected.status || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{k}</div>
                  <div style={{ fontSize: '14px', fontWeight: k === 'Status' ? 600 : 400, color: k === 'Status' ? C.primary : C.text, textTransform: k === 'Status' ? 'capitalize' : 'none' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setSelected(null)} style={{ backgroundColor: C.high, color: C.text, padding: '8px 16px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Close</button>
              <Link to="/doctor-dashboard/manage-appointments" style={{ backgroundColor: C.primary, color: C.white, padding: '8px 16px', borderRadius: '12px', fontWeight: 600, textDecoration: 'none', fontSize: '14px' }}>Manage in Portal</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
