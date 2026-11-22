import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDoctorData, api, TOKEN_KEY, errMsg, drName, C, card, pill, btn } from './DoctorDashboard';

const inp = {
  width: '100%', boxSizing: 'border-box', backgroundColor: C.low,
  border: '1px solid transparent', outline: 'none', borderRadius: 12,
  padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: C.text,
};
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 };

const Field = ({ label, hint, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: C.muted }}>
    {label}
    {children}
    {hint && <span style={{ fontWeight: 400, color: C.outline }}>{hint}</span>}
  </label>
);

const Section = ({ icon, title, sub, msg, saving, onSave, label = 'Save Changes', children }) => (
  <div style={{ ...card, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.secondary, color: C.primary, display: 'grid', placeItems: 'center' }}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.muted }}>{sub}</div>
      </div>
    </div>
    {children}
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        style={btn(C.primary, '#fff', { padding: '10px 24px', opacity: saving ? 0.6 : 1, boxShadow: '0 4px 14px rgba(27,104,246,0.28)' })}
      >
        {saving ? 'Saving...' : label}
      </button>
      {msg && (
        <span style={{ fontSize: 13, fontWeight: 600, color: msg.ok ? '#15803d' : C.errText }}>
          <i className={`fa-solid ${msg.ok ? 'fa-circle-check' : 'fa-circle-exclamation'}`} /> {msg.text}
        </span>
      )}
    </div>
  </div>
);

export default function DashDoctProfile() {
  const { user, profile, setUser, setProfile, isGuestPreview, refresh } = useDoctorData();

  const baseAcc = useMemo(
    () => ({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      email: user?.email || '',
      current_password: '',
    }),
    [user]
  );

  const basePro = useMemo(
    () => ({
      title: profile?.title || '',
      room: profile?.room || '',
      bio: profile?.bio || '',
      years_of_experience: Number(profile?.years_of_experience) || 0,
      consultation_fee: Number(profile?.consultation_fee) || 0,
      languages: (profile?.languages || []).join(', '),
      focus_areas: (profile?.focus_areas || []).join(', '),
      accepting_new_patients: Boolean(profile?.accepting_new_patients),
      offers_online: Boolean(profile?.offers_online),
    }),
    [profile]
  );

  const [accDraft, setAccDraft] = useState(null);
  const [proDraft, setProDraft] = useState(null);
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({});

  const acc = accDraft ?? baseAcc;
  const pro = proDraft ?? basePro;
  const setAcc = (fn) => setAccDraft((p) => fn(p ?? baseAcc));
  const setPro = (fn) => setProDraft((p) => fn(p ?? basePro));

  const run = async (key, fn, okText, onFallback) => {
    setBusy(key);
    setMsg((m) => ({ ...m, [key]: null }));
    try {
      await fn();
      setMsg((m) => ({ ...m, [key]: { ok: true, text: okText } }));
    } catch (e) {
      if (onFallback) {
        onFallback();
        setMsg((m) => ({ ...m, [key]: { ok: true, text: `${okText} (${errMsg(e)})` } }));
      } else {
        setMsg((m) => ({ ...m, [key]: { ok: false, text: errMsg(e) } }));
      }
    } finally {
      setBusy('');
    }
  };

  const splitCsv = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

  const applyLocalAcc = () => {
    const full = [acc.first_name.trim(), acc.last_name.trim()].filter(Boolean).join(' ');
    setUser((prev) => ({
      ...prev,
      first_name: acc.first_name.trim(),
      last_name: acc.last_name.trim(),
      full_name: full ? drName(full) : prev?.full_name,
      phone: acc.phone.trim(),
      email: acc.email.trim(),
    }));
    setAccDraft(null);
  };

  const saveAcc = () =>
    run(
      'acc',
      async () => {
        if (isGuestPreview) {
          applyLocalAcc();
          return;
        }
        const data = {
          first_name: acc.first_name.trim(),
          last_name: acc.last_name.trim(),
          phone: acc.phone.trim() || null,
        };
        if (user && acc.email.trim().toLowerCase() !== (user.email || '').toLowerCase()) {
          data.email = acc.email.trim();
          data.current_password = acc.current_password;
        }
        await api.put('/auth/me', data);
        await refresh();
        setAccDraft(null);
      },
      'Account updated',
      applyLocalAcc
    );

  const applyLocalPro = () => {
    setProfile((prev) => ({
      ...prev,
      title: pro.title.trim(),
      room: pro.room.trim(),
      bio: pro.bio.trim(),
      years_of_experience: Number(pro.years_of_experience) || 0,
      consultation_fee: Number(pro.consultation_fee) || 0,
      languages: splitCsv(pro.languages),
      focus_areas: splitCsv(pro.focus_areas),
      accepting_new_patients: Boolean(pro.accepting_new_patients),
      offers_online: Boolean(pro.offers_online),
    }));
    setProDraft(null);
  };

  const savePro = () =>
    run(
      'pro',
      async () => {
        const docId = Number(profile?.id);
        if (isGuestPreview || !Number.isInteger(docId) || docId <= 0) {
          applyLocalPro();
          return;
        }
        await api.put(`/doctors/${docId}`, {
          title: pro.title.trim() || null,
          room: pro.room.trim() || null,
          bio: pro.bio.trim() || null,
          years_of_experience: Number(pro.years_of_experience) || 0,
          consultation_fee: Number(pro.consultation_fee) || 0,
          languages: splitCsv(pro.languages),
          focus_areas: splitCsv(pro.focus_areas),
          accepting_new_patients: Boolean(pro.accepting_new_patients),
          offers_online: Boolean(pro.offers_online),
        });
        await refresh();
        setProDraft(null);
      },
      'Professional details updated',
      applyLocalPro
    );

  const savePw = () =>
    run(
      'pw',
      async () => {
        if (pw.new_password.length < 8) throw new Error('New password must be at least 8 characters');
        if (pw.new_password !== pw.confirm) throw new Error('Passwords do not match');
        if (!isGuestPreview) {
          const r = await api.post('/auth/change-password', {
            current_password: pw.current_password,
            new_password: pw.new_password,
          });
          if (r.data?.access_token) localStorage.setItem(TOKEN_KEY, r.data.access_token);
        }
        setPw({ current_password: '', new_password: '', confirm: '' });
      },
      'Password changed'
    );

  const setField = (setter) => (k) => (e) =>
    setter((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const onAcc = setField(setAcc);
  const onPro = setField(setPro);
  const onPw = setField((fn) => setPw((p) => fn(p)));
  const emailChanged = user && acc.email.trim().toLowerCase() !== (user.email || '').toLowerCase();

  const displayDoctorName = drName(
    user?.full_name || [acc.first_name, acc.last_name].filter(Boolean).join(' ') || 'Dr. Nadia Mansour'
  );

  const readOnly = [
    ['Specialty', profile?.specialty?.name],
    ['License Number', profile?.license_number],
    ['Status', profile?.status],
    ['Clinics', (profile?.clinics?.length ? profile.clinics : profile?.clinic ? [profile.clinic] : []).map((c) => c.name).join(', ')],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 960 }}>
      <Helmet><title>My Profile | Clinika</title></Helmet>

      <div>
        <div style={{ fontSize: 12, color: C.muted }}>
          Doctor Dashboard <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />{' '}
          <b style={{ color: C.primary }}>My Profile</b>
        </div>
        <h1 style={{ fontSize: 40, lineHeight: '48px', fontWeight: 700, letterSpacing: '-0.025em', margin: '4px 0' }}>
          My Profile
        </h1>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
          Manage your account settings, contact info, and professional details.
        </p>
      </div>

      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, backgroundColor: C.secondary, color: C.primary,
            display: 'grid', placeItems: 'center', fontSize: 22,
          }}>
            <i className="fa-solid fa-user-doctor" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{displayDoctorName}</div>
            <div style={{ fontSize: 13, color: C.muted }}>
              {profile?.specialty?.name || 'Internal Medicine'} • {pro.title || 'Consultant Physician'}
            </div>
          </div>
        </div>
        <span style={pill(C.secondary, C.primary)}>
          <i className="fa-solid fa-shield-halved" /> {profile?.status || 'Active'}
        </span>
      </div>

      <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {readOnly.map(([k, v]) => (
          <div key={k} style={{ minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.outline, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
            <div style={{ fontSize: 14, fontWeight: 600, textTransform: k === 'Status' ? 'capitalize' : 'none' }}>{v || '—'}</div>
          </div>
        ))}
      </div>

      <Section icon="fa-user" title="Account Settings" sub="Your personal sign-in details." msg={msg.acc} saving={busy === 'acc'} onSave={saveAcc}>
        <div style={grid}>
          <Field label="First name"><input style={inp} value={acc.first_name} onChange={onAcc('first_name')} /></Field>
          <Field label="Last name"><input style={inp} value={acc.last_name} onChange={onAcc('last_name')} /></Field>
          <Field label="Phone"><input style={inp} value={acc.phone} onChange={onAcc('phone')} /></Field>
          <Field label="Email"><input style={inp} type="email" value={acc.email} onChange={onAcc('email')} /></Field>
          {emailChanged && (
            <Field label="Current password" hint="Required to change your email">
              <input style={inp} type="password" value={acc.current_password} onChange={onAcc('current_password')} />
            </Field>
          )}
        </div>
      </Section>

      <Section icon="fa-stethoscope" title="Professional Details" sub="Shown on your public profile." msg={msg.pro} saving={busy === 'pro'} onSave={savePro}>
        <div style={grid}>
          <Field label="Title"><input style={inp} value={pro.title} onChange={onPro('title')} /></Field>
          <Field label="Room"><input style={inp} value={pro.room} onChange={onPro('room')} /></Field>
          <Field label="Years of experience">
            <input style={inp} type="number" min="0" max="70" value={pro.years_of_experience} onChange={onPro('years_of_experience')} />
          </Field>
          <Field label="Consultation fee">
            <input style={inp} type="number" min="0" value={pro.consultation_fee} onChange={onPro('consultation_fee')} />
          </Field>
          <Field label="Languages" hint="Separate with commas">
            <input style={inp} value={pro.languages} onChange={onPro('languages')} />
          </Field>
          <Field label="Focus areas" hint="Separate with commas">
            <input style={inp} value={pro.focus_areas} onChange={onPro('focus_areas')} />
          </Field>
        </div>
        <Field label="Bio">
          <textarea style={{ ...inp, minHeight: 100, resize: 'vertical' }} value={pro.bio} onChange={onPro('bio')} />
        </Field>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={pro.accepting_new_patients} onChange={onPro('accepting_new_patients')} /> Accepting new patients
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={pro.offers_online} onChange={onPro('offers_online')} /> Offers online consultations
          </label>
        </div>
      </Section>

      <Section icon="fa-lock" title="Change Password" sub="Use at least 8 characters." msg={msg.pw} saving={busy === 'pw'} onSave={savePw} label="Update Password">
        <div style={grid}>
          <Field label="Current password">
            <input style={inp} type="password" value={pw.current_password} onChange={onPw('current_password')} />
          </Field>
          <Field label="New password">
            <input style={inp} type="password" value={pw.new_password} onChange={onPw('new_password')} />
          </Field>
          <Field label="Confirm new password">
            <input style={inp} type="password" value={pw.confirm} onChange={onPw('confirm')} />
          </Field>
        </div>
      </Section>
    </div>
  );
}