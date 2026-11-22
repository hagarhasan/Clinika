import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useOutletContext } from 'react-router-dom';
import { api, TOKEN_KEY, errMsg, C, card, btn } from './DoctorDashboard';

const inp = { width: '100%', boxSizing: 'border-box', backgroundColor: C.low, border: '1px solid transparent', outline: 'none', borderRadius: 12, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: C.text };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 };

const Field = ({ label, hint, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: C.muted }}>
    {label}{children}{hint && <span style={{ fontWeight: 400, color: C.outline }}>{hint}</span>}
  </label>
);
const Section = ({ icon, title, sub, msg, saving, onSave, label = 'Save Changes', children }) => (
  <div style={{ ...card, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.secondary, color: C.primary, display: 'grid', placeItems: 'center' }}><i className={`fa-solid ${icon}`} /></div>
      <div><div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div><div style={{ fontSize: 13, color: C.muted }}>{sub}</div></div>
    </div>
    {children}
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <button disabled={saving} onClick={onSave} style={btn(C.primary, '#fff', { padding: '10px 24px', opacity: saving ? 0.6 : 1, boxShadow: '0 4px 14px rgba(27,104,246,0.28)' })}>{saving ? 'Saving...' : label}</button>
      {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.ok ? '#15803d' : C.errText }}><i className={`fa-solid ${msg.ok ? 'fa-circle-check' : 'fa-circle-exclamation'}`} /> {msg.text}</span>}
    </div>
  </div>
);

export default function DashDoctProfile() {
  const { user, profile, refresh } = useOutletContext();
  const [acc, setAcc] = useState({ first_name: '', last_name: '', phone: '', email: '', current_password: '' });
  const [pro, setPro] = useState({ title: '', room: '', bio: '', years_of_experience: 0, consultation_fee: 0, languages: '', focus_areas: '', accepting_new_patients: true, offers_online: false });
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({});

  useEffect(() => {
    if (user) setAcc({ first_name: user.first_name, last_name: user.last_name, phone: user.phone || '', email: user.email, current_password: '' });
  }, [user]);
  useEffect(() => {
    if (profile) setPro({ title: profile.title || '', room: profile.room || '', bio: profile.bio || '', years_of_experience: profile.years_of_experience, consultation_fee: profile.consultation_fee, languages: (profile.languages || []).join(', '), focus_areas: (profile.focus_areas || []).join(', '), accepting_new_patients: profile.accepting_new_patients, offers_online: profile.offers_online });
  }, [profile]);

  const run = async (key, fn, okText) => {
    setBusy(key); setMsg((m) => ({ ...m, [key]: null }));
    try { await fn(); setMsg((m) => ({ ...m, [key]: { ok: true, text: okText } })); }
    catch (e) { setMsg((m) => ({ ...m, [key]: { ok: false, text: errMsg(e) } })); }
    setBusy('');
  };
  const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

  const saveAcc = () => run('acc', async () => {
    const data = { first_name: acc.first_name.trim(), last_name: acc.last_name.trim(), phone: acc.phone.trim() || null };
    if (acc.email.trim().toLowerCase() !== user.email) { data.email = acc.email.trim(); data.current_password = acc.current_password; }
    await api.put('/auth/me', data);
    await refresh();
  }, 'Account updated');

  const savePro = () => run('pro', async () => {
    await api.put(`/doctors/${profile.id}`, {
      title: pro.title || null, room: pro.room || null, bio: pro.bio || null,
      years_of_experience: Number(pro.years_of_experience), consultation_fee: Number(pro.consultation_fee),
      languages: list(pro.languages), focus_areas: list(pro.focus_areas),
      accepting_new_patients: pro.accepting_new_patients, offers_online: pro.offers_online,
    });
    await refresh();
  }, 'Professional details updated');

  const savePw = () => run('pw', async () => {
    if (pw.new_password.length < 8) throw new Error('New password must be at least 8 characters');
    if (pw.new_password !== pw.confirm) throw new Error('Passwords do not match');
    const r = await api.post('/auth/change-password', { current_password: pw.current_password, new_password: pw.new_password });
    localStorage.setItem(TOKEN_KEY, r.data.access_token); // توكن جديد عشان الجلسة الحالية متتقفلش
    setPw({ current_password: '', new_password: '', confirm: '' });
  }, 'Password changed');

  const set = (setter) => (k) => (e) => setter((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const onAcc = set(setAcc), onPro = set(setPro), onPw = set(setPw);
  const emailChanged = user && acc.email.trim().toLowerCase() !== user.email;
  const readOnly = [['Specialty', profile?.specialty?.name], ['License Number', profile?.license_number], ['Status', profile?.status], ['Clinics', (profile?.clinics?.length ? profile.clinics : profile?.clinic ? [profile.clinic] : []).map((c) => c.name).join(', ')]];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 900 }}>
      <Helmet><title>My Profile | Clinika</title></Helmet>
      <div>
        <div style={{ fontSize: 12, color: C.muted }}>Doctor Dashboard <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} /> <b style={{ color: C.primary }}>My Profile</b></div>
        <h1 style={{ fontSize: 40, lineHeight: '48px', fontWeight: 700, letterSpacing: '-0.025em', margin: '4px 0' }}>My Profile</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Manage your account settings and professional details.</p>
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
          {emailChanged && <Field label="Current password" hint="Required to change your email"><input style={inp} type="password" value={acc.current_password} onChange={onAcc('current_password')} /></Field>}
        </div>
      </Section>

      <Section icon="fa-stethoscope" title="Professional Details" sub="Shown on your public profile." msg={msg.pro} saving={busy === 'pro'} onSave={savePro}>
        <div style={grid}>
          <Field label="Title"><input style={inp} value={pro.title} onChange={onPro('title')} /></Field>
          <Field label="Room"><input style={inp} value={pro.room} onChange={onPro('room')} /></Field>
          <Field label="Years of experience"><input style={inp} type="number" min="0" max="70" value={pro.years_of_experience} onChange={onPro('years_of_experience')} /></Field>
          <Field label="Consultation fee"><input style={inp} type="number" min="0" value={pro.consultation_fee} onChange={onPro('consultation_fee')} /></Field>
          <Field label="Languages" hint="Separate with commas"><input style={inp} value={pro.languages} onChange={onPro('languages')} /></Field>
          <Field label="Focus areas" hint="Separate with commas"><input style={inp} value={pro.focus_areas} onChange={onPro('focus_areas')} /></Field>
        </div>
        <Field label="Bio"><textarea style={{ ...inp, minHeight: 100, resize: 'vertical' }} value={pro.bio} onChange={onPro('bio')} /></Field>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14 }}>
          <label><input type="checkbox" checked={pro.accepting_new_patients} onChange={onPro('accepting_new_patients')} /> Accepting new patients</label>
          <label><input type="checkbox" checked={pro.offers_online} onChange={onPro('offers_online')} /> Offers online consultations</label>
        </div>
      </Section>

      <Section icon="fa-lock" title="Change Password" sub="Use at least 8 characters." msg={msg.pw} saving={busy === 'pw'} onSave={savePw} label="Update Password">
        <div style={grid}>
          <Field label="Current password"><input style={inp} type="password" value={pw.current_password} onChange={onPw('current_password')} /></Field>
          <Field label="New password"><input style={inp} type="password" value={pw.new_password} onChange={onPw('new_password')} /></Field>
          <Field label="Confirm new password"><input style={inp} type="password" value={pw.confirm} onChange={onPw('confirm')} /></Field>
        </div>
      </Section>
    </div>
  );
}
