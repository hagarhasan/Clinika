import { useMemo, useState } from 'react';
import { useDoctorData, api, errMsg, drName, initials, C, card, btn } from './DoctorDashboard';

const joinList = (v) => (Array.isArray(v) ? v.join(', ') : v || '');
const splitList = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const toForm = (user, profile) => ({
  title: profile?.title || '',
  room: profile?.room || '',
  years_of_experience: profile?.years_of_experience ?? '',
  consultation_fee: profile?.consultation_fee ?? '',
  languages: joinList(profile?.languages),
  focus_areas: joinList(profile?.focus_areas),
  bio: profile?.bio || '',
  email: user?.email || '',
  phone: user?.phone || '',
});

export default function DashDoctProfile() {
  const { user, profile, loading, refresh } = useDoctorData();
  const base = useMemo(() => toForm(user, profile), [user, profile]);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const form = editing && draft ? draft : base;
  const setField = (key, val) => setDraft((p) => ({ ...(p ?? base), [key]: val }));

  const onSave = async (e) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const docId = Number(profile?.id);
      if (Number.isInteger(docId) && docId > 0) {
        const langs = splitList(form.languages);
        const areas = splitList(form.focus_areas);
        await api.put(`/doctors/${docId}`, {
          title: form.title.trim() || null,
          room: form.room.trim() || null,
          years_of_experience: form.years_of_experience === '' ? null : Number(form.years_of_experience),
          consultation_fee: form.consultation_fee === '' ? null : Number(form.consultation_fee),
          languages: langs.length ? langs : null,
          focus_areas: areas.length ? areas : null,
          bio: form.bio.trim() || null,
        });
      }
      await refresh();
      setEditing(false);
      setDraft(null);
      setMsg({ ok: true, text: 'Public profile updated successfully.' });
    } catch (err) {
      setMsg({ ok: false, text: errMsg(err) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={card}>Loading profile...</div>;

  const fullName = drName(user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Doctor');
  const specialty = profile?.specialty?.name || 'General Medicine';
  const clinicName = profile?.clinic?.name || profile?.clinic_name || 'Clinika Main Clinic';
  const licenseNo = profile?.license_number || '—';
  const statusText =
    profile?.status === 'approved'
      ? 'Approved & Verified'
      : profile?.status === 'rejected'
        ? 'Not Approved'
        : 'Waiting for admin approval';

  const inp = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: `1px solid ${C.border}`, fontSize: 14, color: C.text,
    backgroundColor: editing ? C.white : '#fbfcfd', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: C.muted, textTransform: 'uppercase' };

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: C.text }}>Account &amp; Profile</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>What patients see when they look at your profile.</p>
        </div>
        {!editing && (
          <button type="button" onClick={() => { setMsg(null); setDraft(base); setEditing(true); }} style={btn(C.primary, C.white)}>
            Edit Public Profile
          </button>
        )}
      </div>

      {msg && (
        <div style={{ ...card, padding: '12px 16px', backgroundColor: msg.ok ? '#ECFDF5' : C.errBg, color: msg.ok ? '#047857' : C.errText, fontSize: 13, fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      {/* Account Summary Card */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.primaryFixed, color: C.primary, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 16 }}>
            {initials(fullName) || 'DR'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: C.text }}>{fullName}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{specialty}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          <div>
            <div style={labelStyle}>EMAIL</div>
            <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{form.email || '—'}</div>
          </div>
          <div>
            <div style={labelStyle}>PHONE</div>
            <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{form.phone || '—'}</div>
          </div>
          <div>
            <div style={labelStyle}>SPECIALTY</div>
            <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{specialty}</div>
          </div>
          <div>
            <div style={labelStyle}>CLINIC</div>
            <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{clinicName}</div>
          </div>
          <div>
            <div style={labelStyle}>LICENSE NUMBER</div>
            <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{licenseNo}</div>
          </div>
          <div>
            <div style={labelStyle}>VERIFICATION</div>
            <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{statusText}</div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: C.muted, paddingTop: 4 }}>
          Name, email, specialty and license are managed by the Clinika team. Contact an admin to change them.
        </div>
      </div>

      {/* Public Profile Form */}
      <form onSubmit={onSave} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <strong style={{ fontSize: 17, color: C.text }}>Public profile</strong>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: C.text }}>
            Title
            <input type="text" disabled={!editing} value={form.title} onChange={(e) => setField('title', e.target.value)} style={inp} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: C.text }}>
            Room
            <input type="text" disabled={!editing} value={form.room} onChange={(e) => setField('room', e.target.value)} style={inp} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: C.text }}>
            Years of experience
            <input type="number" disabled={!editing} value={form.years_of_experience} onChange={(e) => setField('years_of_experience', e.target.value)} style={inp} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: C.text }}>
            Consultation fee (EGP)
            <input type="number" disabled={!editing} value={form.consultation_fee} onChange={(e) => setField('consultation_fee', e.target.value)} style={inp} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: C.text }}>
            Languages (separate with commas)
            <input type="text" disabled={!editing} value={form.languages} onChange={(e) => setField('languages', e.target.value)} style={inp} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: C.text }}>
            Focus areas (separate with commas)
            <input type="text" disabled={!editing} value={form.focus_areas} onChange={(e) => setField('focus_areas', e.target.value)} style={inp} />
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: C.text }}>
          About you
          <textarea rows={3} disabled={!editing} value={form.bio} onChange={(e) => setField('bio', e.target.value)} style={{ ...inp, resize: 'vertical' }} />
        </label>

        {editing && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => { setEditing(false); setDraft(null); setMsg(null); }} style={btn(C.low, C.text, { border: `1px solid ${C.border}` })}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={btn(C.primary, C.white)}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}