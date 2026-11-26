import { useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { getErrorMessage } from '../../api/client';
import PasswordCard from '../../Components/Patient/PasswordCard';
import Avatar from '../../Components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useAdminActivity } from '../../hooks/useAdmin';
import { uploadAvatar } from '../../api/uploadsApi';
import '../PatientDashboard/patient-profile.css';
import './admin.css';
import { formatDateTime, formatShortDate } from './adminUi';

const MAX_AVATAR_MB = 3;

// Same layout as the patient "My Profile" page (cl-pd-* classes), with the admin's own data.
const FIELDS = [
  { key: 'first_name', label: 'First name', required: true },
  { key: 'last_name', label: 'Last name', required: true },
  { key: 'phone', label: 'Phone', type: 'tel' },
];

// Some accounts (for example the seeded admin) only have a full name, so split it when first/last are empty.
function nameParts(user) {
  const [first = '', ...rest] = String(user.full_name || '').trim().split(/\s+/);
  return {
    first_name: user.first_name || first,
    last_name: user.last_name || rest.join(' '),
  };
}

const valueOf = (user, key) => (key === 'phone' ? user.phone ?? '' : nameParts(user)[key]);

const toForm = (user) => Object.fromEntries(FIELDS.map(({ key }) => [key, valueOf(user, key)]));

export default function AdminProfile() {
  const { user, updateProfile, setUserData } = useAuth();
  const activityQuery = useAdminActivity();
  const activities = activityQuery.data || [];
  const activityLoading = activityQuery.isLoading;

  const [form, setForm] = useState(null); // null = viewing, an object = editing
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const fileInput = useRef(null);


  async function handleSave(event) {
    event.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError('First name and last name are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await updateProfile({ first_name: form.first_name.trim(), last_name: form.last_name.trim(), phone: form.phone.trim() || null });
      setForm(null);
      setNotice({ type: 'ok', text: 'Your profile was updated.' });
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', text: 'Please choose an image file.' });
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setNotice({ type: 'error', text: `The image must be smaller than ${MAX_AVATAR_MB} MB.` });
      return;
    }
    setAvatarBusy(true);
    setNotice({ type: '', text: '' });
    try {
      const data = await uploadAvatar(file);
      setUserData(data?.user ? { ...user, ...data.user } : { ...user, avatar_url: data?.avatar_url || data?.url });
      setNotice({ type: 'ok', text: 'Your photo was updated.' });
    } catch (err) {
      setNotice({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setAvatarBusy(false);
    }
  }

  const rows = [
    ...FIELDS.map((field) => [field.label, valueOf(user, field.key) || '—']),
    ['Email', user.email],
    ['Role', 'Administrator'],
    ['Member since', formatShortDate(user.created_at)],
  ];

  return (
    <>
      <Helmet>
        <title>My Profile | Clinika Admin</title>
      </Helmet>

      <header className="cl-pd-page-head">
        <h1>My Profile</h1>
        <p className="cl-pd-muted">Manage your administrator account details and security.</p>
      </header>

      {notice.text && (
        <div className={`cl-pd-notice ${notice.type === 'error' ? 'cl-pd-notice--error' : ''}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      )}

      <section className="cl-pd-card cl-pd-profile-head">
        <Avatar size="lg" src={user.avatar_url} name={user.full_name} />
        <div>
          <h2 className="cl-pd-profile-head__name">
            {user.full_name}
            <span className="cl-ad-role">ADMIN</span>
          </h2>
          <p className="cl-pd-muted">JPG, PNG or WebP, up to {MAX_AVATAR_MB} MB.</p>
          <button type="button" className="cl-pd-btn" disabled={avatarBusy} onClick={() => fileInput.current?.click()}>
            {avatarBusy ? 'Uploading…' : 'Change photo'}
          </button>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleAvatar} />
        </div>
      </section>

      <section className="cl-pd-card cl-pd-section-card" aria-labelledby="cl-ad-info-title">
        <div className="cl-pd-section__head">
          <h2 id="cl-ad-info-title">Personal information</h2>
          {!form && (
            <button
              type="button"
              className="cl-pd-btn"
              onClick={() => {
                setNotice({ type: '', text: '' });
                setFormError('');
                setForm(toForm(user));
              }}
            >
              Edit profile
            </button>
          )}
        </div>

        {form ? (
          <form className="cl-pd-form" onSubmit={handleSave}>
            {FIELDS.map((field) => (
              <div key={field.key} className="cl-pd-field">
                <label htmlFor={`cl-ad-f-${field.key}`}>{field.label}</label>
                <input
                  id={`cl-ad-f-${field.key}`}
                  type={field.type ?? 'text'}
                  required={field.required}
                  maxLength={field.key === 'phone' ? 30 : 70}
                  value={form[field.key]}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                />
              </div>
            ))}
            <div className="cl-pd-field">
              <label htmlFor="cl-ad-f-email">Email</label>
              <input id="cl-ad-f-email" type="email" value={user.email} disabled />
            </div>
            {formError && <p className="cl-pd-confirm__error cl-pd-field--wide" role="alert" style={{ color: 'var(--cl-error)' }}>{formError}</p>}
            <div className="cl-pd-field--wide cl-pd-appt__actions" style={{ gap: '0.6rem' }}>
              <button type="button" className="cl-pd-btn" disabled={saving} onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className="cl-pd-btn cl-pd-btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        ) : (
          <dl className="cl-pd-info">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <PasswordCard />

      <section className="cl-pd-card cl-pd-section-card" aria-labelledby="cl-ad-activity-title">
        <h2 id="cl-ad-activity-title">Recent platform activity</h2>
        {activityLoading ? (
          <p className="cl-pd-muted">Loading…</p>
        ) : activities.length === 0 ? (
          <p className="cl-pd-muted">No recent activity yet.</p>
        ) : (
          <ul className="cl-ad-timeline">
            {activities.map((item) => (
              <li key={item.id}>
                <span>{item.description || item.action}{item.actor_name ? ` — ${item.actor_name}` : ''}</span>
                <time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
