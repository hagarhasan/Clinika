import { useMemo, useState } from 'react';
import { useDoctorData, api, errMsg, dayText, hhmm, to12, initials, C, card, pill, btn, STATUS_UI } from './DoctorDashboard';

export default function DoctorAppointments() {
  const { appointments, setAppointments, loading, refresh } = useDoctorData();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState(null);

  const counts = useMemo(() => {
    const all = appointments.length;
    const pending = appointments.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
    const confirmed = appointments.filter((a) => (a.status || '').toLowerCase() === 'confirmed').length;
    return { all, pending, confirmed };
  }, [appointments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter((a) => {
      const st = (a.status || 'pending').toLowerCase();
      if (tab !== 'all' && st !== tab) return false;
      if (!q) return true;
      const pName = (a.patient_name || a.patient?.full_name || '').toLowerCase();
      const reason = (a.reason || '').toLowerCase();
      return pName.includes(q) || reason.includes(q);
    });
  }, [appointments, tab, search]);

  const updateStatus = async (id, nextStatus) => {
    setMsg(null);
    setBusyId(id);
    try {
      await api.patch(`/appointments/${id}/status`, { status: nextStatus });
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a)));
      setMsg({ ok: true, text: `Appointment updated to ${nextStatus}.` });
      await refresh();
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ maxWidth: 1220, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
          Doctor Dashboard &gt; <span style={{ color: C.primary, fontWeight: 600 }}>Manage Appointments</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: C.text }}>Manage Appointments</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>
          Review appointment requests, coordinate daily workflow, and manage consultation schedules.
        </p>
      </div>

      {msg && (
        <div style={{ ...card, padding: '12px 16px', backgroundColor: msg.ok ? '#ECFDF5' : C.errBg, color: msg.ok ? '#047857' : C.errText, fontSize: 13, fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={{ ...card, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>ACTION REQUIRED</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.text, marginTop: 4 }}>{counts.pending} Requests</div>
            <div style={{ fontSize: 12, color: C.muted }}>Pending confirmation</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.secondary, color: C.primary, display: 'grid', placeItems: 'center' }}>
            <i className="fa-regular fa-hourglass-half" />
          </div>
        </div>

        <div style={{ ...card, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>ACTIVE SCHEDULED</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.text, marginTop: 4 }}>{counts.confirmed} Sessions</div>
            <div style={{ fontSize: 12, color: C.muted }}>Confirmed bookings</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.primaryFixed, color: C.primary, display: 'grid', placeItems: 'center' }}>
            <i className="fa-regular fa-calendar-check" />
          </div>
        </div>

        <div style={{ ...card, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>TOTAL LOAD</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.text, marginTop: 4 }}>{counts.all} Bookings</div>
            <div style={{ fontSize: 12, color: C.muted }}>All recorded appointments</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.low, color: C.text, display: 'grid', placeItems: 'center' }}>
            <i className="fa-regular fa-id-badge" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ ...card, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'pending', label: `Pending (${counts.pending})` },
            { id: 'confirmed', label: `Confirmed (${counts.confirmed})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                backgroundColor: tab === t.id ? C.primary : C.low,
                color: tab === t.id ? C.white : C.muted,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search patient name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 13, minWidth: 230 }}
        />
      </div>

      {/* Appointments Cards */}
      {loading ? (
        <div style={card}>Loading appointments...</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: C.muted }}>No matching appointments found.</div>
      ) : (
        filtered.map((a, idx) => {
          const pName = a.patient_name || a.patient?.full_name || `Patient #${a.id ?? idx + 1}`;
          const stKey = (a.status || 'pending').toLowerCase();
          const st = STATUS_UI[stKey] || STATUS_UI.pending;
          const isOnline = a.consultation_type === 'online';
          const busy = busyId === a.id;
          const dateLabel = a.appointment_date ? dayText(a.appointment_date) : 'Scheduled';
          const timeLabel = a.start_time ? to12(hhmm(a.start_time)) : '';

          return (
            <div key={a.id ?? idx} style={{ ...card, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.primaryFixed, color: C.primary, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {initials(pName) || 'PT'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 16, color: C.text }}>{pName}</strong>
                    <span style={pill(st.bg, st.color)}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: st.dot }} />
                      {stKey.toUpperCase()}
                    </span>
                    <span style={pill(C.low, C.muted)}>
                      {isOnline ? 'Online (Video Consultation)' : `In-person (${a.clinic?.name || a.room || 'Clinic'})`}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>
                    <i className="fa-regular fa-clock" /> {dateLabel}
                    {timeLabel ? ` • ${timeLabel}` : ''}
                    {` • ${a.duration_minutes || 30} mins`}
                  </div>

                  {a.reason && (
                    <div style={{ fontSize: 13, color: C.text, marginTop: 5 }}>
                      Reason: &ldquo;{a.reason}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSelected(a)}
                  style={btn(C.low, C.text, { border: `1px solid ${C.border}`, padding: '8px 14px', fontSize: 13 })}
                >
                  View Details
                </button>

                {stKey === 'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateStatus(a.id, 'cancelled')}
                      style={btn(C.errBg, C.errText, { padding: '8px 14px', fontSize: 13 })}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateStatus(a.id, 'confirmed')}
                      style={btn(C.primary, C.white, { padding: '8px 14px', fontSize: 13 })}
                    >
                      Accept
                    </button>
                  </>
                )}

                {stKey === 'confirmed' && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateStatus(a.id, 'cancelled')}
                      style={btn(C.errBg, C.errText, { padding: '8px 14px', fontSize: 13 })}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateStatus(a.id, 'completed')}
                      style={btn(C.primaryFixed, C.primary, { padding: '8px 14px', fontSize: 13 })}
                    >
                      Mark as Completed
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 17, color: C.text }}>Appointment Details</strong>
              <button type="button" onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: C.muted }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: C.text }}><strong>Patient:</strong> {selected.patient_name || selected.patient?.full_name || `#${selected.id}`}</div>
            <div style={{ fontSize: 13, color: C.text }}><strong>Status:</strong> {(selected.status || 'pending').toUpperCase()}</div>
            <div style={{ fontSize: 13, color: C.text }}><strong>Date &amp; Time:</strong> {selected.appointment_date ? dayText(selected.appointment_date) : '-'} {selected.start_time ? `• ${to12(hhmm(selected.start_time))}` : ''}</div>
            <div style={{ fontSize: 13, color: C.text }}><strong>Type:</strong> {selected.consultation_type === 'online' ? 'Online' : 'In-person'}</div>
            {selected.reason && <div style={{ fontSize: 13, color: C.text }}><strong>Reason:</strong> {selected.reason}</div>}
          </div>
        </div>
      )}
    </div>
  );
}