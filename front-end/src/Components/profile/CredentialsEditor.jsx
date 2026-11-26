import { useState } from 'react';
import { useUpdateCredentials } from '../../hooks/useClinical';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/client';

const blank = () => ({ kind: 'education', title: '', institution: '', year: '' });
const toRow = (c) => ({ kind: c.kind || 'education', title: c.title || '', institution: c.institution || '', year: c.year ? String(c.year) : '' });

/** Doctor edits education/certifications. Saving replaces the whole list on the backend. */
export default function CredentialsEditor({ doctorId, credentials = [], onSaved }) {
  const { showToast } = useToast();
  const update = useUpdateCredentials(doctorId);
  const [rows, setRows] = useState(() => (credentials.length ? credentials.map(toRow) : []));
  const [error, setError] = useState('');

  const setRow = (index, key, value) => setRows((list) => list.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  async function save(event) {
    event.preventDefault();
    const filled = rows.filter((row) => row.title.trim());
    for (const row of filled) {
      if (row.title.trim().length < 2) { setError('Each credential title needs at least 2 characters.'); return; }
      if (row.year && (Number(row.year) < 1950 || Number(row.year) > 2100)) { setError('Year must be between 1950 and 2100.'); return; }
    }
    setError('');
    try {
      await update.mutateAsync(filled.map((row) => ({
        kind: row.kind,
        title: row.title.trim(),
        institution: row.institution.trim() || null,
        year: row.year ? Number(row.year) : null,
      })));
      showToast('Credentials saved.', 'success');
      onSaved?.();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section className="cl-pd-card" aria-labelledby="credentials-title">
      <h2 id="credentials-title" className="fs-5 fw-bold mb-1">Education &amp; certifications</h2>
      <p className="text-muted small mb-3">Shown on your public profile.</p>
      <form onSubmit={save}>
        {rows.length === 0 && <p className="text-muted small">No credentials added yet.</p>}
        {rows.map((row, index) => (
          <div key={index} className="row g-2 mb-2 align-items-center">
            <div className="col-6 col-md-2">
              <select className="form-select" aria-label="Type" value={row.kind} onChange={(e) => setRow(index, 'kind', e.target.value)}>
                <option value="education">Education</option>
                <option value="certification">Certification</option>
              </select>
            </div>
            <div className="col-6 col-md-4">
              <input className="form-control" placeholder="Title *" aria-label="Title" maxLength={200} value={row.title} onChange={(e) => setRow(index, 'title', e.target.value)} />
            </div>
            <div className="col-8 col-md-3">
              <input className="form-control" placeholder="Institution" aria-label="Institution" maxLength={200} value={row.institution} onChange={(e) => setRow(index, 'institution', e.target.value)} />
            </div>
            <div className="col-4 col-md-2">
              <input className="form-control" type="number" placeholder="Year" aria-label="Year" min={1950} max={2100} value={row.year} onChange={(e) => setRow(index, 'year', e.target.value)} />
            </div>
            <div className="col-12 col-md-1 d-grid">
              <button type="button" className="btn btn-outline-danger" aria-label="Remove credential" onClick={() => setRows((list) => list.filter((_, i) => i !== index))}>
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          </div>
        ))}
        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
        <div className="d-flex gap-2 flex-wrap mt-2">
          <button type="button" className="btn btn-outline-primary" disabled={rows.length >= 30} onClick={() => setRows((list) => [...list, blank()])}>
            + Add credential
          </button>
          <button type="submit" className="btn btn-primary" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save credentials'}
          </button>
        </div>
      </form>
    </section>
  );
}
