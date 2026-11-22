import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useOutletContext } from 'react-router-dom';
import { api, errMsg, hhmm, to12, toMin, C, card, btn, DAYS, Ic, Chip, calc, AvailabilitySummary as Summary } from './DoctorDashboard';

const DURATIONS = [[15, 'Rapid Check'], [30, 'Recommended'], [45, 'Specialized'], [60, 'Comprehensive']];
const TIMES = Array.from({ length: 33 }, (_, i) => { const m = 360 + i * 30; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; });
const clock = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const defaults = (duration = 30) => ({ days: Object.fromEntries(DAYS.map(([k]) => [k, { on: k < 5, start: '09:00', end: '17:00' }])), duration, breakOn: false, bStart: '13:00', bEnd: '14:00' });

// يحوّل الجدول المحفوظ لشكل الصفحة (الاستراحة = الفجوة بين فترتين في نفس اليوم)
const fromRows = (rows, duration) => {
  const s = defaults(duration);
  if (!rows.length) return s;
  s.days = Object.fromEntries(DAYS.map(([k]) => [k, { on: false, start: '09:00', end: '17:00' }]));
  DAYS.forEach(([k]) => {
    const p = rows.filter((r) => r.day_of_week === k && r.is_active).sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (!p.length) return;
    s.days[k] = { on: true, start: hhmm(p[0].start_time), end: hhmm(p[p.length - 1].end_time) };
    if (p.length > 1 && !s.breakOn) { s.breakOn = true; s.bStart = hhmm(p[0].end_time); s.bEnd = hhmm(p[1].start_time); }
  });
  return s;
};

const dot = { width: 4, height: 4, borderRadius: '50%', backgroundColor: C.border };
const sel = { background: 'transparent', border: 'none', outline: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: C.text };
const ghost = { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', backgroundColor: C.low, color: C.primary, fontWeight: 600, fontSize: 14, cursor: 'pointer', alignSelf: 'flex-start' };
const sec = { ...card, borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 };
const Head = ({ tag, title, sub }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: C.primary, textTransform: 'uppercase' }}>{tag}</span><span style={dot} />
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h2>
    </div>
    <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>{sub}</p>
  </div>
);

export default function DoctorAvailability() {
  const { user, profile } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [s, setS] = useState(defaults());
  const [clinicId, setClinicId] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [synced, setSynced] = useState('');

  const clinics = profile?.clinics?.length ? profile.clinics : profile?.clinic ? [profile.clinic] : [];
  const doctorId = profile?.id;
  const primary = profile?.clinic?.id ?? clinics[0]?.id ?? null;
  const ofClinic = (r) => r.clinic_id ?? primary;

  const load = useCallback(() => api.get(`/doctors/${doctorId}/schedules`)
    .then((r) => { const first = r.data.length ? ofClinic(r.data[0]) : primary; const cid = clinics.some((c) => c.id === first) ? first : primary; setRows(r.data); setClinicId(cid); setS(fromRows(r.data.filter((x) => ofClinic(x) === cid), profile.slot_duration_minutes || 30)); setSynced(clock()); })
    .catch((e) => setStatus({ ok: false, text: errMsg(e) }))
    .finally(() => setLoaded(true)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [doctorId]);
  useEffect(() => { if (doctorId) load(); }, [doctorId, load]);

  const pickClinic = (id) => { setClinicId(id); setS((p) => fromRows(rows.filter((x) => ofClinic(x) === id), p.duration)); };
  const setDay = (k, patch) => setS((p) => ({ ...p, days: { ...p.days, [k]: { ...p.days[k], ...patch } } }));
  const { active, hours, invalid } = calc(s);
  const cur = clinics.find((c) => c.id === clinicId);
  const where = cur ? `${cur.name}${cur.address ? ` • ${cur.address}` : ''}` : '';

  const save = async () => {
    setSaving(true); setStatus(null);
    const items = rows.filter((r) => ofClinic(r) !== clinicId).map((r) => ({ day_of_week: r.day_of_week, start_time: r.start_time, end_time: r.end_time, is_active: r.is_active, clinic_id: ofClinic(r) })); // الباك إند بيستبدل الجدول كله، فبنحافظ على باقي العيادات
    active.forEach(([k]) => {
      const d = s.days[k]; const base = { day_of_week: k, is_active: true, clinic_id: clinicId };
      if (s.breakOn && toMin(s.bStart) > toMin(d.start) && toMin(s.bEnd) < toMin(d.end)) items.push({ ...base, start_time: d.start, end_time: s.bStart }, { ...base, start_time: s.bEnd, end_time: d.end });
      else items.push({ ...base, start_time: d.start, end_time: d.end });
    });
    try {
      const r = await api.put(`/doctors/${doctorId}/schedules`, items);
      if (s.duration !== profile.slot_duration_minutes) await api.put(`/doctors/${doctorId}`, { slot_duration_minutes: s.duration });
      setRows(r.data); setSynced(clock()); setStatus({ ok: true });
    } catch (e) { setStatus({ ok: false, text: errMsg(e) }); }
    setSaving(false);
  };

  const timeSel = (v, fn) => <select value={v} onChange={(e) => fn(e.target.value)} style={sel}>{TIMES.map((t) => <option key={t} value={t}>{to12(t)}</option>)}</select>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <Helmet><title>Doctor Availability | Clinika</title></Helmet>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted }}>Doctor Dashboard <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} /> <b style={{ color: C.primary }}>Manage Availability</b></div>
          <h1 style={{ fontSize: 40, lineHeight: '48px', fontWeight: 700, letterSpacing: '-0.025em', margin: '4px 0' }}>Manage Availability</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Configure your recurring consultation days, clinic shifts, and slot generation intervals.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {rows.some((r) => r.is_active) && <Chip bg={C.secondary}><span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: C.primary }} />Schedule Active</Chip>}
          {synced && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, backgroundColor: C.low, color: C.muted, fontSize: 12 }}><Ic n="fa-rotate" s={12} /> Synchronized: Today at {synced}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 8fr) minmax(300px, 4fr)', gap: 32, alignItems: 'start' }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {status && (
            <div style={{ ...card, borderRadius: 12, padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start', backgroundColor: status.ok ? '#fff' : '#FEF2F2' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: status.ok ? C.secondary : C.errBg, display: 'grid', placeItems: 'center' }}><Ic n={status.ok ? 'fa-circle-check' : 'fa-circle-exclamation'} s={18} c={status.ok ? C.primary : C.errText} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}>{status.ok ? 'Your availability is live & verified' : status.text}{status.ok && <span style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>Just now</span>}</div>
                {status.ok && <p style={{ fontSize: 13, color: C.muted, margin: '2px 0 0' }}>New booking slots are instantly reflected on Clinika Search and patient teleconsult portals.</p>}
              </div>
              <button onClick={() => setStatus(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.outline }}><Ic n="fa-xmark" s={18} /></button>
            </div>
          )}

          {clinics.length === 0 && loaded && <div style={{ ...card, padding: 20, fontSize: 14, color: C.muted }}><Ic n="fa-building" c={C.primary} /> No clinic is linked to your account yet. Ask an admin to assign one.</div>}
          {clinics.length > 0 && (
            <div style={{ ...sec, gap: 20, border: '1px solid rgba(0,80,203,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <Head tag="Location" title="Select Practicing Clinic" sub="Availability, working days, and consultation hours are managed independently per clinic location." />
                {clinics.length > 1 && <Chip bg={C.secondary}><span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: C.primary }} />Multi-Clinic Mode</Chip>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                {clinics.map((c) => {
                  const on = c.id === clinicId;
                  return (
                    <div key={c.id} onClick={() => pickClinic(c.id)} style={{ padding: 16, borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, border: on ? `2px solid ${C.primary}` : `1px solid ${C.border}`, backgroundColor: on ? 'rgba(215,228,244,0.3)' : C.low }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}><Ic n={on ? 'fa-building' : 'fa-hospital'} s={18} c={on ? C.primary : C.sec} /> {c.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, backgroundColor: on ? C.primary : C.high, color: on ? '#fff' : C.muted, whiteSpace: 'nowrap' }}>{on ? 'Active Location' : 'Switch'}</span>
                      </div>
                      {c.address && <span style={{ fontSize: 13, color: C.muted }}>{c.address}</span>}
                      <span style={{ fontSize: 12, fontWeight: 500, color: on ? C.primary : C.outline }}><Ic n={on ? 'fa-circle-check' : 'fa-right-left'} s={13} /> {on ? 'Configuring schedule for this facility' : 'Click to switch clinic schedule'}</span>
                    </div>
                  );
                })}
              </div>
              {cur && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, backgroundColor: C.low, fontSize: 13, color: C.muted }}><Ic n="fa-circle-info" s={15} c={C.primary} /><span>Working days, shift hours, and slot durations configured below will apply specifically to <b>{where}</b>.</span></div>}
            </div>
          )}

          <div style={sec}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <Head tag="Step 01" title="Working Days" sub="Select the operational days when you accept patient appointments." />
              <button style={ghost} onClick={() => setS((p) => ({ ...p, days: Object.fromEntries(DAYS.map(([k]) => [k, { ...p.days[k], on: k < 5 }])) }))}><Ic n="fa-calendar-week" s={15} /> Apply Weekdays (Mon-Fri)</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 10 }}>
              {DAYS.map(([k, short, full]) => {
                const on = s.days[k].on;
                return (
                  <button key={k} onClick={() => setDay(k, { on: !on })} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 4px', minWidth: 0, borderRadius: 12, border: 'none', cursor: 'pointer', backgroundColor: on ? C.primary : C.low, color: on ? '#fff' : C.muted, boxShadow: on ? '0 4px 14px rgba(27,104,246,0.2)' : 'none' }}>
                    <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: on ? 'rgba(255,255,255,0.8)' : C.outline }}>{short}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, margin: '2px 0 6px', whiteSpace: 'nowrap' }}>{full}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, backgroundColor: on ? 'rgba(255,255,255,0.2)' : C.container }}>{on ? 'Active' : 'Off'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={sec}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <Head tag="Step 02" title="Shift Hours & Daily Schedule" sub="Specify arrival and departure consulting windows per configured active day." />
              {active.length > 0 && <button style={ghost} onClick={() => { const f = s.days[active[0][0]]; DAYS.forEach(([k]) => setDay(k, { start: f.start, end: f.end })); }}><Ic n="fa-copy" s={15} /> Copy {active[0][1]} hours to all</button>}
            </div>
            {active.length === 0 && <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>No working days selected.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {active.map(([k, , full]) => {
                const d = s.days[k]; const h = hours(d);
                return (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, padding: 16, borderRadius: 12, backgroundColor: C.low }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#fff', color: C.primary, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{full[0]}</div>
                      <div><div style={{ fontSize: 14, fontWeight: 600 }}>{full}</div><div style={{ fontSize: 12, color: C.sec }}>{h > 0 && h < 6 ? 'Half Day Consultation' : 'Full Day Consultation'}</div></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      {[['From', 'start'], ['To', 'end']].map(([lbl, f], i) => (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {i === 1 && <span style={{ color: C.outline }}>to</span>}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <span style={{ fontSize: 12, color: C.outline }}>{lbl}</span>{timeSel(d[f], (v) => setDay(k, { [f]: v }))}
                          </div>
                        </div>
                      ))}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999, backgroundColor: h > 0 ? C.secondary : C.errBg }}>{h > 0 ? `${+h.toFixed(1)} hrs` : 'Invalid'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={sec}>
            <Head tag="Step 03" title="Consultation Slot Duration" sub="Each booking slot will be generated based on this consultation window." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
              {DURATIONS.map(([m, tag]) => {
                const on = s.duration === m;
                return (
                  <button key={m} onClick={() => setS((p) => ({ ...p, duration: m }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16, borderRadius: 12, border: 'none', cursor: 'pointer', backgroundColor: on ? C.primary : C.low, color: on ? '#fff' : C.muted, boxShadow: on ? '0 4px 14px rgba(27,104,246,0.24)' : 'none' }}>
                    <span style={{ fontSize: 24, fontWeight: 700 }}>{m}</span>
                    <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0', color: on ? 'rgba(255,255,255,0.8)' : C.outline }}>Minutes</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: on ? '2px 8px' : 0, borderRadius: 999, backgroundColor: on ? 'rgba(255,255,255,0.2)' : 'transparent', color: on ? '#fff' : C.sec }}>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ ...sec, gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.secondary, display: 'grid', placeItems: 'center' }}><Ic n="fa-utensils" s={18} c={C.primary} /></div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>Lunch / Midday Break <span style={{ fontSize: 11, backgroundColor: C.container, color: C.muted, padding: '2px 8px', borderRadius: 999 }}>OPTIONAL</span></div>
                  <div style={{ fontSize: 13, color: C.muted }}>Slots falling within this break window will be automatically hidden from patient booking.</div>
                </div>
              </div>
              <button onClick={() => setS((p) => ({ ...p, breakOn: !p.breakOn }))} aria-label="toggle break" style={{ width: 48, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', backgroundColor: s.breakOn ? C.primary : '#e0e3e5', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: s.breakOn ? 26 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', transition: 'left .2s' }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', opacity: s.breakOn ? 1 : 0.35, pointerEvents: s.breakOn ? 'auto' : 'none' }}>
              {[['Break Starts', 'bStart'], ['Break Ends', 'bEnd']].map(([t, key], i) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {i === 1 && <span style={{ color: C.outline }}>until</span>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: C.low, padding: '10px 16px', borderRadius: 12 }}>
                    <Ic n="fa-clock" c={C.outline} />
                    <div><div style={{ fontSize: 12, color: C.outline }}>{t}</div>{timeSel(s[key], (x) => setS((p) => ({ ...p, [key]: x })))}</div>
                  </div>
                </div>
              ))}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 12, backgroundColor: C.secondary, fontSize: 12, fontWeight: 500 }}><Ic n="fa-circle-info" s={14} />{Math.max(0, toMin(s.bEnd) - toMin(s.bStart))}-minute recurring buffer reserved</span>
            </div>
          </div>

          <div style={{ ...card, borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ fontSize: 13, color: C.muted }}>{invalid ? <><Ic n="fa-triangle-exclamation" c={C.error} /> Fix invalid times before saving</> : <><Ic n="fa-cloud" c={C.primary} /> Changes are saved only when you press Save</>}</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setStatus(null); load(); }} style={btn(C.low, C.text, { padding: '12px 20px' })}>Reset Changes</button>
              <button disabled={saving || !loaded || invalid || !doctorId || !clinicId} onClick={save} style={btn(C.primary, '#fff', { padding: '12px 28px', boxShadow: '0 4px 14px rgba(27,104,246,0.28)', opacity: saving || invalid ? 0.6 : 1 })}><i className="fa-solid fa-floppy-disk" /> {saving ? 'Saving...' : 'Save Availability'}</button>
            </div>
          </div>
        </div>
        <Summary user={user} profile={profile} s={s} cur={cur} where={where} doctorId={doctorId} />
      </div>
    </div>
  );
}
