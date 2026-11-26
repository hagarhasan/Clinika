import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDoctorData, errMsg, hhmm, toMin, to12, C, card, pill, btn } from './DoctorDashboard';
import { updateSchedules, updateDoctor } from '../../api/doctorsApi';
import AvailabilitySummary from './AvailabilitySummary';
import TimeOffManager from '../../Components/availability/TimeOffManager';

const DAYS = [
  { idx: 0, short: 'Mon', label: 'Monday', note: 'Full Day Consultation' },
  { idx: 1, short: 'Tue', label: 'Tuesday', note: 'Full Day Consultation' },
  { idx: 2, short: 'Wed', label: 'Wednesday', note: 'Full Day Consultation' },
  { idx: 3, short: 'Thu', label: 'Thursday', note: 'Full Day Consultation' },
  { idx: 4, short: 'Fri', label: 'Friday', note: 'Half Day Consultation' },
  { idx: 5, short: 'Sat', label: 'Saturday', note: 'Weekend Schedule' },
  { idx: 6, short: 'Sun', label: 'Sunday', note: 'Weekend Schedule' },
];
const TIMES = Array.from({ length: 29 }, (_, i) => {
  const m = 7 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});
const DURATIONS = [
  { mins: 15, tag: 'Rapid Check' },
  { mins: 30, tag: 'Recommended' },
  { mins: 45, tag: 'Specialized' },
  { mins: 60, tag: 'Comprehensive' },
];
const makeDays = (schedules = []) => {
  const map = new Map((Array.isArray(schedules) ? schedules : []).map((s) => [Number(s.day_of_week), s]));
  return DAYS.map((d) => {
    const s = map.get(d.idx);
    return {
      day_of_week: d.idx,
      active: s ? s.is_active !== false : d.idx < 5,
      start: hhmm(s?.start_time) || '09:00',
      end: hhmm(s?.end_time) || (d.idx === 4 ? '13:00' : '17:00'),
    };
  });
};

const timeBox = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 14px',
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  backgroundColor: C.white,
};

const selClean = {
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: C.text,
  fontSize: 14,
  fontWeight: 700,
  padding: 0,
  cursor: 'pointer',
};

export default function DoctorAvailability() {
  const { profile, schedules, setSchedules, loading, refresh } = useDoctorData();
  const docId = Number(profile?.id);
  const [days, setDays] = useState(() => makeDays(schedules));
  const [duration, setDuration] = useState(() => Number(profile?.slot_duration_minutes) || 30);
  const [breakOn, setBreakOn] = useState(true);
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [clinicIdx, setClinicIdx] = useState(0);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const clinics = useMemo(() => {
    const list = [profile?.clinic, ...(Array.isArray(profile?.clinics) ? profile.clinics : [])].filter(Boolean);
    const unique = list.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
    return unique.length
      ? unique
      : [{ id: profile?.clinic_id ?? null, name: profile?.clinic_name || 'Main Clinic', address: profile?.room ? `Room ${profile.room}` : 'Consultation Suite' }];
  }, [profile]);

  const activeClinic = clinics[clinicIdx] || clinics[0];
  const safeDuration = Number(duration) > 0 ? Number(duration) : 30;
  const breakMins = breakOn && toMin(breakEnd) > toMin(breakStart) ? toMin(breakEnd) - toMin(breakStart) : 0;

  const stats = useMemo(() => {
    const perDay = days.map((d) => {
      if (!d.active || toMin(d.end) <= toMin(d.start)) return { ...d, hrs: 0, net: 0, slots: 0 };
      const raw = toMin(d.end) - toMin(d.start);
      const net = Math.max(0, raw - breakMins);
      return { ...d, hrs: +(raw / 60).toFixed(1), net, slots: Math.floor(net / safeDuration) };
    });
    const totalMins = perDay.reduce((sum, x) => sum + x.net, 0);
    const totalSlots = perDay.reduce((sum, x) => sum + x.slots, 0);
    const activeCount = perDay.filter((x) => x.active).length;
    return {
      perDay,
      activeCount,
      weeklyHrs: +(totalMins / 60).toFixed(1),
      totalSlots,
      avgDailySlots: activeCount ? Math.round(totalSlots / activeCount) : 0,
    };
  }, [days, safeDuration, breakMins]);

  const onSave = async () => {
    setMsg(null);
    const bad = days.find((d) => d.active && toMin(d.end) <= toMin(d.start));
    if (bad) return setMsg({ ok: false, text: `${DAYS[bad.day_of_week].label}: end time must be after start time.` });

    setSaving(true);
    try {
      if (Number.isInteger(docId) && docId > 0) {
        const payload = days.map((d) => ({
          day_of_week: d.day_of_week,
          start_time: `${d.start}:00`,
          end_time: `${d.end}:00`,
          is_active: d.active,
          clinic_id: activeClinic?.id ?? null,
        }));
        const data = await updateSchedules(docId, payload);
        await updateDoctor(docId, { slot_duration_minutes: safeDuration }).catch(() => null);
        if (Array.isArray(data)) setSchedules(data);
        await refresh();
      }
      setMsg({ ok: true, text: 'Availability schedule saved and synced.' });
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    } finally {
      setSaving(false);
    }
  };

     return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Helmet><title>Doctor Availability | Clinika</title></Helmet>
      <div>
        <div style={{ fontSize: 12, color: C.m }}>
          Doctor Dashboard <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} /> <b style={{ color: C.p }}>Manage Availability</b>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={pill(C.primaryFixed, C.primary)}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: C.primary }} />
            SCHEDULE ACTIVE
          </span>
          <span style={{ fontSize: 12, color: C.muted }}>
            <i className="fa-regular fa-clock" /> Synchronized
          </span>
        </div>
      </div>

      {msg && (
        <div style={{ ...card, padding: '12px 16px', backgroundColor: msg.ok ? '#ECFDF5' : C.errBg, color: msg.ok ? '#047857' : C.errText, fontSize: 13, fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div style={card}>Loading availability...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 310px', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {bannerOpen && (
              <div style={{ ...card, padding: '14px 18px', backgroundColor: '#f3f7fd', border: '1px solid #d8e5f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: C.primary, color: C.white, display: 'grid', placeItems: 'center' }}>
                    <i className="fa-solid fa-check" style={{ fontSize: 12 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Your availability is live &amp; verified</div>
                    <div style={{ fontSize: 12, color: C.muted }}>New booking slots are reflected on Clinika search and booking portals.</div>
                  </div>
                </div>
                <button type="button" onClick={() => setBannerOpen(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 15 }}>✕</button>
              </div>
            )}

            {/* Clinic Selector */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: C.muted }}>
                    LOCATION • <span style={{ color: C.text, textTransform: 'none', fontSize: 15 }}>Select Practicing Clinic</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    Availability, working days, and consultation hours are managed per clinic location.
                  </div>
                </div>
                {clinics.length > 1 && <span style={pill(C.low, C.muted)}>Multi-Clinic Mode</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {clinics.map((c, i) => {
                  const active = i === clinicIdx;
                  return (
                    <div
                      key={c.id ?? i}
                      onClick={() => setClinicIdx(i)}
                      style={{
                        padding: 14, borderRadius: 14, cursor: 'pointer',
                        border: `1.5px solid ${active ? C.primary : C.border}`,
                        backgroundColor: active ? '#f6f9ff' : C.white,
                        display: 'flex', flexDirection: 'column', gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: 14, color: C.text }}>{c.name}</strong>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                          backgroundColor: active ? C.primary : C.low, color: active ? C.white : C.muted,
                        }}>
                          {active ? 'Active Location' : 'Switch'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>{c.address || 'Clinic Location'}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 01: Working Days */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: C.primary }}>
                  STEP 01 • <span style={{ color: C.text, fontSize: 16 }}>Working Days</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Select the days of the week you accept patient appointments.</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
                {days.map((d) => (
                  <button
                    key={d.day_of_week}
                    type="button"
                    onClick={() => { setMsg(null); setDays((p) => p.map((x) => (x.day_of_week === d.day_of_week ? { ...x, active: !x.active } : x))); }}
                    style={{
                      padding: '12px 6px', borderRadius: 12, cursor: 'pointer',
                      border: `1.5px solid ${d.active ? C.primary : C.border}`,
                      backgroundColor: d.active ? C.primary : C.white,
                      color: d.active ? C.white : C.text,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{DAYS[d.day_of_week].short}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      backgroundColor: d.active ? 'rgba(255,255,255,0.2)' : C.low,
                      color: d.active ? C.white : C.muted,
                    }}>
                      {d.active ? 'Active' : 'Off'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 02: Shift Hours */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: C.primary }}>
                    STEP 02 • <span style={{ color: C.text, fontSize: 16 }}>Shift Hours &amp; Daily Schedule</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Specify arrival and departure consulting windows per active day.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const m = days[0];
                    if (m) { setMsg(null); setDays((p) => p.map((x) => (x.active ? { ...x, start: m.start, end: m.end } : x))); }
                  }}
                  style={btn(C.low, C.text, { border: `1px solid ${C.border}`, padding: '8px 12px', fontSize: 12 })}
                >
                  <i className="fa-regular fa-copy" /> Copy Mon hours to all
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.perDay.filter((d) => d.active).map((d) => (
                  <div key={d.day_of_week} style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: C.low, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.primaryFixed, color: C.primary, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>
                        {DAYS[d.day_of_week].short[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{DAYS[d.day_of_week].label}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{DAYS[d.day_of_week].note}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: C.muted }}>From</span>
                      <select
                        value={d.start}
                        onChange={(e) => { setMsg(null); setDays((p) => p.map((x) => (x.day_of_week === d.day_of_week ? { ...x, start: e.target.value } : x))); }}
                        style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.white, color: C.text, fontSize: 13, fontWeight: 600 }}
                      >
                        {TIMES.map((t) => <option key={t} value={t}>{to12(t)}</option>)}
                      </select>
                      <span style={{ fontSize: 12, color: C.muted }}>to</span>
                      <select
                        value={d.end}
                        onChange={(e) => { setMsg(null); setDays((p) => p.map((x) => (x.day_of_week === d.day_of_week ? { ...x, end: e.target.value } : x))); }}
                        style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.white, color: C.text, fontSize: 13, fontWeight: 600 }}
                      >
                        {TIMES.map((t) => <option key={t} value={t}>{to12(t)}</option>)}
                      </select>
                      <span style={pill(C.primaryFixed, C.primary)}>{d.hrs} hrs</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* STEP 03: Consultation Slot Duration */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: C.primary }}>
                  STEP 03 • <span style={{ color: C.text, fontSize: 16 }}>Consultation Slot Duration</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Each booking slot will be generated based on this consultation window.</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
                {DURATIONS.map((item) => {
                  const selected = safeDuration === item.mins;
                  return (
                    <button
                      key={item.mins}
                      type="button"
                      onClick={() => setDuration(item.mins)}
                      style={{
                        padding: '18px 12px', borderRadius: 14, cursor: 'pointer',
                        border: `1.5px solid ${selected ? C.primary : 'transparent'}`,
                        backgroundColor: selected ? C.primary : C.low,
                        color: selected ? C.white : C.text,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 22, fontWeight: 700 }}>{item.mins}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', opacity: selected ? 0.9 : 0.7 }}>MINUTES</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, marginTop: 4, padding: '3px 10px', borderRadius: 999,
                        backgroundColor: selected ? C.white : 'transparent',
                        color: selected ? C.primary : C.muted,
                      }}>
                        {item.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lunch / Midday Break */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.primaryFixed, color: C.primary, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <i className="fa-solid fa-utensils" style={{ fontSize: 15 }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 15, color: C.text }}>Lunch / Midday Break</strong>
                      <span style={pill(C.low, C.muted)}>OPTIONAL</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      Slots falling within this break window will be automatically hidden from patient booking.
                    </div>
                  </div>
                </div>

                {/* Pill Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={breakOn}
                  onClick={() => setBreakOn((v) => !v)}
                  style={{
                    width: 44, height: 24, borderRadius: 999, border: 'none', padding: 2,
                    backgroundColor: breakOn ? C.primary : C.border,
                    display: 'flex', alignItems: 'center',
                    justifyContent: breakOn ? 'flex-end' : 'flex-start',
                    cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: C.white }} />
                </button>
              </div>

              {breakOn && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={timeBox}>
                    <i className="fa-regular fa-clock" style={{ color: C.muted, fontSize: 14 }} />
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Break Starts</div>
                      <select value={breakStart} onChange={(e) => setBreakStart(e.target.value)} style={selClean}>
                        {TIMES.map((t) => <option key={t} value={t}>{to12(t)}</option>)}
                      </select>
                    </div>
                  </div>

                  <span style={{ fontSize: 13, color: C.muted }}>until</span>

                  <div style={timeBox}>
                    <i className="fa-regular fa-clock" style={{ color: C.muted, fontSize: 14 }} />
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Break Ends</div>
                      <select value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} style={selClean}>
                        {TIMES.map((t) => <option key={t} value={t}>{to12(t)}</option>)}
                      </select>
                    </div>
                  </div>

                  <span style={{ ...pill('#eef3fc', C.primary), textTransform: 'none', letterSpacing: 0, fontSize: 12, padding: '8px 14px' }}>
                    <i className="fa-solid fa-circle-info" />
                    {breakMins > 0 ? `${breakMins}-minute recurring buffer reserved` : 'Select valid break window'}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div style={{ ...card, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-solid fa-cloud-arrow-up" style={{ color: C.primary }} />
                Unsaved modifications are cached locally
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setMsg(null);
                    setDays(makeDays(schedules));
                    setDuration(Number(profile?.slot_duration_minutes) || 30);
                  }}
                  style={btn(C.low, C.text, { padding: '10px 16px', fontSize: 13 })}
                >
                  Reset Changes
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={onSave}
                  style={btn(C.primary, C.white, { padding: '10px 18px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 })}
                >
                  <i className="fa-regular fa-floppy-disk" />
                  {saving ? 'Saving...' : 'Save Availability'}
                </button>
              </div>
            </div>
          </div>

          <AvailabilitySummary activeClinic={activeClinic} stats={stats} duration={safeDuration} />
        </div>
      )}

      {profile?.id && <TimeOffManager doctorId={profile.id} />}
    </div>
  );
}
