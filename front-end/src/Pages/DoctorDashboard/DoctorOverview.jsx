import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useDoctorData, hhmm, to12, toMin, initials, drName, C, card, pill } from './DoctorDashboard';

const Ic = ({ n, c, s }) => <i className={`fa-solid ${n}`} style={{ color: c, fontSize: s }} />;
const online = (a) => a.consultation_type === 'online';
const mins = (a) => toMin(hhmm(a.end_time)) - toMin(hhmm(a.start_time));
const live = (a) => a.status === 'pending' || a.status === 'confirmed';
const OV = {
  pending: [C.errBg, C.errText, C.error],
  confirmed: [C.secondary, '#101d28', C.primary],
  completed: [C.container, C.muted, C.primary],
  cancelled: [C.errBg, C.errText, C.error],
  rejected: [C.errBg, C.errText, C.error],
  no_show: [C.errBg, C.errText, C.error],
};
const ring = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';

export default function DoctorOverview() {
  const { user, profile, stats, today, slots, schedules, loading } = useDoctorData();
  const [selected, setSelected] = useState(null);

  const dow = (new Date().getDay() + 6) % 7;
  const blocks = schedules
    .filter((r) => r.day_of_week === dow && r.is_active)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const v = (n) => (loading ? '...' : n ?? 0);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dur = profile?.slot_duration_minutes || 30;
  const active = today.filter(live);
  const onlineCount = active.filter(online).length;
  const pending = stats?.pending_confirmation ?? 0;
  const free = slots.filter((x) => x.is_available);
  const pct = slots.length ? Math.round(((slots.length - free.length) / slots.length) * 100) : 0;
  const nextFree = free.find((x) => toMin(hhmm(x.start_time)) > nowMin);
  const isOpen = blocks.some((b) => toMin(hhmm(b.start_time)) <= nowMin && nowMin < toMin(hhmm(b.end_time)));
  const hrs = (n) => +((n * dur) / 60).toFixed(1);
  const dateLong = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const firstName = (user?.full_name || user?.first_name || '').replace(/^dr\.?\s+/i, '').split(' ')[0];
  const clinic = profile?.clinic || profile?.clinics?.[0];

  const metrics = [
    {
      label: "Today's Appointments", value: active.length, icon: 'fa-calendar-check',
      bg: C.secondary, ic: C.primary, badge: 'On Track', bs: { bg: C.secondary, c: '#3c4855' },
      foot: <><Ic n="fa-video" c={C.primary} /> {onlineCount} online • <Ic n="fa-building" c={C.primary} /> {active.length - onlineCount} in-person</>,
    },
    {
      label: 'Pending Requests', value: stats?.pending_confirmation, icon: 'fa-hourglass-half',
      bg: 'rgba(255,218,214,0.4)', ic: C.error, badge: pending > 0 ? 'Action needed' : 'All clear',
      bs: pending > 0 ? { bg: C.errBg, c: C.errText } : { bg: C.high, c: C.text },
      foot: <><Ic n="fa-clock-rotate-left" c="#525970" /> Awaiting slot confirmation</>,
    },
    {
      label: 'Completed Appointments', value: stats?.completed_this_week, icon: 'fa-circle-check',
      bg: C.low, ic: C.primary, badge: 'This Week', bs: { bg: C.high, c: C.text },
      foot: <><Ic n="fa-check-double" c={C.primary} /> {stats?.attendance_rate != null ? `${stats.attendance_rate}% attendance rate` : 'Attendance rate not available yet'}</>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
      <Helmet><title>Doctor Overview | Clinika</title></Helmet>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 12, color: C.muted }}>
          Doctor Dashboard <span style={{ color: C.border }}>/</span> <b style={{ color: C.primary, fontSize: 14 }}>Overview</b>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {!loading && (
            <span style={{ ...pill(C.low, C.text), boxShadow: card.boxShadow }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isOpen ? C.primary : C.outline }} />
              {isOpen ? 'Clinic Open' : 'Clinic Closed'}
            </span>
          )}
          <span style={{ ...pill(C.white, C.muted), textTransform: 'none', letterSpacing: 0, boxShadow: card.boxShadow }}>
            <Ic n="fa-calendar-day" c={C.primary} /> Today • {dateLong}
          </span>
        </div>
      </div>

      <div style={{
        ...card, padding: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 24, background: 'linear-gradient(to left, rgba(0,80,203,0.06), #fff 60%)',
      }}>
        <div style={{ maxWidth: 640 }}>
          <span style={{ ...pill(C.secondary, '#101d28'), borderRadius: 6 }}>
            <Ic n="fa-stethoscope" c={C.primary} /> Clinical Schedule Active
          </span>
          <h1 style={{ fontSize: 40, lineHeight: '48px', fontWeight: 700, letterSpacing: '-0.025em', margin: '12px 0 8px' }}>
            Welcome back{firstName ? `, ${drName(firstName)}` : ''}
          </h1>
          <p style={{ fontSize: 16, lineHeight: '26px', color: C.muted, margin: 0 }}>
            {loading ? 'Loading your schedule...' : (
              <>
                Here is an overview of your appointments and schedule for today. You have{' '}
                <b style={{ color: C.primary }}>{active.length} consultation{active.length === 1 ? '' : 's'}</b> lined up.
              </>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/doctor-dashboard/manage-availability" style={{ backgroundColor: C.low, color: C.text, padding: '10px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            <Ic n="fa-clock" c={C.primary} /> Manage Availability
          </Link>
          <Link to="/doctor-dashboard/manage-appointments" style={{ backgroundColor: C.primary, color: '#fff', padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(27,104,246,0.28)' }}>
            <i className="fa-solid fa-calendar-days" /> View All Appointments
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
        {metrics.map((m) => (
          <div key={m.label} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>{m.label}</span>
              <span style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: m.bg, display: 'grid', placeItems: 'center' }}>
                <Ic n={m.icon} c={m.ic} />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 20 }}>
              <span style={{ fontSize: 56, lineHeight: '64px', fontWeight: 700, letterSpacing: '-0.03em' }}>{v(m.value)}</span>
              <span style={{ backgroundColor: m.bs.bg, color: m.bs.c, padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                {m.badge}
              </span>
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: C.muted, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {m.foot}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 8fr) minmax(280px, 4fr)', gap: 32, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Today's Appointments</h2>
              <span style={pill(C.secondary, C.primary)}>{v(active.length)} Active</span>
            </div>
            <Link to="/doctor-dashboard/manage-appointments" style={{ color: C.primary, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              View All <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>

          {loading ? (
            <div style={{ ...card, textAlign: 'center', color: C.muted }}>Loading...</div>
          ) : today.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 48 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: C.low, display: 'grid', placeItems: 'center', margin: '0 auto 16px', fontSize: 28 }}>
                <Ic n="fa-calendar-xmark" c={C.primary} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>No appointments scheduled for today</h3>
              <p style={{ fontSize: 14, color: C.muted, margin: '4px auto 20px', maxWidth: 380 }}>
                You currently have no patient bookings on your schedule for {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
              </p>
              <Link to="/doctor-dashboard/manage-availability" style={{ backgroundColor: C.primary, color: '#fff', padding: '8px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Adjust Open Slots
              </Link>
            </div>
          ) : (
            today.map((a) => {
              const [bg, color, dot] = OV[a.status] || OV.cancelled;
              const patientName = a.patient?.full_name || 'Patient';
              return (
                <div key={a.id} style={{ ...card, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: online(a) ? C.primaryFixed : C.secondary, color: C.primary, display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 18 }}>
                      {initials(patientName)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 18, fontWeight: 600 }}>{patientName}</span>
                        <span style={{ ...pill(online(a) ? C.primaryFixed : '#d7e4f4', online(a) ? '#003fa3' : '#3c4855'), textTransform: 'none', letterSpacing: 0 }}>
                          <i className={`fa-solid ${online(a) ? 'fa-video' : 'fa-building'}`} /> {online(a) ? 'Online' : 'In-person'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                        <b style={{ color: C.text }}><Ic n="fa-clock" c={C.primary} s={13} /> {to12(hhmm(a.start_time))}</b> • {mins(a)} mins •{' '}
                        {online(a) ? (a.meeting_link ? 'Tele-consult Link Prepared' : 'Online consultation') : a.clinic?.name || 'In-person visit'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ ...pill(bg, color), textTransform: 'capitalize', letterSpacing: 0, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dot }} />
                      {a.status.replace('_', ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelected(a)}
                      style={{
                        backgroundColor: a.status === 'pending' ? C.primary : C.low,
                        color: a.status === 'pending' ? '#fff' : C.text,
                        padding: '8px 16px', borderRadius: 12, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                      }}
                    >
                      {a.status === 'pending' ? 'Review' : 'View Details'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Daily Capacity</h3>
              <span style={{ fontSize: 11, color: C.primary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {loading ? '...' : `${hrs(slots.length - free.length)} / ${hrs(slots.length)} Hours Filled`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <path d={ring} fill="none" stroke={C.high} strokeWidth="3.5" />
                  <path d={ring} fill="none" stroke={C.primary} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${pct}, 100`} />
                </svg>
                <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 600 }}>{pct}%</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {loading ? '...' : slots.length ? `${free.length} Slots Remaining` : 'No slots today'}
                </div>
                <div style={{ fontSize: 13, color: C.muted }}>
                  {loading || !slots.length
                    ? 'You have no working hours today.'
                    : nextFree
                      ? `Next opening available at ${to12(hhmm(nextFree.start_time))} today.`
                      : 'No more openings today.'}
                </div>
              </div>
            </div>
            {blocks.map((b) => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: C.low, fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: hhmm(b.start_time) < '12:00' ? C.primary : C.sec }} />
                  {to12(hhmm(b.start_time))} - {to12(hhmm(b.end_time))}
                </span>
                <span style={{ fontSize: 12, color: C.muted }}>{hhmm(b.start_time) < '12:00' ? 'Morning' : 'Afternoon'} Block</span>
              </div>
            ))}
          </div>

          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {clinic && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.secondary, display: 'grid', placeItems: 'center' }}>
                  <Ic n="fa-hospital" c={C.primary} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, lineHeight: '24px' }}>{clinic.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{[clinic.address, profile?.room].filter(Boolean).join(' • ')}</div>
                </div>
              </div>
            )}
            <p style={{ fontSize: 13, lineHeight: '20px', color: C.muted, margin: 0 }}>
              Need to block urgent clinical leave or modify consultation lengths? Updates sync immediately to patient booking.
            </p>
            <Link to="/doctor-dashboard/manage-availability" style={{ textAlign: 'center', backgroundColor: C.low, color: C.primary, padding: 10, borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              <i className="fa-solid fa-calendar-plus" /> Update Time Slots
            </Link>
          </div>
        </div>
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(45,49,51,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 448, width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.secondary, display: 'grid', placeItems: 'center' }}>
                  <Ic n="fa-user" c={C.primary} />
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Appointment Overview</h3>
              </div>
              <button type="button" onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ backgroundColor: C.low, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Patient Name', selected.patient?.full_name || 'Patient'],
                ['Time & Duration', `${to12(hhmm(selected.start_time))} (${mins(selected)} mins)`],
                ['Format', online(selected) ? 'Online Consultation' : `In-person${selected.clinic ? ` - ${selected.clinic.name}` : ''}`],
                ['Status', selected.status.replace('_', ' ')],
              ].map(([k, val]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{k}</div>
                  <div style={{ fontSize: k === 'Patient Name' ? 18 : 14, fontWeight: k === 'Status' || k === 'Patient Name' ? 600 : 400, color: k === 'Status' ? C.primary : C.text, textTransform: k === 'Status' ? 'capitalize' : 'none' }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={() => setSelected(null)} style={{ backgroundColor: C.high, padding: '8px 16px', borderRadius: 12, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                Close
              </button>
              <Link to="/doctor-dashboard/manage-appointments" style={{ backgroundColor: C.primary, color: '#fff', padding: '8px 16px', borderRadius: 12, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
                Manage in Portal
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}