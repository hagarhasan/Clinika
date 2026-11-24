import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PasswordCard from '../../Components/Patient/PasswordCard';
import { getInitials } from '../../Components/Patient/dateFormat';
import '../PatientDashboard/patient-dashboard.css';
import '../PatientDashboard/patient-profile.css';
import { useDoctorData, errMsg, drName } from './DoctorDashboard';
import { uploadAvatar } from '../../api/uploadsApi';
import { updateMe } from '../../api/authApi';
import { updateDoctor } from '../../api/doctorsApi';

const MAX_AVATAR_MB = 3;

export default function DashDoctProfile() {
  const { user, profile, loading, refresh } = useDoctorData();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [draft, setDraft] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    if (profile) {
      setDraft({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        gender: profile.gender || '',
        title: profile.title || '',
        room: profile.room || '',
        years_of_experience: profile.years_of_experience ?? '',
        consultation_fee: profile.consultation_fee ?? '',
        slot_duration_minutes: profile.slot_duration_minutes ?? 30,
        languages: (profile.languages || []).join(', '),
        focus_areas: (profile.focus_areas || []).join(', '),
        bio: profile.bio || '',
        accepting_new_patients: Boolean(profile.accepting_new_patients),
        offers_online: Boolean(profile.offers_online),
      });
    }
  }, [profile]);

  if (loading || !profile) return <div className="cl-pd-card">Loading profile...</div>;

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const fullName = drName(profile.full_name || user?.full_name || 'Doctor');
  const specialty = profile.specialty?.name || 'General Medicine';

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
      await uploadAvatar(file);
      await refresh();
      setNotice({ type: 'ok', text: 'Your photo was updated.' });
    } catch (err) {
      setNotice({ type: 'error', text: errMsg(err) });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setNotice({ type: '', text: '' });
    try {
      await updateMe({
        first_name: draft.first_name.trim(),
        last_name: draft.last_name.trim(),
        phone: draft.phone.trim() || null,
      });
      await updateDoctor(profile.id, {
        gender: draft.gender || null,
        title: draft.title.trim() || null,
        room: draft.room.trim() || null,
        years_of_experience: draft.years_of_experience === '' ? null : Number(draft.years_of_experience),
        consultation_fee: draft.consultation_fee === '' ? null : Number(draft.consultation_fee),
        slot_duration_minutes: Number(draft.slot_duration_minutes),
        languages: draft.languages.split(',').map((v) => v.trim()).filter(Boolean),
        focus_areas: draft.focus_areas.split(',').map((v) => v.trim()).filter(Boolean),
        bio: draft.bio.trim() || null,
        accepting_new_patients: draft.accepting_new_patients,
        offers_online: draft.offers_online,
      });
      await refresh();
      setEditing(false);
      setNotice({ type: 'ok', text: 'Your profile was updated.' });
    } catch (err) {
      setNotice({ type: 'error', text: errMsg(err) });
    } finally {
      setSaving(false);
    }
  }

  const viewRows = [
    ['Email', profile.email || '—'],
    ['Phone', profile.phone || '—'],
    ['Specialty', specialty],
    ['Clinic', profile.clinic?.name || '—'],
    ['License number', profile.license_number || '—'],
    ['Verification', profile.status === 'approved' ? 'Approved & verified' : profile.status || 'Pending'],
  ];

  return (
    <>
      <Helmet><title>My Profile | Clinika Doctor</title></Helmet>
      <header className="cl-pd-page-head">
        <h1>My Profile</h1>
        <p className="cl-pd-muted">Manage your account and the public doctor profile patients see.</p>
      </header>

      {notice.text && (
        <div className={`cl-pd-notice ${notice.type === 'error' ? 'cl-pd-notice--error' : ''}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      )}

      <section className="cl-pd-card cl-pd-profile-head">
        {profile.photo_url ? (
          <img className="cl-pd-avatar cl-pd-avatar--lg" src={profile.photo_url} alt="" />
        ) : (
          <span className="cl-pd-avatar cl-pd-avatar--lg" aria-hidden="true">{getInitials(fullName)}</span>
        )}
        <div>
          <h2 className="cl-pd-profile-head__name">{fullName}</h2>
          <p className="cl-pd-muted">{specialty} - JPG, PNG or WebP, up to {MAX_AVATAR_MB} MB.</p>
          <button type="button" className="cl-pd-btn" disabled={avatarBusy} onClick={() => fileInput.current?.click()}>
            {avatarBusy ? 'Uploading...' : 'Change photo'}
          </button>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleAvatar} />
        </div>
      </section>

      <section className="cl-pd-card cl-pd-section-card">
        <div className="cl-pd-section__head">
          <h2>Account information</h2>
          {!editing && <button type="button" className="cl-pd-btn" onClick={() => setEditing(true)}>Edit profile</button>}
        </div>

        {editing ? (
          <form className="cl-pd-form" onSubmit={handleSave}>
            {[
              ['first_name', 'First name', 'text'],
              ['last_name', 'Last name', 'text'],
              ['phone', 'Phone', 'tel'],
              ['title', 'Title', 'text'],
              ['room', 'Room', 'text'],
              ['years_of_experience', 'Years of experience', 'number'],
              ['consultation_fee', 'Consultation fee (EGP)', 'number'],
              ['slot_duration_minutes', 'Slot duration (minutes)', 'number'],
              ['languages', 'Languages (comma separated)', 'text'],
              ['focus_areas', 'Focus areas (comma separated)', 'text'],
            ].map(([key, label, type]) => (
              <div className="cl-pd-field" key={key}>
                <label htmlFor={`doctor-${key}`}>{label}</label>
                <input
                  id={`doctor-${key}`}
                  type={type}
                  required={key === 'first_name' || key === 'last_name'}
                  value={draft[key]}
                  onChange={(event) => setField(key, event.target.value)}
                />
              </div>
            ))}
            <div className="cl-pd-field">
              <label htmlFor="doctor-gender">Gender</label>
              <select id="doctor-gender" value={draft.gender} onChange={(event) => setField('gender', event.target.value)}>
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="cl-pd-field cl-pd-field--wide">
              <label htmlFor="doctor-bio">About you</label>
              <textarea id="doctor-bio" rows={3} value={draft.bio} onChange={(event) => setField('bio', event.target.value)} />
            </div>
            <label className="cl-pd-field">
              <span>Availability settings</span>
              <span style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <label><input type="checkbox" checked={draft.accepting_new_patients} onChange={(event) => setField('accepting_new_patients', event.target.checked)} /> Accepting new patients</label>
                <label><input type="checkbox" checked={draft.offers_online} onChange={(event) => setField('offers_online', event.target.checked)} /> Offers online visits</label>
              </span>
            </label>
            <div className="cl-pd-field--wide cl-pd-appt__actions">
              <button type="button" className="cl-pd-btn" disabled={saving} onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className="cl-pd-btn cl-pd-btn--primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
            </div>
          </form>
        ) : (
          <dl className="cl-pd-info">
            {viewRows.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
            <div><dt>Languages</dt><dd>{profile.languages?.join(', ') || '—'}</dd></div>
            <div><dt>Focus areas</dt><dd>{profile.focus_areas?.join(', ') || '—'}</dd></div>
            <div><dt>Accepting patients</dt><dd>{profile.accepting_new_patients ? 'Yes' : 'No'}</dd></div>
            <div><dt>Online visits</dt><dd>{profile.offers_online ? 'Available' : 'Not available'}</dd></div>
            <div className="cl-pd-field--wide"><dt>About</dt><dd>{profile.bio || '—'}</dd></div>
            <div className="cl-pd-field--wide">
              <dt>Credentials</dt>
              <dd>
                {profile.credentials?.length
                  ? profile.credentials.map((item) => `${item.title}${item.institution ? ` - ${item.institution}` : ''}${item.year ? ` (${item.year})` : ''}`).join(' • ')
                  : '—'}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <PasswordCard />
    </>
  );
}
