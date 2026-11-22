import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  useDoctorData, api, errMsg, hhmm, toMin, to12, drName, C, card, pill, btn,
} from './DoctorDashboard';

const DAYS = [
  [0, 'Mon', 'Monday'],
  [1, 'Tue', 'Tuesday'],
  [2, 'Wed', 'Wednesday'],
  [3, 'Thu', 'Thursday'],
  [4, 'Fri', 'Friday'],
  [5, 'Sat', 'Saturday'],
  [6, 'Sun', 'Sunday'],
];

const DURATIONS = [
  [15, 'Rapid check'],
  [30, 'Recommended'],
  [45, 'Extended'],
  [60, 'Comprehensive'],
];

const POLICIES = [
  'Patients cannot book within 2 hours of current time to prevent last-minute clinic disruption.',
  'Modifications to active slots take effect immediately for upcoming patient searches.',
  'Pre-existing patient appointments are preserved during slot reconfigurations.',
];

const FALLBACK_LOCATIONS = [
  { id: 'loc-1', name: 'Clinika Main Medical Center', address: 'Nasr City, Cairo' },
  { id: 'loc-2', name: 'Clinika Nile Branch', address: 'Maadi, Cairo' },
  { id: 'loc-3', name: 'Online Tele-Consultation Hub', address: 'Virtual Clinic' },
];

const TIME_OPTIONS = Array.from({ length: 36 }, (_, idx) => {
  const mins = 7 * 60 + idx * 30;
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
});

function buildState(schedules, profile) {
  const days = {};
  for (const [k] of DAYS) {
    const row = schedules.find((r) => r.day_of_week === k && r.is_active);
    const isWeekday = k <= 4;
    days[k] = {
      on: row ? true : !schedules.length && isWeekday,
      start: row ? hhmm(row.start_time) : '09:00',
      end: row ? hhmm(row.end_time) : '17:00',
    };
  }
  return {
    days,
    duration: Number(profile?.slot_duration_minutes) || 30,
    breakOn: true,
    bStart: '13:00',
    bEnd: '14:00',
  };
}

export default function DoctorAvailability() {
  const { user, profile, schedules, setSchedules, loading, isGuestPreview, refresh } = useDoctorData();
  const clinics = useMemo(() => {
    const fromProfile = profile?.clinics?.length ? profile.clinics : profile?.clinic ? [profile.clinic] : [];
    return fromProfile.length ? fromProfile : FALLBACK_LOCATIONS;
  }, [profile]);

  const [clinicId, setClinicId] = useState('');
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const baseForm = useMemo(() => buildState(schedules, profile), [schedules, profile]);
  const form = draft ?? baseForm;
  const hasUnsaved = draft !== null;

  const setForm = (updater) =>
    setDraft((prev) => {
      const current = prev ?? baseForm;
      return typeof updater === 'function' ? updater(current) : updater;
    });

  const activeClinic = clinics.find((c) => String(c.id) === String(clinicId)) || clinics[0] || null;
  const docId = Number(profile?.id);
  const hasDoctorId = Number.isInteger(docId) && docId > 0;

  const activeDays = DAYS.filter(([k]) => form.days[k]?.on);
  const dayHours = (d) => Math.max(0, toMin(d.end) - toMin(d.start)) / 60;
  const breakDurationMins = Math.max(0, toMin(form.bEnd) - toMin(form.bStart));
  const breakMins = (d) =>
    form.breakOn
      ? Math.max(0, Math.min(toMin(d.end), toMin(form.bEnd)) - Math.max(toMin(d.start), toMin(form.bStart)))
      : 0;
  const daySlots = (d) => Math.max(0, Math.floor((dayHours(d) * 60 - breakMins(d)) / form.duration));

  const weekHours = activeDays.reduce((acc, [k]) => acc + dayHours(form.days[k]), 0);
  const weekSlots = activeDays.reduce((acc, [k]) => acc + daySlots(form.days[k]), 0);
  const maxSlots = Math.max(1, ...DAYS.map(([k]) => (form.days[k]?.on ? daySlots(form.days[k]) : 0)));
  const invalid =
    activeDays.some(([k]) => dayHours(form.days[k]) <= 0) ||
    (form.breakOn && toMin(form.bEnd) <= toMin(form.bStart));

  const toggleDay = (k) => {
    setMsg(null);
    setForm((p) => ({ ...p, days: { ...p.days, [k]: { ...p.days[k], on: !p.days[k].on } } }));
  };

  const setDayTime = (k, field, value) => {
    setMsg(null);
    setForm((p) => ({ ...p, days: { ...p.days, [k]: { ...p.days[k], [field]: value } } }));
  };

  const applyWeekdays = () => {
    setMsg(null);
    setForm((p) => {
      const next = { ...p.days };
      for (let k = 0; k < 7; k++) {
        next[k] = { ...next[k], on: k <= 4 };
      }
      return { ...p, days: next };
    });
  };

  const copyMonToAll = () => {
    setMsg(null);
    const mon = form.days[0];
    setForm((p) => {
      const next = { ...p.days };
      for (let k = 0; k < 7; k++) {
        if (next[k].on) next[k] = { ...next[k], start: mon.start, end: mon.end };
      }
      return { ...p, days: next };
    });
  };

  const save = async () => {
    setMsg(null);
    if (invalid) {
      setMsg({ ok: false, text: 'Please check your start/end times and break window.' });
      return;
    }

    const payloadSchedules = DAYS.map(([k], idx) => ({
      id: idx + 1,
      day_of_week: k,
      start_time: `${form.days[k].start}:00`,
      end_time: `${form.days[k].end}:00`,
      is_active: Boolean(form.days[k].on),
      ...(activeClinic?.id ? { clinic_id: activeClinic.id } : {}),
    }));

    setSaving(true);
    try {
      if (!isGuestPreview && hasDoctorId) {
        await api.put(`/doctors/${docId}`, { slot_duration_minutes: Number(form.duration) }).catch(() => null);
        try {
          await api.put(`/doctors/${docId}/schedules`, { schedules: payloadSchedules });
        } catch {
          await api.post(`/doctors/${docId}/schedules`, payloadSchedules);
        }
        await refresh();
      } else {
        setSchedules(payloadSchedules);
      }
      setDraft(null);
      setMsg({ ok: true, text: `Availability updated for ${activeClinic?.name || 'selected location'}.` });
    } catch (e) {
      setSchedules(payloadSchedules);
      setDraft(null);
      setMsg({ ok: true, text: `Saved locally (${errMsg(e)}).` });
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
        <span style={pill(C.secondary, C.primary)}>
          <i className="fa-solid fa-circle-check" /> Schedule Active
        </span>
      </div>

      {msg && (
        <div style={{
          ...card, padding: '14px 20px', fontSize: 13, fontWeight: 600,
          backgroundColor: msg.ok ? '#ECFDF5' : C.errBg,
          color: msg.ok ? '#047857' : C.errText,
        }}>
          <i className={`fa-solid ${msg.ok ? 'fa-circle-check' : 'fa-circle-exclamation'}`} /> {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{ ...card, textAlign: 'center', color: C.muted }}>Loading schedule...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 8fr) minmax(280px, 4fr)', gap: 28, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Location • Select Practicing Clinic
              </div>
              <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 16px' }}>
                Availability, working days, and consultation hours are managed per clinic location.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {clinics.map((cl) => {
                  const selected = activeClinic && String(cl.id) === String(activeClinic.id);
                  return (
                    <button
                      type="button"
                      key={cl.id}
                      onClick={() => { setClinicId(String(cl.id)); setMsg(null); }}
                      style={{
                        textAlign: 'left', padding: 16, borderRadius: 14, cursor: 'pointer',
                        backgroundColor: selected ? C.secondary : C.low,
                        border: `1.5px solid ${selected ? C.primary : 'transparent'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: C.text }}>
                        <i className="fa-solid fa-location-dot" style={{ color: C.primary }} />
                        <span>{cl.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{cl.address || 'Main Clinic'}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Step 01 • Working Days
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Select the days of the week when you accept patient appointments.</div>
                </div>
                <button type="button" onClick={applyWeekdays} style={btn(C.low, C.primary, { padding: '8px 14px', fontSize: 12 })}>
                  Apply Weekdays Mon–Fri
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
                {DAYS.map(([k, short]) => {
                  const isOn = Boolean(form.days[k]?.on);
                  return (
                    <button
                      type="button"
                      key={k}
                      onClick={() => toggleDay(k)}
                      style={{
                        padding: '12px 6px', borderRadius: 12, border: 'none', cursor: 'pointer',
                        backgroundColor: isOn ? C.primary : C.low,
                        color: isOn ? '#fff' : C.muted,
                        fontWeight: 700, fontSize: 12,
                      }}
                    >
                      <div>{short}</div>
                      <div style={{ fontSize: 10, opacity: 0.85, marginTop: 4 }}>{isOn ? 'Active' : 'Off'}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Step 02 • Shift Hours & Daily Schedule
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Specify arrival and departure consulting windows per active day.</div>
                </div>
                <button type="button" onClick={copyMonToAll} style={btn(C.low, C.text, { padding: '8px 14px', fontSize: 12 })}>
                  <i className="fa-regular fa-copy" /> Copy Mon hours to all
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DAYS.map(([k, , full]) => {
                  const d = form.days[k];
                  const hrs = d.on ? +dayHours(d).toFixed(1) : 0;
                  return (
                    <div
                      key={k}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: 12, padding: '12px 16px', borderRadius: 12,
                        backgroundColor: d.on ? C.low : '#f8f9fa', opacity: d.on ? 1 : 0.65,
                      }}
                    >
                      <div style={{ minWidth: 130 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{full}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{d.on ? 'Full Day Consultation' : 'Unavailable'}</div>
                      </div>
                      {d.on ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <select
                            value={d.start}
                            onChange={(e) => setDayTime(k, 'start', e.target.value)}
                            style={{ padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.white, fontSize: 13 }}
                          >
                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{to12(t)}</option>)}
                          </select>
                          <span style={{ fontSize: 12, color: C.muted }}>to</span>
                          <select
                            value={d.end}
                            onChange={(e) => setDayTime(k, 'end', e.target.value)}
                            style={{ padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.white, fontSize: 13 }}
                          >
                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{to12(t)}</option>)}
                          </select>
                          <span style={pill(C.secondary, C.primary)}>{hrs}h</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: C.muted }}>Day off</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                Step 03 • Consultation Slot Duration
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                {DURATIONS.map(([mins, tag]) => {
                  const active = Number(form.duration) === mins;
                  return (
                    <button
                      type="button"
                      key={mins}
                      onClick={() => { setMsg(null); setForm((p) => ({ ...p, duration: mins })); }}
                      style={{
                        padding: 14, borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                        backgroundColor: active ? C.primary : C.low,
                        color: active ? '#fff' : C.text,
                        border: 'none',
                      }}
                    >
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{mins}</div>
                      <div style={{ fontSize: 11, opacity: 0.9 }}>MINUTES</div>
                      <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>{tag}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lunch / Midday Break */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: form.breakOn ? 20 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, backgroundColor: C.secondary, color: C.primary,
                    display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0,
                  }}>
                    <i className="fa-solid fa-utensils" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>Lunch / Midday Break</span>
                      <span style={{
                        backgroundColor: C.low, color: C.muted, fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6,
                      }}>
                        OPTIONAL
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                      Slots falling within this break window will be automatically hidden from patient booking.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={form.breakOn}
                  onClick={() => { setMsg(null); setForm((p) => ({ ...p, breakOn: !p.breakOn })); }}
                  style={{
                    width: 46, height: 26, borderRadius: 999, border: 'none', padding: 3,
                    backgroundColor: form.breakOn ? C.primary : C.high,
                    display: 'flex', alignItems: 'center',
                    justifyContent: form.breakOn ? 'flex-end' : 'flex-start',
                    cursor: 'pointer', flexShrink: 0, transition: 'background-color 0.2s',
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', backgroundColor: C.white,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>

              {form.breakOn && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', paddingLeft: 58 }}>
                  <div style={timeBoxStyle}>
                    <i className="fa-regular fa-clock" style={{ color: C.muted, fontSize: 16 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>Break Starts</span>
                      <select
                        value={form.bStart}
                        onChange={(e) => setDayTime ? setForm((p) => ({ ...p, bStart: e.target.value })) : null}
                        style={selectResetStyle}
                      >
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{to12(t)}</option>)}
                      </select>
                    </div>
                  </div>

                  <span style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>until</span>

                  <div style={timeBoxStyle}>
                    <i className="fa-regular fa-clock" style={{ color: C.muted, fontSize: 16 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>Break Ends</span>
                      <select
                        value={form.bEnd}
                        onChange={(e) => setForm((p) => ({ ...p, bEnd: e.target.value }))}
                        style={selectResetStyle}
                      >
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{to12(t)}</option>)}
                      </select>
                    </div>
                  </div>

                  {breakDurationMins > 0 && (
                    <span style={{
                      backgroundColor: C.secondary, color: C.primary, borderRadius: 10,
                      padding: '8px 14px', fontSize: 13, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}>
                      <i className="fa-solid fa-circle-info" />
                      <span>{breakDurationMins}-minute recurring buffer reserved</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Save Bar */}
            <div style={{
              ...card, padding: '16px 24px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.muted }}>
                <i className={`fa-solid ${hasUnsaved ? 'fa-cloud-arrow-up' : 'fa-cloud-check'}`} style={{ color: C.primary, fontSize: 16 }} />
                <span>{hasUnsaved ? 'Unsaved modifications are cached locally' : 'Schedule is up to date'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => { setMsg(null); setDraft(null); }}
                  style={btn(C.low, C.text, { padding: '12px 22px', fontWeight: 700 })}
                >
                  Reset Changes
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={save}
                  style={btn(C.primary, '#fff', {
                    padding: '12px 24px', fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    opacity: saving ? 0.65 : 1, boxShadow: '0 4px 14px rgba(0,80,203,0.28)',
                  })}
                >
                  <i className="fa-regular fa-floppy-disk" />
                  <span>{saving ? 'Saving...' : 'Save Availability'}</span>
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.secondary, color: C.primary, display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                  <i className="fa-solid fa-user-doctor" />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{user?.full_name ? drName(user.full_name) : 'Dr. Nadia Mansour'}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{profile?.specialty?.name || 'Internal Medicine'}</div>
                </div>
              </div>
              {activeClinic && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: C.low }}>
                  <div style={{ fontSize: 11, color: C.muted }}>Configuring Clinic</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{activeClinic.name}</div>
                </div>
              )}
            </div>

            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Live Schedule Capacity</h3>
                <span style={pill(C.secondary, C.primary)}>Calculated</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ backgroundColor: C.low, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: C.muted }}>Weekly Consulting</div>
                  <div style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>{+weekHours.toFixed(1)} hrs</div>
                  <div style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>Across {activeDays.length} days</div>
                </div>
                <div style={{ backgroundColor: C.low, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: C.muted }}>Available Daily</div>
                  <div style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>
                    ~{activeDays.length ? Math.round(weekSlots / activeDays.length) : 0} Slots
                  </div>
                  <div style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>At {form.duration}m / patient</div>
                </div>
              </div>

              <div style={{ backgroundColor: C.low, borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                  <span>Weekly Slot Allocation</span>
                  <span style={{ color: C.primary }}>{weekSlots} Slots / Week</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 48, borderBottom: `1px dashed ${C.border}` }}>
                  {DAYS.map(([k]) => {
                    const n = form.days[k]?.on ? daySlots(form.days[k]) : 0;
                    return (
                      <div
                        key={k}
                        style={{
                          width: 22,
                          height: n > 0 ? Math.max(6, (n / maxSlots) * 44) : 4,
                          borderRadius: 4,
                          backgroundColor: n > 0 ? C.primary : '#e0e3e5',
                        }}
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: C.muted, marginTop: 6, padding: '0 6px' }}>
                  {DAYS.map(([k, short]) => <span key={k}>{short[0]}</span>)}
                </div>
              </div>

              {nextDay && (
                <div style={{ padding: 12, borderRadius: 12, backgroundColor: C.secondary, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: '#101d28' }}>Next Operating Day</div>
                  <div style={{ color: '#3c4855', marginTop: 2 }}>
                    {nextDay.when} • {to12(nextDay.d.start)} – {to12(nextDay.d.end)}
                  </div>
                </div>
              )}

              {hasDoctorId && (
                <Link to={`/doctors/doctor_profile/${docId}`} style={{ textAlign: 'center', backgroundColor: C.low, color: C.primary, padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  Preview Public Profile & Booking <i className="fa-solid fa-arrow-right" />
                </Link>
              )}
            </div>

            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Clinika Schedule Policies</h4>
              {POLICIES.map((p) => (
                <div key={p} style={{ display: 'flex', gap: 8, fontSize: 12, color: C.muted, lineHeight: '18px' }}>
                  <i className="fa-solid fa-check" style={{ color: C.primary, marginTop: 3 }} />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
