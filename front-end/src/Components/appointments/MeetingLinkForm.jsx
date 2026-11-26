import { useState } from 'react';
import { useAppointmentActions } from '../../hooks/useAppointments';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/client';

/** Doctor/admin edits the video-call link of an online appointment. The link must start with https://. */
export default function MeetingLinkForm({ appointment, onSaved }) {
  const { showToast } = useToast();
  const { updateMeetingLink } = useAppointmentActions();
  const [link, setLink] = useState(appointment.meeting_link || '');
  const [error, setError] = useState('');

  async function save() {
    const value = link.trim();
    if (value && !value.startsWith('https://')) {
      setError('The meeting link must start with https://');
      return;
    }
    setError('');
    try {
      await updateMeetingLink.mutateAsync({ id: appointment.id, meeting_link: value || null });
      showToast(value ? 'Meeting link saved. The patient was notified.' : 'Meeting link removed.', 'success');
      onSaved?.(value || null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      <label className="form-label fw-semibold" htmlFor={`meeting-link-${appointment.id}`}>Video consultation link</label>
      <div className="input-group">
        <input
          id={`meeting-link-${appointment.id}`}
          type="url"
          className="form-control"
          placeholder="https://meet.google.com/…"
          maxLength={500}
          value={link}
          onChange={(event) => setLink(event.target.value)}
        />
        <button type="button" className="btn btn-primary" onClick={save} disabled={updateMeetingLink.isPending}>
          {updateMeetingLink.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error && <div className="text-danger small mt-2" role="alert">{error}</div>}
    </div>
  );
}
