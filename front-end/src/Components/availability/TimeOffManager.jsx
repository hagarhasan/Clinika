import { useState } from 'react';
import { useDoctorTimeOff } from '../../hooks/useDoctors';
import { useTimeOffActions } from '../../hooks/useClinical';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/client';
import { formatDate } from '../../utils/format';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Doctor manages days off (holidays, conferences). Slots on those dates are hidden from patients. */
export default function TimeOffManager({ doctorId }) {
  const { showToast } = useToast();
  const query = useDoctorTimeOff(doctorId);
  const { add, remove } = useTimeOffActions(doctorId);
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' });
  const [error, setError] = useState('');
  const items = Array.isArray(query.data) ? query.data : [];

  async function submit(event) {
    event.preventDefault();
    if (!form.start_date || !form.end_date) {
      setError('Choose a start and an end date.');
      return;
    }
    if (form.end_date < form.start_date) {
      setError('The end date must be on or after the start date.');
      return;
    }
    setError('');
    try {
      await add.mutateAsync({ start_date: form.start_date, end_date: form.end_date, reason: form.reason.trim() || null });
      showToast('Time off added. Those dates are now blocked for booking.', 'success');
      setForm({ start_date: '', end_date: '', reason: '' });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleRemove(id) {
    try {
      await remove.mutateAsync(id);
      showToast('Time off removed.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  }

  return (
    <section className="cl-pd-card" aria-labelledby="time-off-title">
      <h2 id="time-off-title" className="fs-5 fw-bold mb-1">Time off</h2>
      <p className="text-muted small mb-3">Block holidays or days away. Patients cannot book slots on these dates.</p>

      <form onSubmit={submit} className="row g-2 align-items-end mb-3">
        <div className="col-6 col-md-3">
          <label className="form-label small fw-semibold" htmlFor="off-start">From</label>
          <input id="off-start" type="date" className="form-control" min={todayIso()} value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value, end_date: f.end_date || e.target.value }))} />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small fw-semibold" htmlFor="off-end">To</label>
          <input id="off-end" type="date" className="form-control" min={form.start_date || todayIso()} value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label small fw-semibold" htmlFor="off-reason">Reason (optional)</label>
          <input id="off-reason" className="form-control" maxLength={255} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        </div>
        <div className="col-12 col-md-2 d-grid">
          <button type="submit" className="btn btn-primary" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Add'}</button>
        </div>
      </form>
      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

      {query.isLoading && <p className="text-muted small mb-0">Loading…</p>}
      {query.isError && <p className="text-danger small mb-0">{query.error?.message || 'Could not load time off.'}</p>}
      {!query.isLoading && !query.isError && items.length === 0 && <p className="text-muted small mb-0">No upcoming time off.</p>}
      {items.length > 0 && (
        <ul className="list-group">
          {items.map((item) => (
            <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
              <span>
                <strong>{formatDate(item.start_date)}</strong>
                {item.end_date !== item.start_date && <> – <strong>{formatDate(item.end_date)}</strong></>}
                {item.reason && <span className="text-muted"> · {item.reason}</span>}
              </span>
              <button type="button" className="btn btn-sm btn-outline-danger" disabled={remove.isPending} onClick={() => handleRemove(item.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
