import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  useDoctorData, api, errMsg, hhmm, to12, toMin, dayText, initials,
  C, card, pill, btn, STATUS_UI,
} from './DoctorDashboard';

const overlay = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(45,49,51,0.4)',
  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', padding: 16, zIndex: 100,
};
const isOnline = (a) => a.consultation_type === 'online';
const mins = (a) => toMin(hhmm(a.end_time)) - toMin(hhmm(a.start_time));
const typeLabel = (a) =>
  isOnline(a) ? 'Online (Video Consultation)' : `In-person${a.clinic ? ` (${a.clinic.name})` : ''}`;
const STATUS_TEXT = {
  pending: 'Pending Confirmation',
  confirmed: 'Confirmed Appointment',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  no_show: 'No Show',
};
const Dot = ({ s }) =>
  s.dot === C.primary && s.bg === C.container ? (
    <i className="fa-solid fa-circle-check" style={{ color: C.primary, fontSize: 12 }} />
  ) : (
    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.dot }} />
  );

export default function DoctorAppointments() {
  const { appointments: list, setAppointments, loading, isGuestPreview, refresh } = useDoctorData();
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [details, setDetails] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const act = async (id, request, localPatch) => {
    setBusyId(id);
    setError('');
    try {
      if (isGuestPreview) {
        if (localPatch) setAppointments((prev) => prev.map((item) => (item.id === id ? { ...item, ...localPatch } : item)));
        return;
      }
      await request();
      await refresh();
    } catch (e) {
      if (localPatch) {
        setAppointments((prev) => prev.map((item) => (item.id === id ? { ...item, ...localPatch } : item)));
      }
      setError(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = (id, status) =>
    act(id, () => api.patch(`/appointments/${id}/status`, { status }), { status });

  const rejectAppt = async (a) => {
    setConfirm(null);
    await act(
      a.id,
      async () => {
        try {
          await api.patch(`/appointments/${a.id}/status`, { status: 'rejected' });
        } catch (e) {
          if (e?.response?.status === 400 || e?.response?.status === 422) {
            await api.patch(`/appointments/${a.id}/cancel`, { reason: 'Rejected by doctor' });
          } else {
            throw e;
          }
        }
      },
      { status: 'rejected' }
    );
  };

  const cancelAppt = (a) => {
    setConfirm(null);
    act(a.id, () => api.patch(`/appointments/${a.id}/cancel`, {}), { status: 'cancelled' });
  };

  const count = (s) => list.filter((a) => a.status === s).length;
  const val = (n) => (loading ? '...' : n);
  const q = search.toLowerCase().trim();
  const visible = list.filter(
    (a) =>
      (filter === 'all' || a.status === filter) &&
      (a.patient?.full_name || '').toLowerCase().includes(q)
  );

  const tabs = [
    ['all', `All (${list.length})`],
    ['pending', `Pending (${count('pending')})`],
    ['confirmed', `Confirmed (${count('confirmed')})`],
  ];
  const metrics = [
    ['Action Required', `${val(count('pending'))} Requests`, 'Pending confirmation', 'fa-hourglass-half', C.secondary],
    ['Active Scheduled', `${val(count('confirmed'))} Sessions`, 'Confirmed bookings', 'fa-calendar-check', C.primaryFixed],
    ['Total Load', `${val(list.length)} Bookings`, 'Across all your appointments', 'fa-notes-medical', C.container],
  ];
  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <Helmet><title>Doctor Appointments | Clinika</title></Helmet>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted }}>
            Doctor Dashboard <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />{' '}
            <b style={{ color: C.primary }}>Manage Appointments</b>
          </div>
          <h1 style={{ fontSize: 40, lineHeight: '48px', fontWeight: 700, letterSpacing: '-0.025em', margin: '4px 0' }}>
            Manage Appointments
          </h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
            Review appointment requests, coordinate daily workflow, and manage consultation schedules.
          </p>
        </div>
        <div style={{ ...card, padding: '8px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600 }}>
          <i className="fa-regular fa-calendar" style={{ color: C.primary }} /> Today: {todayLabel}
        </div>
      </div>

      {error && (
        <div style={{ ...card, backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: 13, padding: '14px 20px' }}>
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {metrics.map(([k, v, note, icon, bg]) => (
          <div key={k} style={{ ...card, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
              <div style={{ fontSize: 24, fontWeight: 600, margin: '4px 0 2px' }}>{v}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{note}</div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: bg, display: 'grid', placeItems: 'center' }}>
              <i className={`fa-solid ${icon}`} style={{ color: C.primary, fontSize: 20 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tabs.map(([k, label]) => (
            <button
              type="button"
              key={k}
              onClick={() => setFilter(k)}
              style={filter === k ? btn(C.primary, '#fff', { boxShadow: '0 2px 8px rgba(27,104,246,0.24)' }) : btn('transparent', C.muted)}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 14, top: 13, color: C.muted, fontSize: 13 }} />
          <input
            placeholder="Search patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ backgroundColor: C.low, border: 'none', outline: 'none', padding: '10px 16px 10px 36px', borderRadius: 12, fontSize: 13, minWidth: 260 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ ...card, padding: 40, textAlign: 'center', color: C.muted }}>Loading...</div>
      ) : visible.length === 0 ? (
        <div style={{ ...card, borderRadius: 24, padding: '72px 16px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: C.low, display: 'grid', placeItems: 'center', margin: '0 auto 16px', fontSize: 34 }}>
            <i className="fa-solid fa-calendar-xmark" style={{ color: C.muted }} />
          </div>
          <h3 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>No appointments found</h3>
          <p style={{ fontSize: 14, color: C.muted, maxWidth: 380, margin: '4px auto 20px' }}>
            There are no consultation appointments matching your current criteria or filter selection.
          </p>
          <button
            type="button"
            onClick={() => { setFilter('all'); setSearch(''); }}
            style={btn(C.primary, '#fff', { padding: '10px 20px', boxShadow: '0 4px 14px rgba(27,104,246,0.28)' })}
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visible.map((a) => {
            const s = STATUS_UI[a.status] || STATUS_UI.cancelled;
            const busy = busyId === a.id;
            const patientName = a.patient?.full_name || 'Patient';
            return (
              <div
                key={a.id}
                style={{
                  ...card,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 24,
                  opacity: a.status === 'completed' ? 0.85 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, minWidth: 0 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16, backgroundColor: s.bg, color: s.color,
                    display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0,
                  }}>
                    {initials(patientName)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 600 }}>{patientName}</span>
                      <span style={pill(s.bg, s.color)}><Dot s={s} />{a.status.replace('_', ' ')}</span>
                      <span style={{
                        ...pill(isOnline(a) ? C.primaryFixed : C.low, isOnline(a) ? C.primary : C.muted),
                        textTransform: 'none', letterSpacing: 0, fontWeight: 600,
                      }}>
                        <i className={`fa-solid ${isOnline(a) ? 'fa-video' : 'fa-door-open'}`} /> {typeLabel(a)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      <i className="fa-regular fa-clock" style={{ color: C.primary }} /> {dayText(a.appointment_date)} • {to12(hhmm(a.start_time))} • {mins(a)} mins
                    </div>
                    {a.reason && <p style={{ fontSize: 14, margin: '4px 0 0' }}><b style={{ color: C.muted }}>Reason:</b> "{a.reason}"</p>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setDetails(a)} style={btn(C.container, C.text)}>
                    View Details
                  </button>
                  {a.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirm({ type: 'reject', appt: a })}
                        style={btn(C.errBg, C.errText)}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setStatus(a.id, 'confirmed')}
                        style={btn(C.primary, '#fff', { padding: '10px 20px', boxShadow: '0 4px 14px rgba(27,104,246,0.28)' })}
                      >
                        Accept
                      </button>
                    </>
                  )}
                  {a.status === 'confirmed' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirm({ type: 'cancel', appt: a })}
                        style={btn(C.container, C.error)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setStatus(a.id, 'completed')}
                        style={btn(C.primaryFixed, C.primary)}
                      >
                        Mark as Completed
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {details && (() => {
        const s = STATUS_UI[details.status] || STATUS_UI.cancelled;
        return (
          <div onClick={() => setDetails(null)} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...card, borderRadius: 24, maxWidth: 512, width: '100%', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, display: 'grid', placeItems: 'center' }}>
                    <i className="fa-solid fa-calendar-days" style={{ color: C.primary }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Appointment Details</h3>
                    <span style={{ fontSize: 12, color: C.muted }}>Clinika Reference {details.reference_number || `#${details.id}`}</span>
                  </div>
                </div>
                <button type="button" onClick={() => setDetails(null)} style={{ ...btn(C.container, C.muted), padding: '6px 11px', borderRadius: '50%' }}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <div style={{ backgroundColor: C.low, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  ['Patient Name', details.patient?.full_name || 'Patient'],
                  ['Date & Time', `${dayText(details.appointment_date)} at ${to12(hhmm(details.start_time))} (${mins(details)} mins)`],
                  ['Consultation Type', typeLabel(details)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ fontSize: 12, color: C.muted }}>{k}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Current Status</span>
                  <span style={pill(s.bg, s.color)}>{STATUS_TEXT[details.status] || details.status}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Reason for Visit</div>
                <p style={{ fontSize: 14, color: C.muted, backgroundColor: C.container, padding: 14, borderRadius: 12, margin: 0 }}>
                  {details.reason ? `"${details.reason}"` : '—'}
                </p>
              </div>
              {details.cancellation_reason && (
                <p style={{ fontSize: 13, color: C.errText, margin: 0 }}>Cancellation reason: {details.cancellation_reason}</p>
              )}
              {isOnline(details) && details.meeting_link && (
                <a href={details.meeting_link} target="_blank" rel="noreferrer" style={{ color: C.primary, fontWeight: 600, fontSize: 14 }}>
                  <i className="fa-solid fa-video" /> Open meeting link
                </a>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setDetails(null)} style={btn(C.container, C.text, { padding: '10px 24px' })}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {confirm && (
        <div onClick={() => setConfirm(null)} style={overlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, borderRadius: 24, maxWidth: 448, width: '100%', padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: C.errBg, display: 'grid', placeItems: 'center' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: C.error, fontSize: 22 }} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 6px' }}>
                {confirm.type === 'reject' ? 'Reject Appointment Request?' : 'Cancel Appointment?'}
              </h3>
              <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: '22px' }}>
                Are you sure you want to {confirm.type === 'reject' ? 'decline this appointment request for' : 'cancel the confirmed appointment with'}{' '}
                <b style={{ color: C.text }}>{confirm.appt.patient?.full_name || 'Patient'}</b>?{' '}
                {confirm.type === 'reject'
                  ? 'The patient will be notified to choose an alternative slot.'
                  : 'An immediate alert will be dispatched to the patient.'}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={() => setConfirm(null)} style={btn(C.container, C.text, { padding: '10px 20px' })}>
                {confirm.type === 'reject' ? 'Keep Request' : 'Keep Appointment'}
              </button>
              <button
                type="button"
                onClick={() => (confirm.type === 'reject' ? rejectAppt(confirm.appt) : cancelAppt(confirm.appt))}
                style={btn(C.error, '#fff', { padding: '10px 20px', boxShadow: '0 4px 14px rgba(186,26,26,0.25)' })}
              >
                {confirm.type === 'reject' ? 'Confirm Rejection' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}