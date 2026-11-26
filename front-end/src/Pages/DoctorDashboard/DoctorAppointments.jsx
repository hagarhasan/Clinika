import { useMemo, useState } from 'react';
import Avatar from '../../Components/ui/Avatar';
import { useDoctorData, errMsg, dayText, hhmm, to12, C, card, pill, btn, STATUS_UI } from './DoctorDashboard';
import { useAppointmentActions } from '../../hooks/useAppointments';
import Modal from '../../Components/ui/Modal';
import MeetingLinkForm from '../../Components/appointments/MeetingLinkForm';
import PatientRecordsModal from '../../Components/records/PatientRecordsModal';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

// The backend only lets a visit be completed / marked no-show after it has started.
const hasStarted = (a) => {
  if (!a.appointment_date || !a.start_time) return false;
  return new Date(`${a.appointment_date}T${hhmm(a.start_time)}:00`) <= new Date();
};

export default function DoctorAppointments() {
  const { appointments, setAppointments, loading, refresh } = useDoctorData();
  const { cancel, updateStatus } = useAppointmentActions();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [recordsFor, setRecordsFor] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [msg, setMsg] = useState(null);

  const countOf = (status) => appointments.filter((a) => (a.status || '').toLowerCase() === status).length;
  const counts = useMemo(() => ({
    all: appointments.length,
    pending: countOf('pending'),
    confirmed: countOf('confirmed'),
    completed: countOf('completed'),
    cancelled: countOf('cancelled'),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [appointments]);

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

  const finish = async (id, nextStatus, okText) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a)));
    setMsg({ ok: true, text: okText });
    await refresh();
  };

  // confirmed / completed / no_show go through /status
  const changeStatus = async (id, nextStatus) => {
    setMsg(null);
    setBusyId(id);
    try {
      await updateStatus.mutateAsync({ id, status: nextStatus });
      await finish(id, nextStatus, `Appointment marked as ${nextStatus.replace('_', ' ')}.`);
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    } finally {
      setBusyId(null);
    }
  };

  // rejecting / cancelling uses the dedicated /cancel endpoint (the /status endpoint does not accept "cancelled")
  const confirmCancel = async () => {
    const target = cancelTarget;
    if (!target) return;
    setMsg(null);
    setBusyId(target.id);
    try {
      await cancel.mutateAsync({ id: target.id, reason: cancelReason.trim() });
      setCancelTarget(null);
      setCancelReason('');
      await finish(target.id, 'cancelled', 'Appointment cancelled. The patient was notified.');
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
      setCancelTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  const small = { padding: '8px 14px', fontSize: 13 };

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
        <div role="status" style={{ ...card, padding: '12px 16px', backgroundColor: msg.ok ? '#ECFDF5' : C.errBg, color: msg.ok ? '#047857' : C.errText, fontSize: 13, fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { label: 'ACTION REQUIRED', value: `${counts.pending} Requests`, sub: 'Pending confirmation', icon: 'fa-regular fa-hourglass-half', bg: C.secondary, color: C.primary },
          { label: 'ACTIVE SCHEDULED', value: `${counts.confirmed} Sessions`, sub: 'Confirmed bookings', icon: 'fa-regular fa-calendar-check', bg: C.primaryFixed, color: C.primary },
          { label: 'TOTAL LOAD', value: `${counts.all} Bookings`, sub: 'All recorded appointments', icon: 'fa-regular fa-id-badge', bg: C.low, color: C.text },
        ].map((s) => (
          <div key={s.label} style={{ ...card, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.text, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{s.sub}</div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: s.bg, color: s.color, display: 'grid', placeItems: 'center' }}>
              <i className={s.icon} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                backgroundColor: tab === t.id ? C.primary : C.low, color: tab === t.id ? C.white : C.muted,
              }}
            >
              {`${t.label} (${counts[t.id]})`}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search patient name..."
          aria-label="Search appointments"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 13, minWidth: 230 }}
        />
      </div>

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
          const started = hasStarted(a);
          const dateLabel = a.appointment_date ? dayText(a.appointment_date) : 'Scheduled';
          const timeLabel = a.start_time ? to12(hhmm(a.start_time)) : '';

          return (
            <div key={a.id ?? idx} style={{ ...card, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <Avatar
                  bare
                  src={a.patient?.avatar_url}
                  name={pName}
                  style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.primaryFixed, color: C.primary, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0, objectFit: 'cover' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 16, color: C.text }}>{pName}</strong>
                    <span style={pill(st.bg, st.color)}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: st.dot }} />
                      {stKey.replace('_', ' ').toUpperCase()}
                    </span>
                    <span style={pill(C.low, C.muted)}>
                      {isOnline ? 'Online (Video Consultation)' : `In-person (${a.clinic?.name || a.room || 'Clinic'})`}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>
                    <i className="fa-regular fa-clock" /> {dateLabel}
                    {timeLabel ? ` • ${timeLabel}` : ''}
                    {a.end_time && a.start_time ? '' : ` • ${a.duration_minutes || 30} mins`}
                  </div>
                  {a.reason && (
                    <div style={{ fontSize: 13, color: C.text, marginTop: 5 }}>Reason: &ldquo;{a.reason}&rdquo;</div>
                  )}
                  {isOnline && ['pending', 'confirmed'].includes(stKey) && !a.meeting_link && (
                    <div style={{ fontSize: 12, color: C.errText, marginTop: 5 }}>
                      <i className="fa-solid fa-video" /> No meeting link yet. Open details to add one.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" onClick={() => setSelected(a)} style={btn(C.low, C.text, { ...small, border: `1px solid ${C.border}` })}>
                  View Details
                </button>

                {stKey !== 'cancelled' && stKey !== 'rejected' && (
                  <button type="button" onClick={() => setRecordsFor(a)} style={btn(C.low, C.text, { ...small, border: `1px solid ${C.border}` })}>
                    Records &amp; Rx
                  </button>
                )}

                {stKey === 'pending' && (
                  <>
                    <button type="button" disabled={busy} onClick={() => { setCancelReason(''); setCancelTarget(a); }} style={btn(C.errBg, C.errText, small)}>
                      Reject
                    </button>
                    <button type="button" disabled={busy} onClick={() => changeStatus(a.id, 'confirmed')} style={btn(C.primary, C.white, small)}>
                      Accept
                    </button>
                  </>
                )}

                {stKey === 'confirmed' && (
                  <>
                    <button type="button" disabled={busy} onClick={() => { setCancelReason(''); setCancelTarget(a); }} style={btn(C.errBg, C.errText, small)}>
                      Cancel
                    </button>
                    {started ? (
                      <>
                        <button type="button" disabled={busy} onClick={() => changeStatus(a.id, 'no_show')} style={btn(C.low, C.text, { ...small, border: `1px solid ${C.border}` })}>
                          No-show
                        </button>
                        <button type="button" disabled={busy} onClick={() => changeStatus(a.id, 'completed')} style={btn(C.primaryFixed, C.primary, small)}>
                          Mark as Completed
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: C.muted }}>Can be completed once the visit starts</span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {selected && (
        <Modal title="Appointment details" onClose={() => setSelected(null)} footer={<button type="button" className="btn btn-light" onClick={() => setSelected(null)}>Close</button>}>
          <dl className="row mb-0 small">
            <dt className="col-4">Patient</dt><dd className="col-8">{selected.patient_name || selected.patient?.full_name || `#${selected.id}`}</dd>
            {selected.patient?.phone && (<><dt className="col-4">Phone</dt><dd className="col-8">{selected.patient.phone}</dd></>)}
            <dt className="col-4">Status</dt><dd className="col-8">{(selected.status || 'pending').replace('_', ' ').toUpperCase()}</dd>
            <dt className="col-4">Date &amp; time</dt>
            <dd className="col-8">{selected.appointment_date ? dayText(selected.appointment_date) : '-'}{selected.start_time ? ` • ${to12(hhmm(selected.start_time))}` : ''}</dd>
            <dt className="col-4">Type</dt><dd className="col-8">{selected.consultation_type === 'online' ? 'Online' : `In-person${selected.clinic?.name ? ` (${selected.clinic.name})` : ''}`}</dd>
            {selected.fee_at_booking != null && (<><dt className="col-4">Fee</dt><dd className="col-8">{selected.fee_at_booking} EGP</dd></>)}
            {selected.reference_number && (<><dt className="col-4">Reference</dt><dd className="col-8">{selected.reference_number}</dd></>)}
            {selected.reason && (<><dt className="col-4">Reason</dt><dd className="col-8">{selected.reason}</dd></>)}
            {selected.cancellation_reason && (<><dt className="col-4">Cancelled</dt><dd className="col-8">{selected.cancellation_reason}{selected.cancelled_by ? ` (by ${selected.cancelled_by})` : ''}</dd></>)}
          </dl>
          {selected.consultation_type === 'online' && !['cancelled', 'rejected'].includes((selected.status || '').toLowerCase()) && (
            <div className="mt-3 pt-3 border-top">
              <MeetingLinkForm
                key={selected.id}
                appointment={selected}
                onSaved={(link) => {
                  setAppointments((prev) => prev.map((a) => (a.id === selected.id ? { ...a, meeting_link: link } : a)));
                  setSelected((s) => (s ? { ...s, meeting_link: link } : s));
                  refresh();
                }}
              />
            </div>
          )}
        </Modal>
      )}

      {cancelTarget && (
        <Modal
          title={cancelTarget.status === 'pending' ? 'Reject this request?' : 'Cancel this appointment?'}
          busy={cancel.isPending}
          onClose={() => setCancelTarget(null)}
          footer={(
            <>
              <button type="button" className="btn btn-light" onClick={() => setCancelTarget(null)} disabled={cancel.isPending}>Keep it</button>
              <button type="button" className="btn btn-danger" onClick={confirmCancel} disabled={cancel.isPending}>
                {cancel.isPending ? 'Please wait…' : cancelTarget.status === 'pending' ? 'Yes, reject' : 'Yes, cancel'}
              </button>
            </>
          )}
        >
          <p className="small text-muted">The patient will be notified.</p>
          <label className="form-label fw-semibold" htmlFor="doc-cancel-reason">Reason (optional)</label>
          <textarea id="doc-cancel-reason" rows={3} maxLength={500} className="form-control" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
        </Modal>
      )}

      {recordsFor && <PatientRecordsModal appointment={recordsFor} onClose={() => setRecordsFor(null)} />}
    </div>
  );
}
