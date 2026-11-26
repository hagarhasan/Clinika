import { useCallback, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import adminApi, { getErrorMessage } from '../../api/adminApi';
import { useAdminStats } from '../../hooks/useAdmin';
import { Avatar, Banner, Modal, Pager, showingRange, useDebounced } from './adminUi';
import { useAdminAllList, useAdminRequest } from './adminQueries';
import useServerList from './useServerList';

// Directory page size. The design needs at least 5 doctors visible at once.
const PAGE_SIZE = 8;

const STATUS_LABEL = { active: 'Active', pending: 'Pending Approval', inactive: 'Inactive', rejected: 'Rejected' };

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  phone: '',
  specialty_id: '',
  license_number: '',
  years_of_experience: '',
  consultation_fee: '',
};

export default function ManageDoctors() {
  const statsQuery = useAdminStats();
  const rawStats = statsQuery.data || {};
  const stats = { topSpecialties: Array.isArray(rawStats.top_specialties) ? rawStats.top_specialties : [] };
  const refreshDashboard = () => statsQuery.refetch();

  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim());
  const [reloadKey, setReloadKey] = useState(0);

  const result = useServerList('/admin/doctors', {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    ...(filter !== 'all' && { status: filter }),
    ...(debouncedSearch && { q: debouncedSearch }),
  }, reloadKey);
  const countsQuery = useAdminRequest('/admin/doctors/counts', {}, reloadKey);
  const counts = {
    all: 0,
    active: 0,
    pending: 0,
    inactive: 0,
    rejected: 0,
    verified: 0,
    ...(countsQuery.data?.data || {}),
  };
  const specialtiesQuery = useAdminRequest('/specialties');
  const specialties = Array.isArray(specialtiesQuery.data?.data) ? specialtiesQuery.data.data : [];
  const clinics = useAdminAllList('/clinics', { limit: 100 }).items;
  const [banner, setBanner] = useState(null);

  const [modal, setModal] = useState(null); // { type: 'add' | 'review' | 'manage', doctor? }
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [rejectReason, setRejectReason] = useState('');
  const [editForm, setEditForm] = useState({});

  const reload = useCallback(() => setReloadKey((n) => n + 1), []);

  const notify = (type, text) => setBanner({ type, text });

  const closeModal = useCallback(() => {
    setModal(null);
    setFormError('');
    setRejectReason('');
  }, []);

  const afterChange = (message) => {
    notify('ok', message);
    closeModal();
    reload();
    refreshDashboard();
  };

  // Runs one admin action. Returns true when it worked, so callers can clear their forms.
  async function run(action, successMessage) {
    setBusy(true);
    setFormError('');
    try {
      await action();
      afterChange(successMessage);
      return true;
    } catch (err) {
      setFormError(getErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const handleAdd = (event) => {
    event.preventDefault();
    run(
      () =>
        adminApi.post('/doctors', {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || null,
          specialty_id: Number(form.specialty_id),
          license_number: form.license_number.trim() || null,
          years_of_experience: Number(form.years_of_experience || 0),
          consultation_fee: Number(form.consultation_fee || 0),
        }),
      'Doctor added. The account is active and can sign in.'
    ).then((ok) => ok && setForm(EMPTY_FORM));
  };

  const handleReview = (doctor, action) =>
    run(
      () =>
        adminApi.patch(`/admin/doctors/${doctor.id}/review`, {
          action,
          ...(action === 'reject' && rejectReason.trim() && { reason: rejectReason.trim() }),
        }),
      action === 'approve' ? `Dr. ${doctor.full_name} was approved.` : `Dr. ${doctor.full_name} was rejected.`
    );

  const handleActive = (doctor, isActive) =>
    run(
      () => adminApi.patch(`/admin/users/${doctor.user_id}/status`, { is_active: isActive }),
      `Dr. ${doctor.full_name} is now ${isActive ? 'active' : 'inactive'}.`
    );

  const handleVerify = (doctor) =>
    run(
      () => adminApi.patch(`/admin/doctors/${doctor.id}/verify`, { is_verified: !doctor.is_verified }),
      doctor.is_verified ? 'Verification badge removed.' : 'Doctor verified.'
    );

  const openEdit = (doctor) => {
    setEditForm({
      specialty_id: doctor.specialty?.id ?? '',
      clinic_id: doctor.clinic?.id ?? '',
      license_number: doctor.license_number ?? '',
      years_of_experience: doctor.years_of_experience ?? 0,
      consultation_fee: doctor.consultation_fee ?? 0,
      bio: doctor.bio ?? '',
    });
    setModal({ type: 'edit', doctor });
  };

  const handleEdit = (event) => {
    event.preventDefault();
    run(
      () =>
        adminApi.put(`/doctors/${modal.doctor.id}`, {
          ...(editForm.specialty_id && { specialty_id: Number(editForm.specialty_id) }),
          clinic_id: editForm.clinic_id ? Number(editForm.clinic_id) : null,
          license_number: editForm.license_number.trim() || null,
          years_of_experience: Number(editForm.years_of_experience || 0),
          consultation_fee: Number(editForm.consultation_fee || 0),
          bio: editForm.bio.trim() || null,
        }),
      `Dr. ${modal.doctor.full_name} was updated.`
    );
  };

  // Backend DELETE deactivates the doctor and the account (nothing is erased).
  const handleRemove = (doctor) =>
    run(() => adminApi.delete(`/doctors/${doctor.id}`), `Dr. ${doctor.full_name} was removed from the directory (account deactivated).`);

  async function handleExport() {
    try {
      const res = await adminApi.get('/admin/doctors/export', {
        params: filter !== 'all' ? { status: filter } : undefined,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'clinika-doctors.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify('error', getErrorMessage(err, 'Could not export the roster.'));
    }
  }

  const { items: doctors, total, error } = result;
  const loading = result.loading;
  const [from, to] = showingRange(page, PAGE_SIZE, total, doctors.length);
  const verifiedPct = counts.active ? Math.min(100, Math.round((counts.verified / counts.active) * 100)) : 0;
  const activePct = counts.all ? Math.round((counts.active / counts.all) * 1000) / 10 : 0;

  const tabs = [
    ['all', `All (${counts.all})`],
    ['active', `Active (${counts.active})`],
    ['pending', `Pending Approval (${counts.pending})`],
    ['inactive', `Inactive (${counts.inactive})`],
    ...(counts.rejected > 0 ? [['rejected', `Rejected (${counts.rejected})`]] : []),
  ];

  // Donut: appointments by the top specialties (from /admin/stats)
  const donut = useMemo(() => {
    const list = stats.topSpecialties.slice(0, 2);
    const sum = stats.topSpecialties.reduce((acc, s) => acc + s.appointments, 0);
    if (!sum) return null;
    const colors = ['#1b68f6', '#53606d', '#d7e4f4'];
    const parts = list.map((s, i) => ({ name: s.name, value: s.appointments, color: colors[i] }));
    const rest = sum - parts.reduce((acc, p) => acc + p.value, 0);
    if (rest > 0) parts.push({ name: 'Other Specialties', value: rest, color: colors[2] });
    let acc = 0;
    const gradient = parts
      .map((p) => {
        const start = (acc / sum) * 100;
        acc += p.value;
        return `${p.color} ${start}% ${(acc / sum) * 100}%`;
      })
      .join(', ');
    return { parts, sum, gradient };
  }, [stats.topSpecialties]);

  return (
    <>
      <Helmet>
        <title>Manage Doctors | Clinika</title>
      </Helmet>

      <header className="cl-ad-head">
        <div>
          <h1>
            Manage Doctors <span className="cl-ad-tag">Directory</span>
          </h1>
          <p>View, verify, and orchestrate licensed medical practitioner credentials across Clinika networks.</p>
          <div className="cl-ad-meta">
            <span><i className="cl-ad-dot cl-ad-dot--blue" /> <b>{counts.all}</b> Doctors Registered</span>
            <span><i className="cl-ad-dot cl-ad-dot--amber" /> <b>{counts.pending}</b> Pending Credential Review</span>
            <span><i className="cl-ad-dot cl-ad-dot--green" /> <b>{activePct}%</b> Active Roster Capacity</span>
          </div>
        </div>
        <div className="cl-ad-actions">
          <button type="button" className="cl-pd-btn cl-ad-btn-icon" onClick={handleExport}>
            <span className="material-symbols-outlined" aria-hidden="true">download</span> Export Roster
          </button>
          <button type="button" className="cl-pd-btn cl-pd-btn--primary cl-ad-btn-icon" onClick={() => setModal({ type: 'add' })}>
            <span className="material-symbols-outlined" aria-hidden="true">person_add</span> Add Doctor
          </button>
        </div>
      </header>

      <Banner banner={banner} onClose={() => setBanner(null)} />

      <section className="cl-pd-card cl-ad-toolbar">
        <label className="cl-ad-search">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input
            type="search"
            placeholder="Search by doctor name or email…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label="Search doctors"
          />
        </label>
        <div className="cl-ad-filters" role="tablist" aria-label="Filter doctors by status">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={`cl-ad-filter ${filter === value ? 'is-active' : ''}`}
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="cl-pd-card cl-ad-table-card" aria-label="Doctors directory">
        {error && <div className="cl-ad-banner cl-ad-banner--error" style={{ margin: '1rem' }} role="alert">{error}</div>}

        <div className="cl-ad-table-scroll">
          <table className="cl-ad-table">
            <thead>
              <tr>
                <th>Doctor &amp; Credentials</th>
                <th>Specialty</th>
                <th>Contact Email</th>
                <th>Experience</th>
                <th>System Status</th>
                <th className="is-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td>
                    <div className="cl-ad-person">
                      <Avatar name={doctor.full_name} src={doctor.photo_url} />
                      <div>
                        <strong>
                          Dr. {doctor.full_name}
                          {doctor.is_verified && (
                            <span className="material-symbols-outlined cl-ad-verified" title="Verified" aria-label="Verified">verified</span>
                          )}
                        </strong>
                        <small>
                          {doctor.license_number ? `Lic. ${doctor.license_number}` : 'No license on file'}
                          {doctor.clinic?.name ? ` • ${doctor.clinic.name}` : ''}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="cl-ad-cell-title">{doctor.specialty?.name || '—'}</span>
                    {doctor.title && <span className="cl-ad-cell-sub">{doctor.title}</span>}
                  </td>
                  <td><a className="cl-ad-email" href={`mailto:${doctor.email}`}>{doctor.email}</a></td>
                  <td>
                    <span className="cl-ad-cell-title">{doctor.years_of_experience} {doctor.years_of_experience === 1 ? 'year' : 'years'}</span>
                    <span className="cl-ad-cell-sub">EGP {Number(doctor.consultation_fee).toLocaleString()} / visit</span>
                  </td>
                  <td>
                    <span className={`cl-ad-pill cl-ad-pill--${doctor.status}`}>{STATUS_LABEL[doctor.status] ?? doctor.status}</span>
                  </td>
                  <td>
                    <div className="cl-ad-row-actions">
                      {(doctor.status === 'pending' || doctor.status === 'rejected') && (
                        <button type="button" className="cl-ad-link-btn" onClick={() => setModal({ type: 'review', doctor })}>Review</button>
                      )}
                      {doctor.status === 'inactive' && (
                        <button type="button" className="cl-ad-link-btn cl-ad-link-btn--green" onClick={() => setModal({ type: 'manage', doctor })}>Reactivate</button>
                      )}
                      {doctor.status === 'active' && (
                        <button type="button" className="cl-ad-icon-btn" aria-label={`Manage Dr. ${doctor.full_name}`} onClick={() => setModal({ type: 'manage', doctor })}>
                          <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="cl-ad-loading" role="status">
            <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading doctors…
          </div>
        )}
        {!loading && !error && doctors.length === 0 && (
          <div className="cl-ad-empty">
            <span className="material-symbols-outlined" aria-hidden="true">person_search</span>
            <h3>No doctors found</h3>
            <p className="cl-pd-muted">Try a different search or filter.</p>
          </div>
        )}

        <div className="cl-ad-foot">
          <span>
            Showing <b>{from} - {to}</b> of <b>{total}</b> credentialed practitioners
          </span>
          <Pager page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
        </div>
      </section>

      <div className="cl-ad-grid">
        <section className="cl-pd-card cl-ad-info-card">
          <div className="cl-ad-info-card__head">
            <div>
              <span className="cl-ad-kicker">Regulatory Review</span>
              <h3>License Verification</h3>
            </div>
            <span className="cl-ad-info-card__icon material-symbols-outlined" aria-hidden="true">verified_user</span>
          </div>
          <span className="cl-ad-big">{verifiedPct}%</span>
          <div className="cl-ad-bar" role="img" aria-label={`${verifiedPct}% of active doctors verified`}>
            <span style={{ width: `${verifiedPct}%` }} />
          </div>
          <p className="cl-ad-note">{counts.verified} of {counts.active} active doctors carry the verified badge.</p>
        </section>

        <section className="cl-pd-card cl-ad-info-card">
          <div className="cl-ad-info-card__head">
            <div>
              <span className="cl-ad-kicker">Specialty Breakdown</span>
              <h3>Network Capacity</h3>
            </div>
            <span className="cl-ad-info-card__icon material-symbols-outlined" aria-hidden="true">pie_chart</span>
          </div>
          {donut ? (
            <div className="cl-ad-donut-row">
              <div className="cl-ad-donut" style={{ background: `conic-gradient(${donut.gradient})` }} role="img" aria-label="Appointments by specialty" />
              <ul className="cl-ad-legend">
                {donut.parts.map((part) => (
                  <li key={part.name}>
                    <i className="cl-ad-dot" style={{ background: part.color }} />
                    {part.name}
                    <b>{Math.round((part.value / donut.sum) * 100)}%</b>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="cl-ad-note">No bookings yet, so there is nothing to break down.</p>
          )}
          <p className="cl-ad-note" style={{ marginTop: '0.75rem' }}>Share of appointments by specialty.</p>
        </section>

        <section className="cl-pd-card cl-ad-info-card cl-ad-cta">
          <span className="cl-ad-kicker">Fast Onboarding</span>
          <h3>Doctor Applications</h3>
          <p className="cl-ad-note">
            {counts.pending > 0
              ? `${counts.pending} doctor ${counts.pending === 1 ? 'application is' : 'applications are'} waiting for your review.`
              : 'No applications are waiting right now.'}
          </p>
          <button
            type="button"
            className="cl-pd-btn"
            onClick={() => {
              setFilter('pending');
              setPage(1);
            }}
          >
            Review pending doctors
          </button>
        </section>
      </div>

      {modal?.type === 'add' && (
        <Modal title="Add Doctor" subtitle="Creates an active doctor account that can sign in right away." onClose={closeModal}>
          <form className="cl-pd-form" onSubmit={handleAdd}>
            <div className="cl-pd-field">
              <label htmlFor="ad-fn">First name</label>
              <input id="ad-fn" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="cl-pd-field">
              <label htmlFor="ad-ln">Last name</label>
              <input id="ad-ln" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div className="cl-pd-field">
              <label htmlFor="ad-email">Email</label>
              <input id="ad-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="cl-pd-field">
              <label htmlFor="ad-pass">Temporary password</label>
              <input id="ad-pass" type="password" minLength={8} maxLength={72} required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="cl-pd-field">
              <label htmlFor="ad-phone">Phone</label>
              <input id="ad-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="cl-pd-field">
              <label htmlFor="ad-spec">Specialty</label>
              <select id="ad-spec" required value={form.specialty_id} onChange={(e) => setForm({ ...form, specialty_id: e.target.value })}>
                <option value="">Select…</option>
                {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="cl-pd-field">
              <label htmlFor="ad-lic">License number</label>
              <input id="ad-lic" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
            </div>
            <div className="cl-pd-field">
              <label htmlFor="ad-exp">Years of experience</label>
              <input id="ad-exp" type="number" min="0" max="70" value={form.years_of_experience} onChange={(e) => setForm({ ...form, years_of_experience: e.target.value })} />
            </div>
            <div className="cl-pd-field">
              <label htmlFor="ad-fee">Consultation fee (EGP)</label>
              <input id="ad-fee" type="number" min="0" value={form.consultation_fee} onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })} />
            </div>
            {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
            <div className="cl-ad-modal__actions">
              <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Cancel</button>
              <button type="submit" className="cl-pd-btn cl-pd-btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Add doctor'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'review' && (
        <Modal title={`Review Dr. ${modal.doctor.full_name}`} subtitle="Approving lets the doctor sign in. They are notified by email either way." onClose={closeModal}>
          <dl className="cl-ad-detail">
            <div><dt>Specialty</dt><dd>{modal.doctor.specialty?.name || '—'}</dd></div>
            <div><dt>License</dt><dd>{modal.doctor.license_number || '—'}</dd></div>
            <div><dt>Email</dt><dd>{modal.doctor.email}</dd></div>
            <div><dt>Experience</dt><dd>{modal.doctor.years_of_experience} years</dd></div>
            {modal.doctor.bio && <div className="is-wide"><dt>Bio</dt><dd>{modal.doctor.bio}</dd></div>}
            {modal.doctor.rejection_reason && <div className="is-wide"><dt>Previous rejection reason</dt><dd>{modal.doctor.rejection_reason}</dd></div>}
          </dl>
          <div className="cl-pd-field" style={{ marginTop: '1rem' }}>
            <label htmlFor="ad-reason">Reason (only used when rejecting)</label>
            <textarea id="ad-reason" rows={2} maxLength={500} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
          <div className="cl-ad-modal__actions">
            <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Close</button>
            <button type="button" className="cl-pd-btn cl-pd-btn--danger" disabled={busy} onClick={() => handleReview(modal.doctor, 'reject')}>Reject</button>
            <button type="button" className="cl-pd-btn cl-pd-btn--primary" disabled={busy} onClick={() => handleReview(modal.doctor, 'approve')}>Approve</button>
          </div>
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title={`Edit Dr. ${modal.doctor.full_name}`} onClose={closeModal}>
          <form className="cl-pd-form" onSubmit={handleEdit}>
            <div className="cl-pd-field">
              <label htmlFor="ed-spec">Specialty</label>
              <select id="ed-spec" value={editForm.specialty_id} onChange={(e) => setEditForm({ ...editForm, specialty_id: e.target.value })}>
                {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="cl-pd-field">
              <label htmlFor="ed-clinic">Clinic</label>
              <select id="ed-clinic" value={editForm.clinic_id} onChange={(e) => setEditForm({ ...editForm, clinic_id: e.target.value })}>
                <option value="">No clinic</option>
                {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="cl-pd-field"><label htmlFor="ed-lic">License number</label><input id="ed-lic" value={editForm.license_number} onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })} /></div>
            <div className="cl-pd-field"><label htmlFor="ed-exp">Years of experience</label><input id="ed-exp" type="number" min="0" max="70" value={editForm.years_of_experience} onChange={(e) => setEditForm({ ...editForm, years_of_experience: e.target.value })} /></div>
            <div className="cl-pd-field"><label htmlFor="ed-fee">Consultation fee (EGP)</label><input id="ed-fee" type="number" min="0" value={editForm.consultation_fee} onChange={(e) => setEditForm({ ...editForm, consultation_fee: e.target.value })} /></div>
            <div className="cl-pd-field cl-pd-field--wide"><label htmlFor="ed-bio">Bio</label><textarea id="ed-bio" rows={3} value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} /></div>
            {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
            <div className="cl-ad-modal__actions">
              <button type="button" className="cl-pd-btn cl-pd-btn--danger" disabled={busy} onClick={() => handleRemove(modal.doctor)} style={{ marginRight: 'auto' }}>Remove doctor</button>
              <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Cancel</button>
              <button type="submit" className="cl-pd-btn cl-pd-btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'manage' && (
        <Modal title={`Dr. ${modal.doctor.full_name}`} subtitle={`${modal.doctor.specialty?.name || 'Doctor'} • ${modal.doctor.email}`} onClose={closeModal}>
          {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
          <div className="cl-ad-modal__actions">
            <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Close</button>
            {modal.doctor.status === 'active' && (
              <>
                <button type="button" className="cl-pd-btn" disabled={busy} onClick={() => handleVerify(modal.doctor)}>
                  {modal.doctor.is_verified ? 'Remove verified badge' : 'Mark as verified'}
                </button>
                <button type="button" className="cl-pd-btn" disabled={busy} onClick={() => openEdit(modal.doctor)}>Edit details</button>
                <button type="button" className="cl-pd-btn cl-pd-btn--danger" disabled={busy} onClick={() => handleActive(modal.doctor, false)}>Deactivate</button>
              </>
            )}
            {modal.doctor.status === 'inactive' && (
              <button type="button" className="cl-pd-btn cl-pd-btn--primary" disabled={busy} onClick={() => handleActive(modal.doctor, true)}>Reactivate</button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
