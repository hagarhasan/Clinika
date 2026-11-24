import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import adminApi, { getErrorMessage } from '../../api/adminApi';
import { useAdminUser } from '../../context/AdminUserContext';
import { Avatar, Banner, formatShortDate, Modal, showingRange } from './adminUi';
import useServerList from './useServerList';

const PAGE_SIZE = 10;
const EMPTY = { first_name: '', last_name: '', email: '', phone: '', password: '' };

export default function AdminTeam() {
  const { user } = useAdminUser();
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [banner, setBanner] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const list = useServerList('/admin/users', { role: 'admin', limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }, reloadKey);
  const closeModal = () => { setModal(null); setFormError(''); };

  async function run(action, message) {
    setBusy(true);
    setFormError('');
    try {
      await action();
      setBanner({ type: 'ok', text: message });
      closeModal();
      setReloadKey((n) => n + 1);
      return true;
    } catch (err) {
      setFormError(getErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const addAdmin = (event) => {
    event.preventDefault();
    run(
      () => adminApi.post('/admin/users', {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        password: form.password,
      }),
      'Administrator account created.'
    ).then((ok) => ok && setForm(EMPTY));
  };

  const [from, to] = showingRange(page, PAGE_SIZE, list.items.length ? (page - 1) * PAGE_SIZE + list.items.length : 0, list.items.length);

  return (
    <>
      <Helmet><title>Admin Team | Clinika Admin</title></Helmet>
      <header className="cl-ad-head">
        <div><h1>Admin Team</h1><p>People who can sign in to this dashboard. Add admins only for people you trust fully.</p></div>
        <div className="cl-ad-actions">
          <button type="button" className="cl-pd-btn cl-pd-btn--primary cl-ad-btn-icon" onClick={() => setModal({ type: 'add' })}>
            <span className="material-symbols-outlined" aria-hidden="true">admin_panel_settings</span> Add Admin
          </button>
        </div>
      </header>

      <Banner banner={banner} onClose={() => setBanner(null)} />

      <section className="cl-pd-card cl-ad-table-card">
        <div className="cl-ad-table-scroll">
          <table className="cl-ad-table">
            <thead><tr><th>Administrator</th><th>Phone</th><th>Created</th><th>Status</th><th className="is-right">Actions</th></tr></thead>
            <tbody>
              {list.items.map((a) => (
                <tr key={a.id}>
                  <td><div className="cl-ad-person"><Avatar name={a.full_name} src={a.avatar_url} /><div><strong>{a.full_name}{a.id === user?.id ? ' (you)' : ''}</strong><small>{a.email}</small></div></div></td>
                  <td>{a.phone || '—'}</td>
                  <td>{formatShortDate(a.created_at)}</td>
                  <td><span className={`cl-ad-pill cl-ad-pill--${a.is_active ? 'active' : 'inactive'}`}>{a.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="cl-ad-row-actions">
                      {a.id !== user?.id && (a.is_active
                        ? <button type="button" className="cl-ad-link-btn cl-ad-link-btn--plain" onClick={() => setModal({ type: 'deactivate', admin: a })}>Deactivate</button>
                        : <button type="button" className="cl-ad-link-btn cl-ad-link-btn--green" disabled={busy} onClick={() => run(() => adminApi.patch(`/admin/users/${a.id}/status`, { is_active: true }), `${a.full_name} was activated.`)}>Activate</button>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.loading && <div className="cl-ad-loading" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading…</div>}
        {list.error && <div className="cl-ad-banner cl-ad-banner--error" style={{ margin: '1rem' }} role="alert">{list.error}</div>}
        <div className="cl-ad-foot">
          <span>Showing <b>{from} - {to}</b></span>
          <div className="cl-ad-pager">
            <button type="button" className="cl-ad-page" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button type="button" className="cl-ad-page" disabled={list.items.length < PAGE_SIZE} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      </section>

      {modal?.type === 'deactivate' && (
        <Modal title="Deactivate administrator?" subtitle={`${modal.admin.full_name} will no longer be able to sign in.`} onClose={closeModal}>
          {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
          <div className="cl-ad-modal__actions">
            <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Cancel</button>
            <button type="button" className="cl-pd-btn cl-pd-btn--danger" disabled={busy} onClick={() => run(() => adminApi.patch(`/admin/users/${modal.admin.id}/status`, { is_active: false }), `${modal.admin.full_name} was deactivated.`)}>Deactivate</button>
          </div>
        </Modal>
      )}

      {modal?.type === 'add' && (
        <Modal title="Add Administrator" subtitle="Creates an active admin account with full access." onClose={closeModal}>
          <form className="cl-pd-form" onSubmit={addAdmin}>
            <div className="cl-pd-field"><label htmlFor="ta-fn">First name</label><input id="ta-fn" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div className="cl-pd-field"><label htmlFor="ta-ln">Last name</label><input id="ta-ln" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
            <div className="cl-pd-field"><label htmlFor="ta-email">Email</label><input id="ta-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="cl-pd-field"><label htmlFor="ta-phone">Phone</label><input id="ta-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="cl-pd-field cl-pd-field--wide"><label htmlFor="ta-pass">Temporary password</label><input id="ta-pass" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
            <div className="cl-ad-modal__actions">
              <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Cancel</button>
              <button type="submit" className="cl-pd-btn cl-pd-btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Create admin'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
