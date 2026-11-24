import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import adminApi, { getErrorMessage } from '../../api/adminApi';
import { useDashboard } from '../../context/DashboardContext';
import { Banner, formatDateTime, Modal, Pager, showingRange } from './adminUi';
import useServerList from './useServerList';

const PAGE_SIZE = 10;
const FILTERS = [['', 'All'], ['new', 'New'], ['read', 'Read'], ['resolved', 'Resolved']];
const PILL = { new: 'pending', read: 'confirmed', resolved: 'completed' };

export default function ContactMessages() {
  const { refreshDashboard } = useDashboard();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const list = useServerList(
    '/admin/contact-messages',
    { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, ...(status && { status }) },
    reloadKey
  );

  async function setMessageStatus(message, next, { quiet = false } = {}) {
    setBusy(true);
    try {
      const { data } = await adminApi.patch(`/admin/contact-messages/${message.id}`, { status: next });
      setOpen((current) => (current && current.id === data.id ? data : current));
      if (!quiet) setBanner({ type: 'ok', text: `Message marked as ${next}.` });
      setReloadKey((n) => n + 1);
      refreshDashboard();
    } catch (err) {
      setBanner({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  // Opening a new message marks it as read.
  const openMessage = (message) => {
    setOpen(message);
    if (message.status === 'new') setMessageStatus(message, 'read', { quiet: true });
  };

  const [from, to] = showingRange(page, PAGE_SIZE, list.total, list.items.length);

  return (
    <>
      <Helmet><title>Contact Messages | Clinika Admin</title></Helmet>

      <header className="cl-ad-head">
        <div>
          <h1>Contact Messages</h1>
          <p>Messages sent from the Contact page. Mark them as read or resolved once handled.</p>
        </div>
      </header>

      <Banner banner={banner} onClose={() => setBanner(null)} />

      <section className="cl-pd-card cl-ad-toolbar">
        <div className="cl-ad-filters">
          {FILTERS.map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              className={`cl-ad-filter ${status === value ? 'is-active' : ''}`}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="cl-pd-card cl-ad-table-card" aria-label="Contact messages">
        <div className="cl-ad-table-scroll">
          <table className="cl-ad-table">
            <thead>
              <tr><th>From</th><th>Subject</th><th>Received</th><th>Status</th><th className="is-right">Actions</th></tr>
            </thead>
            <tbody>
              {list.items.map((m) => (
                <tr key={m.id}>
                  <td><span className="cl-ad-cell-title">{m.name}</span><span className="cl-ad-cell-sub">{m.email}</span></td>
                  <td>{m.subject || '—'}</td>
                  <td>{formatDateTime(m.created_at)}</td>
                  <td><span className={`cl-ad-pill cl-ad-pill--${PILL[m.status]}`}>{m.status}</span></td>
                  <td>
                    <div className="cl-ad-row-actions">
                      <button type="button" className="cl-ad-link-btn" onClick={() => openMessage(m)}>Open</button>
                      {m.status !== 'resolved' && (
                        <button type="button" className="cl-ad-link-btn cl-ad-link-btn--green" disabled={busy} onClick={() => setMessageStatus(m, 'resolved')}>Resolve</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.loading && <div className="cl-ad-loading" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading…</div>}
        {list.error && <div className="cl-ad-banner cl-ad-banner--error" style={{ margin: '1rem' }} role="alert">{list.error}</div>}
        {!list.loading && !list.error && !list.items.length && (
          <div className="cl-ad-empty"><span className="material-symbols-outlined" aria-hidden="true">mail</span><h3>No messages</h3></div>
        )}
        <div className="cl-ad-foot">
          <span>Showing <b>{from} - {to}</b> of <b>{list.total}</b> messages</span>
          <Pager page={page} pageSize={PAGE_SIZE} total={list.total} onChange={setPage} />
        </div>
      </section>

      {open && (
        <Modal title={open.subject || 'Message'} subtitle={`${open.name} • ${open.email} • ${formatDateTime(open.created_at)}`} onClose={() => setOpen(null)}>
          <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 1rem', fontSize: '0.95rem' }}>{open.message}</p>
          <div className="cl-ad-modal__actions">
            <a className="cl-pd-btn" href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject || 'Your message to Clinika'}`)}`}>Reply by email</a>
            {open.status !== 'resolved' ? (
              <button type="button" className="cl-pd-btn cl-pd-btn--primary" disabled={busy} onClick={() => setMessageStatus(open, 'resolved')}>Mark as resolved</button>
            ) : (
              <button type="button" className="cl-pd-btn" disabled={busy} onClick={() => setMessageStatus(open, 'read')}>Reopen</button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
