import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import adminApi, { getErrorMessage } from '../../api/adminApi';
import { Banner, Modal } from './adminUi';

const EMPTY_SPECIALTY = { name: '', description: '' };
const EMPTY_CLINIC = { name: '', city: '', district: '', address: '', phone: '', email: '', description: '' };
const CLINIC_FIELDS = [
  ['name', 'Name', true], ['city', 'City'], ['district', 'District'], ['address', 'Address'],
  ['phone', 'Phone'], ['email', 'Email'],
];

// Loads a plain array endpoint (specialties, clinics).
function useArray(path, params, reloadKey) {
  const key = JSON.stringify([path, params, reloadKey]);
  const [state, setState] = useState({ key: '', items: [], error: '' });
  useEffect(() => {
    let ignore = false;
    const [url, query] = JSON.parse(key);
    adminApi.get(url, { params: query })
      .then((res) => !ignore && setState({ key, items: res.data, error: '' }))
      .catch((err) => !ignore && setState({ key, items: [], error: getErrorMessage(err) }));
    return () => { ignore = true; };
  }, [key]);
  return { ...state, loading: state.key !== key };
}

export default function CatalogManage() {
  const [tab, setTab] = useState('specialties');
  const [reloadKey, setReloadKey] = useState(0);
  const [banner, setBanner] = useState(null);
  const [modal, setModal] = useState(null); // { kind: 'specialty'|'clinic', item?, remove? }
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const specialties = useArray('/specialties', {}, reloadKey);
  const clinics = useArray('/clinics', { limit: 100 }, reloadKey);

  const closeModal = useCallback(() => { setModal(null); setFormError(''); }, []);

  const openForm = (kind, item = null) => {
    const empty = kind === 'specialty' ? EMPTY_SPECIALTY : EMPTY_CLINIC;
    setForm(item ? Object.fromEntries(Object.keys(empty).map((k) => [k, item[k] ?? ''])) : empty);
    setModal({ kind, item });
  };

  async function run(action, message) {
    setBusy(true);
    setFormError('');
    try {
      await action();
      setBanner({ type: 'ok', text: message });
      closeModal();
      setReloadKey((n) => n + 1);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const clean = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]));

  const save = (event) => {
    event.preventDefault();
    const { kind, item } = modal;
    const path = kind === 'specialty' ? '/specialties' : '/clinics';
    const body = clean(form);
    run(
      () => (item ? adminApi.put(`${path}/${item.id}`, body) : adminApi.post(path, body)),
      `${kind === 'specialty' ? 'Specialty' : 'Clinic'} ${item ? 'updated' : 'added'}.`
    );
  };

  const remove = () => {
    const { kind, item } = modal;
    run(
      () => adminApi.delete(`${kind === 'specialty' ? '/specialties' : '/clinics'}/${item.id}`),
      kind === 'specialty' ? 'Specialty deleted.' : 'Clinic removed (hidden if doctors still belong to it).'
    );
  };

  const current = tab === 'specialties' ? specialties : clinics;

  return (
    <>
      <Helmet><title>Specialties &amp; Clinics | Clinika Admin</title></Helmet>

      <header className="cl-ad-head">
        <div>
          <h1>Specialties &amp; Clinics</h1>
          <p>The lists patients see when they search for doctors and book visits.</p>
        </div>
        <div className="cl-ad-actions">
          <button type="button" className="cl-pd-btn cl-pd-btn--primary cl-ad-btn-icon" onClick={() => openForm(tab === 'specialties' ? 'specialty' : 'clinic')}>
            <span className="material-symbols-outlined" aria-hidden="true">add</span> Add {tab === 'specialties' ? 'Specialty' : 'Clinic'}
          </button>
        </div>
      </header>

      <Banner banner={banner} onClose={() => setBanner(null)} />

      <div className="cl-ad-tabs" role="tablist">
        {[['specialties', 'medical_services', `Specialties (${specialties.items.length})`], ['clinics', 'local_hospital', `Clinics (${clinics.items.length})`]].map(([value, icon, label]) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} className={`cl-ad-tab ${tab === value ? 'is-active' : ''}`} onClick={() => setTab(value)}>
            <span className="material-symbols-outlined" aria-hidden="true">{icon}</span> {label}
          </button>
        ))}
      </div>

      <section className="cl-pd-card cl-ad-table-card">
        <div className="cl-ad-table-scroll">
          <table className="cl-ad-table">
            <thead>
              {tab === 'specialties'
                ? <tr><th>Name</th><th>Description</th><th className="is-right">Actions</th></tr>
                : <tr><th>Clinic</th><th>Location</th><th>Contact</th><th className="is-right">Actions</th></tr>}
            </thead>
            <tbody>
              {tab === 'specialties' && specialties.items.map((s) => (
                <tr key={s.id}>
                  <td><span className="cl-ad-cell-title">{s.name}</span></td>
                  <td>{s.description || '—'}</td>
                  <td><div className="cl-ad-row-actions">
                    <button type="button" className="cl-ad-link-btn" onClick={() => openForm('specialty', s)}>Edit</button>
                    <button type="button" className="cl-ad-link-btn cl-ad-link-btn--red" onClick={() => setModal({ kind: 'specialty', item: s, remove: true })}>Delete</button>
                  </div></td>
                </tr>
              ))}
              {tab === 'clinics' && clinics.items.map((c) => (
                <tr key={c.id}>
                  <td><span className="cl-ad-cell-title">{c.name}</span></td>
                  <td>{[c.district, c.city].filter(Boolean).join(', ') || '—'}<span className="cl-ad-cell-sub">{c.address}</span></td>
                  <td>{c.phone || '—'}<span className="cl-ad-cell-sub">{c.email}</span></td>
                  <td><div className="cl-ad-row-actions">
                    <button type="button" className="cl-ad-link-btn" onClick={() => openForm('clinic', c)}>Edit</button>
                    <button type="button" className="cl-ad-link-btn cl-ad-link-btn--red" onClick={() => setModal({ kind: 'clinic', item: c, remove: true })}>Remove</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {current.loading && <div className="cl-ad-loading" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading…</div>}
        {current.error && <div className="cl-ad-banner cl-ad-banner--error" style={{ margin: '1rem' }} role="alert">{current.error}</div>}
        {!current.loading && !current.error && !current.items.length && (
          <div className="cl-ad-empty"><span className="material-symbols-outlined" aria-hidden="true">inventory_2</span><h3>Nothing here yet</h3></div>
        )}
      </section>

      {modal && modal.remove && (
        <Modal title={`${modal.kind === 'specialty' ? 'Delete specialty' : 'Remove clinic'}?`} subtitle={modal.item.name} onClose={closeModal}>
          <p className="cl-pd-muted">
            {modal.kind === 'specialty'
              ? 'A specialty that still has doctors cannot be deleted.'
              : 'A clinic that still has doctors is hidden instead of deleted.'}
          </p>
          {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
          <div className="cl-ad-modal__actions">
            <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Cancel</button>
            <button type="button" className="cl-pd-btn cl-pd-btn--danger" onClick={remove} disabled={busy}>Confirm</button>
          </div>
        </Modal>
      )}

      {modal && !modal.remove && modal.kind === 'specialty' && (
        <Modal title={modal.item ? 'Edit Specialty' : 'Add Specialty'} onClose={closeModal}>
          <form className="cl-pd-form" onSubmit={save}>
            <div className="cl-pd-field cl-pd-field--wide"><label htmlFor="sp-name">Name</label><input id="sp-name" required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="cl-pd-field cl-pd-field--wide"><label htmlFor="sp-desc">Description</label><textarea id="sp-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
            <div className="cl-ad-modal__actions">
              <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Cancel</button>
              <button type="submit" className="cl-pd-btn cl-pd-btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal && !modal.remove && modal.kind === 'clinic' && (
        <Modal title={modal.item ? 'Edit Clinic' : 'Add Clinic'} onClose={closeModal}>
          <form className="cl-pd-form" onSubmit={save}>
            {CLINIC_FIELDS.map(([key, label, required]) => (
              <div key={key} className="cl-pd-field">
                <label htmlFor={`cn-${key}`}>{label}</label>
                <input id={`cn-${key}`} type={key === 'email' ? 'email' : 'text'} required={required} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="cl-pd-field cl-pd-field--wide"><label htmlFor="cn-desc">Description</label><textarea id="cn-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
            <div className="cl-ad-modal__actions">
              <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Cancel</button>
              <button type="submit" className="cl-pd-btn cl-pd-btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
