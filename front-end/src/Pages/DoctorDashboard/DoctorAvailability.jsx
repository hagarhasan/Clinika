import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

const API = 'https://clinika-backend.vercel.app';
const TOKEN_KEY = 'token'; // غيّريه لو Login.jsx بيخزن باسم تاني

// نفس نصوص التصميم، التيم يستبدلها ببيانات الـ API
const CLINICS = [
  { name: 'Heliopolis Medical Pavilion', info: 'Suite 304B • Heart & Vascular Wing', icon: 'apartment' },
  { name: 'New Cairo Specialty Clinic', info: 'Building C • 2nd Floor Consultation Suites', icon: 'local_hospital' },
];
const POLICIES = [
  'Patients cannot book within 2 hours of current time to prevent last-minute clinic disruption.',
  'Modifications to active slots take effect immediately for upcoming patient searches.',
  'Pre-existing patient appointments are preserved during slot reconfigurations.',
];
const DAYS = [['mon', 'Mon', 'Monday'], ['tue', 'Tue', 'Tuesday'], ['wed', 'Wed', 'Wednesday'], ['thu', 'Thu', 'Thursday'], ['fri', 'Fri', 'Friday'], ['sat', 'Sat', 'Saturday'], ['sun', 'Sun', 'Sunday']];
const JS_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DURATIONS = [[15, 'Rapid Check'], [30, 'Recommended'], [45, 'Specialized'], [60, 'Comprehensive']];

const times = [];
for (let m = 6 * 60; m <= 22 * 60; m += 30) times.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const label = (t) => { const h = Number(t.slice(0, 2)); return `${String(h % 12 || 12).padStart(2, '0')}:${t.slice(3)} ${h < 12 ? 'AM' : 'PM'}`; };

const initial = () => ({
  days: Object.fromEntries(DAYS.map(([k]) => [k, { on: !['sat', 'sun'].includes(k), start: '09:00', end: '17:00' }])),
  duration: 30, breakOn: true, breakStart: '13:00', breakEnd: '14:00',
});

// شكل الـ Body المبعوت للباك إند: عدّليه حسب الدليل
const buildPayload = (s) => ({
  slot_duration: s.duration,
  days: DAYS.filter(([k]) => s.days[k].on).map(([k]) => ({ day: k, start_time: s.days[k].start, end_time: s.days[k].end })),
  break: s.breakOn ? { start_time: s.breakStart, end_time: s.breakEnd } : null,
});

const C = { primary: '#0050cb', pc: '#1b68f6', text: '#191c1e', muted: '#424655', low: '#f2f4f6', cont: '#eceef0', high: '#e6e8ea', sec: '#d7e4f4', outline: '#737687', ov: '#c2c6d8', errBg: '#ffdad6', errText: '#93000a' };
const card = { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' };
const Ic = ({ n, s = 20, c }) => (
  <span style={{ fontFamily: "'Material Symbols Outlined'", fontSize: s, color: c, lineHeight: 1, fontWeight: 'normal', fontStyle: 'normal', fontFeatureSettings: "'liga'", WebkitFontFeatureSettings: "'liga'", display: 'inline-block', flexShrink: 0 }}>{n}</span>
);
const badge = (bg, color) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: bg, color, padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em' });
const ghost = { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: 'none', backgroundColor: C.low, color: C.primary, fontWeight: 600, fontSize: '14px', cursor: 'pointer', alignSelf: 'flex-start' };
const sel = { background: 'transparent', border: 'none', outline: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer', color: C.text };
const Step = ({ n, title, sub }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: C.primary, textTransform: 'uppercase' }}>{n}</span>
      <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: C.ov }} />
      <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{title}</h2>
    </div>
    <p style={{ fontSize: '13px', color: C.muted, margin: '4px 0 0' }}>{sub}</p>
  </div>
);

export default function DoctorAvailability() {
  const [s, setS] = useState(initial);
  const [clinic, setClinic] = useState(0);
  const [status, setStatus] = useState(null);
  const [syncedAt, setSyncedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const docName = user.name ?? user.full_name ?? user.fullName ?? '';
  const docSpec = user.specialty ?? user.specialization ?? '';

  const setDay = (k, patch) => setS((p) => ({ ...p, days: { ...p.days, [k]: { ...p.days[k], ...patch } } }));
  const active = DAYS.filter(([k]) => s.days[k].on);
  const hours = (d) => Math.max(0, toMin(d.end) - toMin(d.start)) / 60;
  const brk = (d) => (s.breakOn ? Math.max(0, Math.min(toMin(d.end), toMin(s.breakEnd)) - Math.max(toMin(d.start), toMin(s.breakStart))) : 0);
  const slots = (d) => Math.max(0, Math.floor((hours(d) * 60 - brk(d)) / s.duration));
  const weekHours = active.reduce((a, [k]) => a + hours(s.days[k]), 0);
  const weekSlots = active.reduce((a, [k]) => a + slots(s.days[k]), 0);
  const daily = active.length ? Math.round(weekSlots / active.length) : 0;
  const maxSlots = Math.max(1, ...DAYS.map(([k]) => (s.days[k].on ? slots(s.days[k]) : 0)));
  const next = (() => {
    for (let i = 0; i < 7; i++) {
      const k = JS_DAY[(new Date().getDay() + i) % 7];
      if (s.days[k].on) return { when: i === 0 ? 'Today' : DAYS.find(([x]) => x === k)[2], d: s.days[k] };
    }
    return null;
  })();

  const save = async () => {
    setSaving(true); setStatus(null);
    try {
      const res = await fetch(`${API}/doctors/availability`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(s)),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSyncedAt(`Today at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
      setStatus({ ok: true });
    } catch (e) { setStatus({ ok: false, text: e.message }); }
    setSaving(false);
  };

  const timeSel = (v, fn) => (
    <select value={v} onChange={(e) => fn(e.target.value)} style={sel}>{times.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>
  );

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: C.text, display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Helmet>
        <title>Doctor Availability | Clinika</title>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      </Helmet>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: C.muted }}>
            Doctor Dashboard <Ic n="chevron_right" s={14} c={C.outline} /> <b style={{ color: C.primary }}>Manage Availability</b>
          </div>
          <h1 style={{ fontSize: '40px', lineHeight: '48px', fontWeight: 700, letterSpacing: '-0.025em', margin: '4px 0' }}>Manage Availability</h1>
          <p style={{ fontSize: '14px', color: C.muted, margin: 0 }}>Configure your recurring consultation days, clinic shifts, and slot generation intervals.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ ...badge(C.sec, '#101d28'), textTransform: 'uppercase', padding: '6px 12px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: C.primary }} /> Schedule Active
          </span>
          <span style={{ ...badge(C.low, C.muted), fontWeight: 500, letterSpacing: 0, fontSize: '12px', padding: '6px 12px' }}>
            <Ic n="sync" s={16} /> {syncedAt ? `Synchronized: ${syncedAt}` : 'Not synchronized yet'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' }}>
        <div style={{ gridColumn: 'span 2', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Status alert (بعد الحفظ فقط) */}
          {status && (
            <div style={{ ...card, padding: '16px', flexDirection: 'row', alignItems: 'flex-start', gap: '14px', backgroundColor: status.ok ? '#fff' : '#FEF2F2' }}>
              <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: status.ok ? C.sec : C.errBg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Ic n={status.ok ? 'check_circle' : 'error'} c={status.ok ? C.primary : C.errText} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{status.ok ? 'Your availability is live & verified' : status.text}</div>
                {status.ok && <p style={{ fontSize: '13px', color: C.muted, margin: '2px 0 0' }}>New booking slots are instantly reflected on Clinika Search and patient teleconsult portals.</p>}
              </div>
              <button onClick={() => setStatus(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.outline }}><Ic n="close" s={18} /></button>
            </div>
          )}

          {/* Location */}
          <div style={{ ...card, gap: '20px', border: '1px solid rgba(0,80,203,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: C.primary, textTransform: 'uppercase' }}>Location</span>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: C.ov }} />
                  <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Select Practicing Clinic</h2>
                </div>
                <p style={{ fontSize: '13px', color: C.muted, margin: '4px 0 0' }}>Availability, working days, and consultation hours are managed independently per clinic location.</p>
              </div>
              <span style={{ ...badge(C.sec, '#101d28'), alignSelf: 'flex-start' }}><span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: C.primary }} />Multi-Clinic Mode</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {CLINICS.map((c, i) => {
                const on = clinic === i;
                return (
                  <div key={c.name} onClick={() => setClinic(i)} style={{ padding: '16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', border: on ? `2px solid ${C.primary}` : `1px solid ${C.ov}`, backgroundColor: on ? 'rgba(215,228,244,0.3)' : C.low }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}><Ic n={c.icon} c={on ? C.primary : '#53606d'} />{c.name}</div>
                      <span style={{ ...badge(on ? C.primary : C.high, on ? '#fff' : C.muted), whiteSpace: 'nowrap', letterSpacing: 0 }}>{on ? 'Active Location' : 'Switch'}</span>
                    </div>
                    <span style={{ fontSize: '13px', color: C.muted }}>{c.info}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: on ? C.primary : C.outline }}>
                      <Ic n={on ? 'check_circle' : 'swap_horiz'} s={16} />{on ? 'Configuring schedule for this facility' : 'Click to switch clinic schedule'}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', backgroundColor: C.low, fontSize: '13px', color: C.muted }}>
              <Ic n="info" s={18} c={C.primary} />
              <span>Working days, shift hours, and slot durations configured below will apply specifically to <b>{CLINICS[clinic].name} ({CLINICS[clinic].info.split(' • ')[0]})</b>.</span>
            </div>
          </div>

          {/* Step 1 */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <Step n="Step 01" title="Working Days" sub="Select the operational days when you accept patient appointments." />
              <button style={ghost} onClick={() => setS((p) => ({ ...p, days: Object.fromEntries(DAYS.map(([k]) => [k, { ...p.days[k], on: !['sat', 'sun'].includes(k) }])) }))}>
                <Ic n="event_repeat" s={18} />Apply Weekdays (Mon-Fri)
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '10px' }}>
              {DAYS.map(([k, short, full]) => {
                const on = s.days[k].on;
                return (
                  <button key={k} onClick={() => setDay(k, { on: !on })} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 4px', minWidth: 0, borderRadius: '12px', border: 'none', cursor: 'pointer', backgroundColor: on ? C.primary : C.low, color: on ? '#fff' : C.muted, boxShadow: on ? '0 4px 14px rgba(27,104,246,0.2)' : 'none' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: on ? 0.8 : 1, color: on ? '#fff' : C.outline }}>{short}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, margin: '2px 0 6px', whiteSpace: 'nowrap' }}>{full}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: on ? 'rgba(255,255,255,0.2)' : C.cont }}>{on ? 'Active' : 'Off'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <Step n="Step 02" title="Shift Hours & Daily Schedule" sub="Specify arrival and departure consulting windows per configured active day." />
              {active.length > 0 && (
                <button style={ghost} onClick={() => { const f = s.days[active[0][0]]; DAYS.forEach(([k]) => setDay(k, { start: f.start, end: f.end })); }}>
                  <Ic n="content_copy" s={18} />Copy {active[0][1]} hours to all
                </button>
              )}
            </div>
            {active.length === 0 && <p style={{ color: C.muted, fontSize: '14px', margin: 0 }}>No working days selected.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {active.map(([k, , full]) => {
                const d = s.days[k]; const h = hours(d);
                return (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px', borderRadius: '12px', backgroundColor: C.low }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '8px', backgroundColor: '#fff', color: C.primary, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{full[0]}</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{full}</div>
                        <div style={{ fontSize: '12px', color: '#53606d' }}>{h > 0 && h < 6 ? 'Half Day Consultation' : 'Full Day Consultation'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <span style={{ fontSize: '12px', color: C.outline }}>From</span>{timeSel(d.start, (v) => setDay(k, { start: v }))}
                      </div>
                      <span style={{ color: C.outline }}>to</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <span style={{ fontSize: '12px', color: C.outline }}>To</span>{timeSel(d.end, (v) => setDay(k, { end: v }))}
                      </div>
                      <span style={{ ...badge(h > 0 ? C.sec : C.errBg, h > 0 ? '#101d28' : C.errText), letterSpacing: 0, padding: '4px 10px' }}>{h > 0 ? `${+h.toFixed(1)} hrs` : 'Invalid'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3 */}
          <div style={card}>
            <Step n="Step 03" title="Consultation Slot Duration" sub="Each booking slot will be generated based on this consultation window." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
              {DURATIONS.map(([m, tag]) => {
                const on = s.duration === m;
                return (
                  <button key={m} onClick={() => setS((p) => ({ ...p, duration: m }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', backgroundColor: on ? C.primary : C.low, color: on ? '#fff' : C.muted, boxShadow: on ? '0 4px 14px rgba(27,104,246,0.24)' : 'none' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700 }}>{m}</span>
                    <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0', color: on ? 'rgba(255,255,255,0.8)' : C.outline }}>Minutes</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: on ? '2px 8px' : 0, borderRadius: '999px', backgroundColor: on ? 'rgba(255,255,255,0.2)' : 'transparent', color: on ? '#fff' : '#53606d' }}>{on && m === 30 ? 'Recommended' : tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Break */}
          <div style={{ ...card, gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: C.sec, display: 'grid', placeItems: 'center' }}><Ic n="restaurant" s={22} c={C.primary} /></div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 600 }}>
                    Lunch / Midday Break <span style={{ fontSize: '11px', backgroundColor: C.cont, color: C.muted, padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase' }}>Optional</span>
                  </div>
                  <div style={{ fontSize: '13px', color: C.muted }}>Slots falling within this break window will be automatically hidden from patient booking.</div>
                </div>
              </div>
              <button onClick={() => setS((p) => ({ ...p, breakOn: !p.breakOn }))} aria-label="toggle break" style={{ width: 48, height: 24, borderRadius: '999px', border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: s.breakOn ? C.primary : '#e0e3e5', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: s.breakOn ? 26 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', transition: 'left .2s' }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', opacity: s.breakOn ? 1 : 0.35, pointerEvents: s.breakOn ? 'auto' : 'none' }}>
              {[['Break Starts', s.breakStart, 'breakStart'], ['Break Ends', s.breakEnd, 'breakEnd']].map(([t, v, key], i) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {i === 1 && <span style={{ color: C.outline }}>until</span>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: C.low, padding: '10px 16px', borderRadius: '12px' }}>
                    <Ic n="schedule" s={18} c={C.outline} />
                    <div><div style={{ fontSize: '12px', color: C.outline }}>{t}</div>{timeSel(v, (x) => setS((p) => ({ ...p, [key]: x })))}</div>
                  </div>
                </div>
              ))}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '12px', backgroundColor: C.sec, color: '#101d28', fontSize: '12px', fontWeight: 500 }}>
                <Ic n="info" s={16} />{Math.max(0, toMin(s.breakEnd) - toMin(s.breakStart))}-minute recurring buffer reserved
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ ...card, padding: '20px', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: C.muted }}><Ic n="cloud_done" c={C.primary} />Unsaved modifications are cached locally</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setS(initial()); setStatus(null); }} style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', backgroundColor: C.low, fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Reset Changes</button>
              <button disabled={saving || active.length === 0} onClick={save} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', border: 'none', backgroundColor: C.primary, color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,104,246,0.28)', opacity: saving ? 0.7 : 1 }}>
                <Ic n={saving ? 'progress_activity' : 'save'} />{saving ? 'Saving...' : 'Save Availability'}
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          <div style={{ ...card, padding: '24px', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {user.image || user.avatar
                ? <img src={user.image ?? user.avatar} alt="" style={{ width: 56, height: 56, borderRadius: '16px', objectFit: 'cover' }} />
                : <div style={{ width: 56, height: 56, borderRadius: '16px', backgroundColor: C.sec, display: 'grid', placeItems: 'center' }}><Ic n="person" s={28} c={C.primary} /></div>}
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{docName}</div>
                <div style={{ fontSize: '13px', color: C.muted }}>{docSpec}</div>
              </div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: C.low, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: '12px', color: C.outline }}>Configuring Clinic</div><div style={{ fontSize: '14px', fontWeight: 600 }}>{CLINICS[clinic].name} • {CLINICS[clinic].info.split(' • ')[0]}</div></div>
              <Ic n="apartment" c={C.primary} />
            </div>
          </div>

          <div style={{ ...card, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 600, margin: 0 }}><Ic n="speed" c={C.primary} />Live Schedule Capacity</h3>
              <span style={{ ...badge(C.sec, '#101d28'), letterSpacing: 0 }}>Calculated</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ backgroundColor: C.low, borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: C.outline }}>Weekly Consulting</div>
                <div style={{ fontSize: '24px', fontWeight: 600, margin: '4px 0' }}>{+weekHours.toFixed(1)} hrs</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: C.primary }}>Across {active.length} days</div>
              </div>
              <div style={{ backgroundColor: C.low, borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: C.outline }}>Available Daily</div>
                <div style={{ fontSize: '24px', fontWeight: 600, margin: '4px 0' }}>~{daily} Slots</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: C.primary }}>At {s.duration}m / patient</div>
              </div>
            </div>
            <div style={{ backgroundColor: C.low, borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                Weekly Slot Allocation <span style={{ fontSize: '12px', color: '#53606d', fontWeight: 500 }}>{weekSlots} Slots / Week</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '48px', borderBottom: `1px dashed ${C.ov}` }}>
                {DAYS.map(([k, short]) => {
                  const n = s.days[k].on ? slots(s.days[k]) : 0;
                  return <div key={k} title={`${short}: ${n}`} style={{ width: 24, height: n > 0 ? Math.max(6, (n / maxSlots) * 44) : 4, borderRadius: '4px', backgroundColor: n > 0 ? C.primary : '#e0e3e5' }} />;
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: C.outline, marginTop: '6px', padding: '0 8px' }}>
                {DAYS.map(([k, short]) => <span key={k}>{short[0]}</span>)}
              </div>
            </div>
            {next && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderRadius: '12px', backgroundColor: C.sec }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Ic n="today" s={22} c={C.primary} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#101d28' }}>Next Operating Day</div>
                    <div style={{ fontSize: '13px', color: '#3c4855' }}>{next.when} • {label(next.d.start)} – {label(next.d.end)}</div>
                  </div>
                </div>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: C.primary }} />
              </div>
            )}
            <a href="#/doctors" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', backgroundColor: C.low, color: C.primary, fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
              Preview Public Profile & Booking <Ic n="arrow_forward" s={18} />
            </a>
          </div>

          <div style={{ ...card, padding: '24px', gap: '16px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 600, margin: 0 }}><Ic n="verified_user" c="#53606d" />Clinika Schedule Policies</h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: C.muted }}>
              {POLICIES.map((p) => (
                <li key={p} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}><Ic n="check" s={18} c={C.primary} />{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
