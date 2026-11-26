import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { formatDate } from '../../utils/format';
import { formatDateTime } from './adminUi';
import { useAdminRequest } from './adminQueries';
import useServerList from './useServerList';

const STATUS_KEYS = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'Missed' };
const AUDIT_PAGE = 20;
const ENTITY_FILTERS = [['', 'All'], ['doctor', 'Doctors'], ['user', 'Users'], ['appointment', 'Appointments']];

const sum = (rows, key) => rows.reduce((acc, r) => acc + (r[key] || 0), 0);

function downloadCsv(name, header, rows) {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function AppointmentsReport() {
  const [range, setRange] = useState({ date_from: '', date_to: '' });
  const [applied, setApplied] = useState({});
  const reportQuery = useAdminRequest('/admin/reports/appointments', applied);
  const loading = reportQuery.isLoading;
  const data = reportQuery.data?.data || null;
  const daily = data && Array.isArray(data.daily) ? data.daily : [];
  const perDoctor = data && Array.isArray(data.per_doctor) ? data.per_doctor : [];
  // Read these once, up front, so nothing below touches `data.` while it is still null.
  const dateFrom = data ? data.date_from : '';
  const dateTo = data ? data.date_to : '';
  const max = Math.max(1, ...daily.map((d) => d.total));

  const apply = (event) => {
    event.preventDefault();
    setApplied(Object.fromEntries(Object.entries(range).filter(([, v]) => v)));
  };

  return (
    <>
      <form className="cl-pd-card cl-ad-toolbar" onSubmit={apply}>
        <div className="cl-ad-actions" style={{ alignItems: 'flex-end' }}>
          <div className="cl-pd-field"><label htmlFor="rp-from">From</label><input id="rp-from" type="date" value={range.date_from} onChange={(e) => setRange({ ...range, date_from: e.target.value })} /></div>
          <div className="cl-pd-field"><label htmlFor="rp-to">To</label><input id="rp-to" type="date" value={range.date_to} onChange={(e) => setRange({ ...range, date_to: e.target.value })} /></div>
          <button type="submit" className="cl-pd-btn cl-pd-btn--primary">Apply</button>
        </div>
        <button
          type="button"
          className="cl-pd-btn cl-ad-btn-icon"
          disabled={!data || !daily.length}
          onClick={() => downloadCsv(`appointments-${dateFrom}-to-${dateTo}.csv`, ['Date', ...STATUS_KEYS.map((k) => STATUS_LABEL[k]), 'Total'], daily.map((d) => [d.date, ...STATUS_KEYS.map((k) => d[k] || 0), d.total]))}
        >
          <span className="material-symbols-outlined" aria-hidden="true">download</span> Export CSV
        </button>
      </form>

      {reportQuery.isError && <div className="cl-ad-banner cl-ad-banner--error" role="alert">{reportQuery.error?.message || 'Could not load the report.'}</div>}
      {loading && <div className="cl-ad-loading" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading report…</div>}

      {data && !loading && (
        <>
          <p className="cl-pd-muted">Report period: {formatDate(dateFrom)} – {formatDate(dateTo)}</p>
          <div className="cl-ad-grid cl-ad-grid--4" style={{ marginBottom: '1.5rem' }}>
            {[['Total', sum(daily, 'total')], ...STATUS_KEYS.filter((k) => ['completed', 'cancelled', 'no_show'].includes(k)).map((k) => [STATUS_LABEL[k], sum(daily, k)])].map(([label, value]) => (
              <div key={label} className="cl-pd-card cl-ad-stat"><span><span className="cl-ad-stat__label">{label}</span><span className="cl-ad-stat__value">{value}</span></span></div>
            ))}
          </div>

          <section className="cl-pd-card cl-ad-info-card" style={{ marginBottom: '1.5rem' }}>
            <h3>Appointments per day</h3>
            {daily.length === 0 ? <p className="cl-ad-note">No appointments in this period.</p> : (
              <div className="cl-ad-bars" role="img" aria-label="Appointments per day">
                {daily.map((d) => (
                  <div key={d.date} className="cl-ad-bar-col" title={`${formatDate(d.date)}: ${d.total}`}>
                    <span style={{ height: `${(d.total / max) * 100}%` }} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="cl-pd-card cl-ad-table-card">
            <div className="cl-ad-table-scroll">
              <table className="cl-ad-table">
                <thead><tr><th>Doctor</th>{STATUS_KEYS.map((k) => <th key={k}>{STATUS_LABEL[k]}</th>)}<th>Total</th></tr></thead>
                <tbody>
                  {perDoctor.map((d) => (
                    <tr key={d.doctor_id}>
                      <td><span className="cl-ad-cell-title">Dr. {d.doctor}</span></td>
                      {STATUS_KEYS.map((k) => <td key={k}>{d[k] || 0}</td>)}
                      <td><b>{d.total}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!perDoctor.length && <div className="cl-ad-empty"><h3>No data for this period</h3></div>}
          </section>
        </>
      )}
    </>
  );
}

function AuditLog() {
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const list = useServerList('/admin/audit-logs', { limit: AUDIT_PAGE, offset: (page - 1) * AUDIT_PAGE, ...(entity && { entity_type: entity }) });

  return (
    <>
      <section className="cl-pd-card cl-ad-toolbar">
        <div className="cl-ad-filters">
          {ENTITY_FILTERS.map(([value, label]) => (
            <button key={value || 'all'} type="button" className={`cl-ad-filter ${entity === value ? 'is-active' : ''}`} onClick={() => { setEntity(value); setPage(1); }}>{label}</button>
          ))}
        </div>
      </section>
      <section className="cl-pd-card cl-ad-table-card">
        <div className="cl-ad-table-scroll">
          <table className="cl-ad-table">
            <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>By (user id)</th></tr></thead>
            <tbody>
              {list.items.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td><span className="cl-ad-cell-title">{String(log.action).replace(/_/g, ' ')}</span></td>
                  <td>{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}</td>
                  <td>{log.user_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.loading && <div className="cl-ad-loading" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading…</div>}
        {list.error && <div className="cl-ad-banner cl-ad-banner--error" style={{ margin: '1rem' }} role="alert">{list.error}</div>}
        {!list.loading && !list.error && !list.items.length && <div className="cl-ad-empty"><h3>No log entries</h3></div>}
        <div className="cl-ad-foot">
          <span>Page {page}</span>
          <div className="cl-ad-pager">
            <button type="button" className="cl-ad-page" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button type="button" className="cl-ad-page" disabled={list.items.length < AUDIT_PAGE} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Reports() {
  const [tab, setTab] = useState('appointments');
  return (
    <>
      <Helmet><title>Reports | Clinika Admin</title></Helmet>
      <header className="cl-ad-head">
        <div><h1>Reports</h1><p>Appointment statistics for any period, and the log of admin actions.</p></div>
      </header>
      <div className="cl-ad-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'appointments'} className={`cl-ad-tab ${tab === 'appointments' ? 'is-active' : ''}`} onClick={() => setTab('appointments')}>
          <span className="material-symbols-outlined" aria-hidden="true">bar_chart</span> Appointments
        </button>
        <button type="button" role="tab" aria-selected={tab === 'audit'} className={`cl-ad-tab ${tab === 'audit' ? 'is-active' : ''}`} onClick={() => setTab('audit')}>
          <span className="material-symbols-outlined" aria-hidden="true">history</span> Audit log
        </button>
      </div>
      {tab === 'appointments' ? <AppointmentsReport /> : <AuditLog />}
    </>
  );
}
