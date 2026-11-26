import { useState } from 'react';
import Modal from '../ui/Modal';
import SlotPicker from './SlotPicker';
import { useAppointmentActions } from '../../hooks/useAppointments';
import { useDoctorSlots } from '../../hooks/useDoctors';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/client';
import { formatDate, formatTime } from '../../utils/format';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Patient/admin picks a new date and slot for a pending or confirmed appointment. */
export default function RescheduleModal({ appointment, onClose, onDone }) {
  const { showToast } = useToast();
  const { reschedule } = useAppointmentActions();
  const [date, setDate] = useState(appointment.appointment_date || todayIso());
  const [slot, setSlot] = useState(null);
  const [error, setError] = useState('');
  const doctorId = appointment.doctor?.id;
  const slotsQuery = useDoctorSlots(doctorId, date);
  const slots = Array.isArray(slotsQuery.data) ? slotsQuery.data : [];
  const slotKey = slot ? `${slot.start_time}-${slot.end_time}` : '';

  async function submit() {
    if (!slot) {
      setError('Please choose a new time slot.');
      return;
    }
    setError('');
    try {
      await reschedule.mutateAsync({ id: appointment.id, appointment_date: date, start_time: slot.start_time });
      showToast('Your appointment was rescheduled.', 'success');
      onDone?.(`Your appointment was moved to ${formatDate(date)} at ${formatTime(slot.start_time)}.`);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal
      title="Reschedule appointment"
      onClose={onClose}
      busy={reschedule.isPending}
      footer={(
        <>
          <button type="button" className="btn btn-light" onClick={onClose} disabled={reschedule.isPending}>Keep current time</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={reschedule.isPending || !slot}>
            {reschedule.isPending ? 'Saving…' : 'Confirm new time'}
          </button>
        </>
      )}
    >
      <p className="text-muted small mb-3">
        Currently: {formatDate(appointment.appointment_date)} at {formatTime(appointment.start_time)}
        {appointment.doctor?.full_name ? ` with ${appointment.doctor.full_name}` : ''}.
      </p>
      <label className="form-label fw-semibold" htmlFor="resched-date">New date</label>
      <input
        id="resched-date"
        type="date"
        className="form-control mb-3"
        min={todayIso()}
        value={date}
        onChange={(event) => { setDate(event.target.value); setSlot(null); }}
      />
      <div className="form-label fw-semibold">Available times</div>
      <SlotPicker slots={slots} value={slotKey} onChange={setSlot} loading={slotsQuery.isLoading} />
      {error && <div className="alert alert-danger mt-3 mb-0 py-2" role="alert">{error}</div>}
    </Modal>
  );
}
