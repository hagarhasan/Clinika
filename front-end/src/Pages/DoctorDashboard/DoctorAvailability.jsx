import { useEffect, useState } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const TOKEN = 'token';
const API = 'https://clinika-backend.vercel.app';
const C = { p: '#0050cb', t: '#191c1e', m: '#424655', s: '#d7e4f4', low: '#f2f4f6', w: '#fff', b: '#c2c6d8', eb: '#ffdad6', et: '#93000a', pf: '#dae1ff' };
const card = { background: C.w, borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.05)', padding: 24 };
const DAYS = [[0, 'Mon', 'Monday'], [1, 'Tue', 'Tuesday'], [2, 'Wed', 'Wednesday'], [3, 'Thu', 'Thursday'], [4, 'Fri', 'Friday'], [5, 'Sat', 'Saturday'], [6, 'Sun', 'Sunday']];
const DURATIONS = [15, 30, 45, 60];
const TIMES = Array.from({ length: 33 }, (_, i) => {
  const m = 360 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});
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
const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  return typeof d === 'string' ? d : Array.isArray(d) ? d.map((x) => x.msg || String(x)).join(', ') : e?.message || 'Request failed';
};
const hdr = () => {
  const t = localStorage.getItem(TOKEN);
  return t ? { Authorization: `Bearer ${t}` } : {};
};
const initDays = () => Object.fromEntries(DAYS.map(([k]) => [k, { on: k < 5, start: '09:00', end: '17:00' }]));

export default function DoctorAvailability() {
  const { user, profile } = useOutletContext() || {};
  const isDoc = Boolean(profile?.id) && String(user?.role || '').toLowerCase() === 'doctor';
  const doctorId = isDoc ? profile.id : null;
  const clinics = isDoc ? (profile?.clinics?.length ? profile.clinics : profile?.clinic ? [profile.clinic] : []) : [];

  const [days, setDays] = useState(initDays);
  const [durationDraft, setDurationDraft] = useState(null);
  const [clinicDraft, setClinicDraft] = useState(undefined);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const duration = durationDraft ?? (profile?.slot_duration_minutes || 30);
  const clinicId = clinicDraft !== undefined ? clinicDraft : (clinics[0]?.id ?? null);

  useEffect(() => {
    if (!doctorId) return;
    let alive = true;
    axios.get(`${API}/doctors/${doctorId}/schedules`, { headers: hdr() })
      .then((r) => {
        if (!alive) return;
        const rows = Array.isArray(r.data) ? r.data : [];
        if (rows.length) {
          const next = Object.fromEntries(DAYS.map(([k]) => [k, { on: false, start: '09:00', end: '17:00' }]));
          DAYS.forEach(([k]) => {
            const p = rows.filter((x) => x.day_of_week === k && x.is_active !== false).sort((a, b) => hhmm(a.start_time).localeCompare(hhmm(b.start_time)));
            if (p.length) next[k] = { on: true, start: hhmm(p[0].start_time), end: hhmm(p[p.length - 1].end_time) };
          });
          setDays(next);
        }
        const foundClinic = rows.find((x) => x.clinic_id)?.clinic_id;
        if (foundClinic) setClinicDraft(foundClinic);
      })
      .catch((e) => alive && setMsg({ ok: false, text: errMsg(e) }));
    return () => { alive = false; };
  }, [doctorId]);

  const setDay = (k, patch) => setDays((p) => ({ ...p, [k]: { ...p[k], ...patch } }));
  const active = DAYS.filter(([k]) => days[k].on);
  const hrs = (d) => Math.max(0, toMin(d.end) - toMin(d.start)) / 60;
  const invalid = !isDoc || active.some(([k]) => hrs(days[k]) <= 0);

  const save = async () => {
    if (!doctorId) {
      setMsg({ ok: false, text: 'Doctor account required.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    const items = active.map(([k]) => ({ day_of_week: k, start_time: days[k].start, end_time: days[k].end, is_active: true, clinic_id: clinicId }));
    try {
      await axios.put(`${API}/doctors/${doctorId}/schedules`, items, { headers: hdr() });
      if (duration !== profile?.slot_duration_minutes) {
        await axios.put(`${API}/doctors/${doctorId}`, { slot_duration_minutes: duration }, { headers: hdr() });
      }
      setMsg({ ok: true, text: 'Availability saved.' });
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
        <h1 style={{ fontSize: 34, fontWeight: 700, margin: '4px 0' }}>Manage Availability</h1>
      </div>

      {!isDoc && (
        <div style={{ ...card, padding: 14, background: C.eb, color: C.et, fontSize: 13, fontWeight: 600 }}>
          <i className="fa-solid fa-lock" /> Location selection and schedule saving require a registered doctor account.
        </div>
      )}
      {msg && (
        <div style={{ ...card, padding: 14, background: msg.ok ? C.w : C.eb, color: msg.ok ? C.t : C.et, fontSize: 13, fontWeight: 600 }}>
          <i className={`fa-solid ${msg.ok ? 'fa-circle-check' : 'fa-circle-exclamation'}`} /> {msg.text}
        </div>
      )}

      {isDoc && clinics.length > 0 && (
        <div style={card}>
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}><i className="fa-solid fa-building" style={{ color: C.p }} /> Practicing Clinic</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
            {clinics.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClinicDraft(c.id)}
                style={{ textAlign: 'left', padding: 14, borderRadius: 12, cursor: 'pointer', border: c.id === clinicId ? `2px solid ${C.p}` : `1px solid ${C.b}`, background: c.id === clinicId ? C.pf : C.low }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                {c.address && <div style={{ fontSize: 12, color: C.m }}>{c.address}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={card}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}><i className="fa-solid fa-calendar-week" style={{ color: C.p }} /> Working Days & Hours</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DAYS.map(([k, , full]) => {
            const d = days[k];
            const h = hrs(d);
            return (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 12, borderRadius: 12, background: C.low }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14, cursor: isDoc ? 'pointer' : 'not-allowed' }}>
                  <input type="checkbox" disabled={!isDoc} checked={d.on} onChange={(e) => setDay(k, { on: e.target.checked })} /> {full}
                </label>
                {d.on && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select disabled={!isDoc} value={d.start} onChange={(e) => setDay(k, { start: e.target.value })}>
                      {TIMES.map((t) => <option key={t} value={t}>{to12(t)}</option>)}
                    </select>
                    <span>to</span>
                    <select disabled={!isDoc} value={d.end} onChange={(e) => setDay(k, { end: e.target.value })}>
                      {TIMES.map((t) => <option key={t} value={t}>{to12(t)}</option>)}
                    </select>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: h > 0 ? C.s : C.eb }}>
                      {h > 0 ? `${+h.toFixed(1)}h` : 'Invalid'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Link
          to="/doctors"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, padding: 14, borderRadius: 12, background: C.low, color: C.p, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
        >
          Preview Public Profile & Booking <i className="fa-solid fa-arrow-right" />
        </Link>
      </div>

      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.m }}>Slot:</span>
          {DURATIONS.map((m) => (
            <button
              key={m}
              type="button"
              disabled={!isDoc}
              onClick={() => setDurationDraft(m)}
              style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: isDoc ? 'pointer' : 'not-allowed', fontWeight: 600, background: duration === m ? C.p : C.low, color: duration === m ? C.w : C.m }}
            >
              {m}m
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={saving || invalid}
          onClick={save}
          style={{ padding: '11px 22px', borderRadius: 12, border: 'none', background: C.p, color: C.w, fontWeight: 600, cursor: saving || invalid ? 'not-allowed' : 'pointer', opacity: saving || invalid ? 0.6 : 1 }}
        >
          <i className={`fa-solid ${saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} /> {saving ? 'Saving...' : 'Save Availability'}
        </button>
      </div>
    </div>
  );
}
