import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StateViews';
import Avatar from '../ui/Avatar';
import { formatDate, formatTime } from '../../utils/format';
import { useAppointmentActions } from '../../hooks/useAppointments';
import RescheduleModal from '../appointments/RescheduleModal';
import ReviewModal from '../appointments/ReviewModal';
import { getErrorMessage } from '../../api/client';

const CANCELLABLE = ['pending', 'confirmed'];

// onChanged(message) runs after the server confirms a change (cancel, reschedule, review).
// `onCancelled` is kept as an alias for older callers.
export default function AppointmentCard({ appointment, onChanged, onCancelled }) {
  const { id, doctor, status, reason, clinic } = appointment;
  const notify = onChanged || onCancelled;
  const { cancel } = useAppointmentActions();
  const [confirming, setConfirming] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // 'reschedule' | 'review' | null
  const busy = cancel.isPending;

  const isOnline = appointment.consultation_type === 'online';
  const canCancel = CANCELLABLE.includes(status);
  const place = isOnline ? 'Online consultation' : clinic?.name || doctor.clinic_name || 'In-person visit';

  async function handleConfirmCancel() {
    setError('');
    try {
      await cancel.mutateAsync({ id, reason: cancelReason.trim() });
      setConfirming(false);
      notify?.(`Your appointment with ${doctor.full_name} was cancelled.`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <article className="cl-pd-card cl-pd-appt">
      <div className="cl-pd-appt__main">
        <Avatar src={doctor.photo_url} name={doctor.full_name} />

        <div className="cl-pd-appt__info">
          <div className="cl-pd-appt__top">
            <h3 className="cl-pd-appt__doctor">{doctor.full_name}</h3>
            <StatusBadge status={status} />
          </div>
          {doctor.specialty_name && <p className="cl-pd-muted">{doctor.specialty_name}</p>}

          <ul className="cl-pd-appt__meta">
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
              {formatDate(appointment.appointment_date)}
            </li>
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
              {formatTime(appointment.start_time)}
            </li>
            <li>
              <span className="material-symbols-outlined" aria-hidden="true">
                {isOnline ? 'videocam' : 'location_on'}
              </span>
              {place}
            </li>
            {appointment.fee_at_booking !== null && (
              <li>
                <span className="material-symbols-outlined" aria-hidden="true">payments</span>
                {appointment.fee_at_booking} EGP
              </li>
            )}
          </ul>

          {reason && <p className="cl-pd-muted">Reason: {reason}</p>}
          {status === 'cancelled' && appointment.cancellation_reason && (
            <p className="cl-pd-muted">Cancellation reason: {appointment.cancellation_reason}</p>
          )}
          {appointment.reference_number && (
            <p className="cl-pd-muted">Reference: {appointment.reference_number}</p>
          )}
        </div>
      </div>

      <div className="cl-pd-appt__actions">
        <Link className="cl-pd-btn" to={`/doctors/doctor_profile/${doctor.id}`}>View doctor</Link>
        {isOnline && status === 'confirmed' && appointment.meeting_link && (
          <a className="cl-pd-btn cl-pd-btn--primary" href={appointment.meeting_link} target="_blank" rel="noreferrer">
            Join online
          </a>
        )}
        {canCancel && (
          <button type="button" className="cl-pd-btn" onClick={() => setModal('reschedule')}>
            Reschedule
          </button>
        )}
        {status === 'completed' && !appointment.has_review && (
          <button type="button" className="cl-pd-btn cl-pd-btn--primary" onClick={() => setModal('review')}>
            Rate doctor
          </button>
        )}
        {status === 'completed' && appointment.has_review && (
          <span className="cl-pd-muted">Reviewed ✓</span>
        )}
        {canCancel && !confirming && (
          <button type="button" className="cl-pd-btn cl-pd-btn--danger" onClick={() => setConfirming(true)}>
            Cancel appointment
          </button>
        )}
      </div>

      {confirming && (
        <div className="cl-pd-confirm" role="group" aria-label="Confirm cancellation">
          <label htmlFor={`cancel-reason-${id}`}>Reason for cancelling (optional)</label>
          <textarea
            id={`cancel-reason-${id}`}
            rows={2}
            maxLength={500}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
          {error && <p className="cl-pd-confirm__error" role="alert">{error}</p>}
          <div className="cl-pd-appt__actions">
            <button type="button" className="cl-pd-btn" disabled={busy} onClick={() => setConfirming(false)}>
              Keep appointment
            </button>
            <button type="button" className="cl-pd-btn cl-pd-btn--danger" disabled={busy} onClick={handleConfirmCancel}>
              {busy ? 'Cancelling…' : 'Yes, cancel it'}
            </button>
          </div>
        </div>
      )}

      {modal === 'reschedule' && (
        <RescheduleModal appointment={appointment} onClose={() => setModal(null)} onDone={notify} />
      )}
      {modal === 'review' && (
        <ReviewModal appointment={appointment} onClose={() => setModal(null)} onDone={notify} />
      )}
    </article>
  );
}
