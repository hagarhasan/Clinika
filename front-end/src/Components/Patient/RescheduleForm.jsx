import { useRef, useState } from 'react';
import { fetchSlots, getErrorMessage, rescheduleAppointment } from '../../Pages/PatientDashboard/patientApi';
import '../../Pages/PatientDashboard/patient-reschedule.css';
import { formatTime } from './dateFormat';

const IDLE = { status: 'idle', items: [], error: '' };

// Pick a new day, see that day's free times, then confirm. onDone(message) runs after the server accepts.
export default function RescheduleForm({ appointment, onClose, onDone }) {
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState(IDLE);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(0); // ignores answers that arrive after the patient picked another day

  const { id, doctor } = appointment;
  const clinicId = appointment.clinic_id ?? appointment.clinic?.id ?? null;

  async function handleDateChange(event) {
    const value = event.target.value;
    const request = latest.current + 1;
    latest.current = request;
    setDate(value);
    setSelected('');
    setError('');
    if (!value) {
      setSlots(IDLE);
      return;
    }
    setSlots({ status: 'loading', items: [], error: '' });
    try {
      const items = await fetchSlots(doctor.id, value, clinicId);
      if (latest.current === request) {
        setSlots({ status: 'ready', items: items.filter((slot) => slot.is_available), error: '' });
      }
    } catch (err) {
      if (latest.current === request) setSlots({ status: 'error', items: [], error: getErrorMessage(err) });
    }
  }

  async function handleConfirm() {
    setBusy(true);
    setError('');
    try {
      await rescheduleAppointment(id, date, selected);
      onDone(`Your appointment with ${doctor.full_name} was rescheduled.`);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="cl-pd-confirm" role="group" aria-label="Reschedule appointment">
      <label htmlFor={`resched-date-${id}`}>Choose a new day</label>
      <input
        id={`resched-date-${id}`}
        className="cl-pd-date"
        type="date"
        value={date}
        onChange={handleDateChange}
      />

      {slots.status === 'loading' && <p className="cl-pd-muted">Loading available times…</p>}
      {slots.status === 'error' && <p className="cl-pd-confirm__error" role="alert">{slots.error}</p>}
      {slots.status === 'ready' && slots.items.length === 0 && (
        <p className="cl-pd-muted">No available times on this day. Try another day.</p>
      )}
      {slots.status === 'ready' && slots.items.length > 0 && (
        <div className="cl-pd-slots" role="group" aria-label="Available times">
          {slots.items.map((slot) => (
            <button
              key={`${slot.clinic_id}-${slot.start_time}`}
              type="button"
              className={`cl-pd-slot ${selected === slot.start_time ? 'is-active' : ''}`}
              aria-pressed={selected === slot.start_time}
              onClick={() => setSelected(slot.start_time)}
            >
              {formatTime(slot.start_time)}
            </button>
          ))}
        </div>
      )}

      {error && <p className="cl-pd-confirm__error" role="alert">{error}</p>}

      <div className="cl-pd-appt__actions">
        <button type="button" className="cl-pd-btn" disabled={busy} onClick={onClose}>
          Keep current time
        </button>
        <button
          type="button"
          className="cl-pd-btn cl-pd-btn--primary"
          disabled={busy || !date || !selected}
          onClick={handleConfirm}
        >
          {busy ? 'Rescheduling…' : 'Confirm new time'}
        </button>
      </div>
    </div>
  );
}
