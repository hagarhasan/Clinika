import { useState } from 'react';
import Modal from '../ui/Modal';
import { usePatientPrescriptions, usePatientRecords, useCreateMedicalRecord, useCreatePrescription } from '../../hooks/useClinical';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/client';
import { formatDate } from '../../utils/format';

const day = (value) => formatDate(String(value || '').slice(0, 10));
const orNull = (value) => (typeof value === 'string' ? value.trim() || null : value ?? null);
const EMPTY_ITEM = { medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' };

function RecordForm({ patientId, appointmentId }) {
  const { showToast } = useToast();
  const create = useCreateMedicalRecord();
  const [form, setForm] = useState({ symptoms: '', diagnosis: '', treatment_plan: '', notes: '', follow_up_date: '' });
  const [error, setError] = useState('');
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (form.diagnosis.trim().length < 2) {
      setError('Diagnosis is required (at least 2 characters).');
      return;
    }
    setError('');
    try {
      await create.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId,
        diagnosis: form.diagnosis.trim(),
        symptoms: orNull(form.symptoms),
        treatment_plan: orNull(form.treatment_plan),
        notes: orNull(form.notes),
        follow_up_date: orNull(form.follow_up_date),
      });
      showToast('Medical record saved. The patient was notified.', 'success');
      setForm({ symptoms: '', diagnosis: '', treatment_plan: '', notes: '', follow_up_date: '' });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} className="border rounded-3 p-3 bg-light">
      <h3 className="fs-6 fw-bold mb-3">Add medical record</h3>
      <div className="mb-2">
        <label className="form-label small fw-semibold" htmlFor="rec-diagnosis">Diagnosis *</label>
        <input id="rec-diagnosis" className="form-control" value={form.diagnosis} onChange={set('diagnosis')} />
      </div>
      <div className="mb-2">
        <label className="form-label small fw-semibold" htmlFor="rec-symptoms">Symptoms</label>
        <textarea id="rec-symptoms" rows={2} className="form-control" value={form.symptoms} onChange={set('symptoms')} />
      </div>
      <div className="mb-2">
        <label className="form-label small fw-semibold" htmlFor="rec-plan">Treatment plan</label>
        <textarea id="rec-plan" rows={2} className="form-control" value={form.treatment_plan} onChange={set('treatment_plan')} />
      </div>
      <div className="mb-2">
        <label className="form-label small fw-semibold" htmlFor="rec-notes">Notes</label>
        <textarea id="rec-notes" rows={2} className="form-control" value={form.notes} onChange={set('notes')} />
      </div>
      <div className="mb-3">
        <label className="form-label small fw-semibold" htmlFor="rec-follow">Follow-up date</label>
        <input id="rec-follow" type="date" className="form-control" value={form.follow_up_date} onChange={set('follow_up_date')} />
      </div>
      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={create.isPending}>
        {create.isPending ? 'Saving…' : 'Save record'}
      </button>
    </form>
  );
}

function PrescriptionForm({ patientId, appointmentId, records }) {
  const { showToast } = useToast();
  const create = useCreatePrescription();
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [notes, setNotes] = useState('');
  const [recordId, setRecordId] = useState('');
  const [error, setError] = useState('');

  const setItem = (index, key, value) => setItems((list) => list.map((item, i) => (i === index ? { ...item, [key]: value } : item)));

  async function submit(event) {
    event.preventDefault();
    const cleaned = items.filter((item) => item.medication_name.trim());
    if (!cleaned.length) {
      setError('Add at least one medication.');
      return;
    }
    setError('');
    try {
      await create.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId,
        medical_record_id: recordId ? Number(recordId) : null,
        notes: orNull(notes),
        items: cleaned.map((item) => ({
          medication_name: item.medication_name.trim(),
          dosage: orNull(item.dosage),
          frequency: orNull(item.frequency),
          duration: orNull(item.duration),
          instructions: orNull(item.instructions),
        })),
      });
      showToast('Prescription issued. The patient was notified.', 'success');
      setItems([{ ...EMPTY_ITEM }]);
      setNotes('');
      setRecordId('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} className="border rounded-3 p-3 bg-light">
      <h3 className="fs-6 fw-bold mb-3">Issue prescription</h3>
      {items.map((item, index) => (
        <div key={index} className="border rounded-3 bg-white p-2 mb-2">
          <div className="row g-2">
            <div className="col-12 col-md-6">
              <input className="form-control" placeholder="Medication name *" aria-label="Medication name" value={item.medication_name} onChange={(e) => setItem(index, 'medication_name', e.target.value)} />
            </div>
            <div className="col-6 col-md-2">
              <input className="form-control" placeholder="Dosage" aria-label="Dosage" value={item.dosage} onChange={(e) => setItem(index, 'dosage', e.target.value)} />
            </div>
            <div className="col-6 col-md-2">
              <input className="form-control" placeholder="Frequency" aria-label="Frequency" value={item.frequency} onChange={(e) => setItem(index, 'frequency', e.target.value)} />
            </div>
            <div className="col-12 col-md-2">
              <input className="form-control" placeholder="Duration" aria-label="Duration" value={item.duration} onChange={(e) => setItem(index, 'duration', e.target.value)} />
            </div>
            <div className="col-12">
              <input className="form-control" placeholder="Instructions" aria-label="Instructions" value={item.instructions} onChange={(e) => setItem(index, 'instructions', e.target.value)} />
            </div>
          </div>
          {items.length > 1 && (
            <button type="button" className="btn btn-link btn-sm text-danger p-0 mt-1" onClick={() => setItems((list) => list.filter((_, i) => i !== index))}>
              Remove medication
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-outline-primary btn-sm mb-3" onClick={() => setItems((list) => [...list, { ...EMPTY_ITEM }])}>
        + Add medication
      </button>
      {records.length > 0 && (
        <div className="mb-2">
          <label className="form-label small fw-semibold" htmlFor="rx-record">Link to a medical record (optional)</label>
          <select id="rx-record" className="form-select" value={recordId} onChange={(e) => setRecordId(e.target.value)}>
            <option value="">No linked record</option>
            {records.map((record) => (
              <option key={record.id} value={record.id}>{day(record.created_at)} - {record.diagnosis}</option>
            ))}
          </select>
        </div>
      )}
      <div className="mb-3">
        <label className="form-label small fw-semibold" htmlFor="rx-notes">Notes</label>
        <textarea id="rx-notes" rows={2} className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={create.isPending}>
        {create.isPending ? 'Saving…' : 'Issue prescription'}
      </button>
    </form>
  );
}

function RecordList({ records }) {
  if (!records.length) return <p className="text-muted small">No medical records for this patient yet.</p>;
  return (
    <ul className="list-unstyled d-grid gap-2 mb-0">
      {records.map((record) => (
        <li key={record.id} className="border rounded-3 p-3">
          <div className="d-flex justify-content-between gap-2">
            <strong>{record.diagnosis}</strong>
            <span className="text-muted small">{day(record.created_at)}</span>
          </div>
          {record.symptoms && <div className="small mt-1"><span className="text-muted">Symptoms:</span> {record.symptoms}</div>}
          {record.treatment_plan && <div className="small"><span className="text-muted">Plan:</span> {record.treatment_plan}</div>}
          {record.notes && <div className="small"><span className="text-muted">Notes:</span> {record.notes}</div>}
          {record.follow_up_date && <div className="small"><span className="text-muted">Follow-up:</span> {day(record.follow_up_date)}</div>}
          {record.doctor?.full_name && <div className="small text-muted mt-1">By {record.doctor.full_name}</div>}
        </li>
      ))}
    </ul>
  );
}

function PrescriptionList({ prescriptions }) {
  if (!prescriptions.length) return <p className="text-muted small">No prescriptions for this patient yet.</p>;
  return (
    <ul className="list-unstyled d-grid gap-2 mb-0">
      {prescriptions.map((rx) => (
        <li key={rx.id} className="border rounded-3 p-3">
          <div className="d-flex justify-content-between gap-2">
            <strong>Prescription #{rx.id}</strong>
            <span className="text-muted small">{day(rx.created_at)}</span>
          </div>
          <ul className="small mt-2 mb-1 ps-3">
            {rx.items?.map((item) => (
              <li key={item.id}>
                <strong>{item.medication_name}</strong>
                {[item.dosage, item.frequency, item.duration].filter(Boolean).length > 0 && ` - ${[item.dosage, item.frequency, item.duration].filter(Boolean).join(' · ')}`}
                {item.instructions && <span className="text-muted"> ({item.instructions})</span>}
              </li>
            ))}
          </ul>
          {rx.notes && <div className="small text-muted">{rx.notes}</div>}
        </li>
      ))}
    </ul>
  );
}

/** Doctor view: existing records/prescriptions of the appointment's patient + forms to add new ones. */
export default function PatientRecordsModal({ appointment, onClose }) {
  const patient = appointment.patient || {};
  const [tab, setTab] = useState('records');
  const recordsQuery = usePatientRecords(patient.id);
  const rxQuery = usePatientPrescriptions(patient.id);
  const records = recordsQuery.data?.data || [];
  const prescriptions = rxQuery.data?.data || [];
  const activeQuery = tab === 'records' ? recordsQuery : rxQuery;

  return (
    <Modal
      title={`Records for ${patient.full_name || 'patient'}`}
      size="modal-lg"
      onClose={onClose}
      footer={<button type="button" className="btn btn-light" onClick={onClose}>Close</button>}
    >
      <ul className="nav nav-pills mb-3" role="tablist">
        {[['records', 'Medical records'], ['rx', 'Prescriptions']].map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button type="button" role="tab" aria-selected={tab === key} className={`nav-link ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
              {label}
            </button>
          </li>
        ))}
      </ul>

      {activeQuery.isLoading && <div className="text-muted small"><span className="spinner-border spinner-border-sm me-2" />Loading…</div>}
      {activeQuery.isError && (
        <div className="alert alert-danger py-2" role="alert">
          {activeQuery.error?.message || 'Could not load data.'}{' '}
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => activeQuery.refetch()}>Try again</button>
        </div>
      )}

      {tab === 'records' ? (
        <div className="d-grid gap-3">
          {!recordsQuery.isLoading && !recordsQuery.isError && <RecordList records={records} />}
          <RecordForm patientId={patient.id} appointmentId={appointment.id} />
        </div>
      ) : (
        <div className="d-grid gap-3">
          {!rxQuery.isLoading && !rxQuery.isError && <PrescriptionList prescriptions={prescriptions} />}
          <PrescriptionForm patientId={patient.id} appointmentId={appointment.id} records={records} />
        </div>
      )}
    </Modal>
  );
}
