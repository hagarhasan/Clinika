import { useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PasswordCard from '../../Components/Patient/PasswordCard';
import { useQueryClient } from '@tanstack/react-query';
import Avatar from '../../Components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { usePatientProfile } from '../../hooks/usePatientStats';
import { queryKeys } from '../../hooks/queryKeys';
import { formatDate } from '../../utils/format';
import { ErrorState, LoadingState } from '../../Components/Patient/StateViews';
import { updateProfile } from '../../api/patientsApi';
import { uploadAvatar } from '../../api/uploadsApi';
import { getErrorMessage, isUnauthorized } from '../../api/client';
import './patient-profile.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MAX_AVATAR_MB = 3;

// One list drives both the read-only view and the edit form.
const FIELDS = [
  { key: 'first_name', label: 'First name', required: true },
  { key: 'last_name', label: 'Last name', required: true },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'date_of_birth', label: 'Date of birth', type: 'date' },
  { key: 'gender', label: 'Gender', type: 'select', options: [['male', 'Male'], ['female', 'Female']] },
  { key: 'blood_type', label: 'Blood type', type: 'select', options: BLOOD_TYPES.map((type) => [type, type]) },
  { key: 'address', label: 'Address', wide: true },
  { key: 'emergency_contact_name', label: 'Emergency contact name' },
  { key: 'emergency_contact_phone', label: 'Emergency contact phone', type: 'tel' },
  { key: 'allergies', label: 'Allergies', type: 'textarea', wide: true },
  { key: 'chronic_conditions', label: 'Chronic conditions', type: 'textarea', wide: true },
];

const toForm = (profile) => Object.fromEntries(FIELDS.map(({ key }) => [key, profile[key] ?? '']));

// Empty optional fields are sent as null, which clears them on the server.
const toPayload = (form) =>
  Object.fromEntries(
    FIELDS.map(({ key, required }) => {
      const value = String(form[key]).trim();
      return [key, required ? value : value || null];
    })
  );

function displayValue(field, value) {
  if (!value) return '—';
  if (field.type === 'date') return formatDate(value);
  if (field.type === 'select') return field.options.find(([optionValue]) => optionValue === value)?.[1] ?? value;
  return value;
}

function FieldInput({ field, value, onChange }) {
  const id = `cl-pd-f-${field.key}`;
  const common = { id, value, onChange: (event) => onChange(field.key, event.target.value) };
  let control;
  if (field.type === 'select') {
    control = (
      <select {...common}>
        <option value="">Not set</option>
        {field.options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>{label}</option>
        ))}
      </select>
    );
  } else if (field.type === 'textarea') {
    control = <textarea rows={2} {...common} />;
  } else {
    control = <input type={field.type ?? 'text'} required={field.required} {...common} />;
  }
  return (
    <div className={`cl-pd-field ${field.wide ? 'cl-pd-field--wide' : ''}`}>
      <label htmlFor={id}>{field.label}</label>
      {control}
    </div>
  );
}

export default function PatientProfile() {
  const queryClient = useQueryClient();
  const { user: authUser, setUserData } = useAuth();
  const profileQuery = usePatientProfile();
  const state = {
    status: profileQuery.isLoading ? 'loading' : profileQuery.isError ? 'error' : 'ready',
    profile: profileQuery.data,
    error: profileQuery.isError ? getErrorMessage(profileQuery.error) : '',
    needsLogin: profileQuery.isError && isUnauthorized(profileQuery.error),
  };
  const retry = () => profileQuery.refetch();
  const [form, setForm] = useState(null); // null = viewing, an object = editing
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const fileInput = useRef(null);

  function startEdit() {
    setNotice({ type: '', text: '' });
    setFormError('');
    setForm(toForm(state.profile));
  }

  const handleFieldChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSave(event) {
    event.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError('First name and last name are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const profile = await updateProfile(toPayload(form));
      queryClient.setQueryData(queryKeys.patients.profile, profile);
      // keep the name shown in the top bar / navbar up to date
      const names = Object.fromEntries(['first_name', 'last_name', 'full_name', 'phone'].filter((key) => profile?.[key] !== undefined).map((key) => [key, profile[key]]));
      setUserData({ ...authUser, ...names });
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
    event.target.value = ''; // lets the patient pick the same file again later
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
      const updatedUser = await uploadAvatar(file);
      queryClient.setQueryData(queryKeys.patients.profile, (prev) => ({ ...prev, avatar_url: updatedUser.avatar_url }));
      // the new photo appears everywhere (top bar, sidebar, navbar)
      setUserData({ ...authUser, ...updatedUser });
      setNotice({ type: 'ok', text: 'Your photo was updated.' });
    } catch (err) {
      setNotice({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setAvatarBusy(false);
    }
  }

  const { profile } = state;

  return (
    <>
      <Helmet>
        <title>My Profile | Clinika</title>
      </Helmet>

      <header className="cl-pd-page-head">
        <h1>My Profile</h1>
        <p className="cl-pd-muted">Keep your details up to date so your doctors can reach and help you.</p>
      </header>

      {state.status === 'loading' && <LoadingState label="Loading your profile…" />}

      {state.status === 'error' && (
        <ErrorState message={state.error} onRetry={retry} needsLogin={state.needsLogin} />
      )}

      {state.status === 'ready' && (
        <>
          {notice.text && (
            <div
              className={`cl-pd-notice ${notice.type === 'error' ? 'cl-pd-notice--error' : ''}`}
              role={notice.type === 'error' ? 'alert' : 'status'}
            >
              {notice.text}
            </div>
          )}

          <section className="cl-pd-card cl-pd-profile-head">
            <Avatar size="lg" src={profile.avatar_url} name={profile.full_name} />
            <div>
              <h2 className="cl-pd-profile-head__name">{profile.full_name}</h2>
              <p className="cl-pd-muted">JPG, PNG or WebP, up to {MAX_AVATAR_MB} MB.</p>
              <button
                type="button"
                className="cl-pd-btn"
                disabled={avatarBusy}
                onClick={() => fileInput.current?.click()}
              >
                {avatarBusy ? 'Uploading…' : 'Change photo'}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={handleAvatar}
              />
            </div>
          </section>

          <section className="cl-pd-card cl-pd-section-card" aria-labelledby="cl-pd-info-title">
            <div className="cl-pd-section__head">
              <h2 id="cl-pd-info-title">Personal information</h2>
              {!form && (
                <button type="button" className="cl-pd-btn" onClick={startEdit}>
                  Edit profile
                </button>
              )}
            </div>

            {form ? (
              <form className="cl-pd-form" onSubmit={handleSave}>
                {FIELDS.map((field) => (
                  <FieldInput key={field.key} field={field} value={form[field.key]} onChange={handleFieldChange} />
                ))}
                {formError && (
                  <p className="cl-pd-confirm__error cl-pd-field--wide" role="alert">{formError}</p>
                )}
                <div className="cl-pd-field--wide cl-pd-appt__actions">
                  <button type="button" className="cl-pd-btn" disabled={saving} onClick={() => setForm(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="cl-pd-btn cl-pd-btn--primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="cl-pd-info">
                {FIELDS.map((field) => (
                  <div key={field.key} className={field.wide ? 'cl-pd-field--wide' : ''}>
                    <dt>{field.label}</dt>
                    <dd>{displayValue(field, profile[field.key])}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <PasswordCard />
        </>
      )}
    </>
  );
}
