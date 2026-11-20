import { useState } from 'react';
import { Link } from 'react-router-dom';
import RescheduleForm from './RescheduleForm';
import { StatusBadge } from './StateViews';
import { formatDate, formatTime, getInitials } from './dateFormat';
import { cancelAppointment, getErrorMessage } from '../../Pages/PatientDashboard/patientApi';

const CANCELLABLE = ['pending', 'confirmed'];

// onCancelled(message) runs after the server confirms a cancellation OR a reschedule,
// so the page can show the message and reload its list.
export default function AppointmentCard({ appointment, onCancelled }) {
  const { id, doctor, status, reason, clinic } = appointment;
  const [confirming, setConfirming] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isOnline = appointment.consultation_type === 'online';
  const canCancel = CANCELLABLE.includes(status);
  const place = isOnline ? 'Online consultation' : clinic?.name || doctor.clinic_name || 'In-person visit';

  async function handleConfirmCancel() {
    setBusy(true);
    setError('');
    try {
      await cancelAppointment(id, cancelReason.trim());
      setConfirming(false);
      onCancelled(`Your appointment with ${doctor.full_name} was cancelled.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="cl-pd-card cl-pd-appt">
      <div className="cl-pd-appt__main">
        {doctor.photo_url ? (
          <img className="cl-pd-avatar" src={doctor.photo_url} alt="" />
        ) : (
          <span className="cl-pd-avatar" aria-hidden="true">{getInitials(doctor.full_name)}</span>
        )}

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
        {canCancel && !confirming && !rescheduling && (
          <button type="button" className="cl-pd-btn" onClick={() => setRescheduling(true)}>
            Reschedule
          </button>
        )}
        {canCancel && !confirming && !rescheduling && (
          <button type="button" className="cl-pd-btn cl-pd-btn--danger" onClick={() => setConfirming(true)}>
            Cancel appointment
          </button>
        )}
      </div>

      {rescheduling && (
        <RescheduleForm
          appointment={appointment}
          onClose={() => setRescheduling(false)}
          onDone={(message) => {
            setRescheduling(false);
            onCancelled(message);
          }}
        />
      )}

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
    </article>
  );
}
