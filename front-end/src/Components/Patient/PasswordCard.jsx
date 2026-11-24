import { useState } from 'react';
import { changePassword } from '../../api/authApi';
import { getErrorMessage } from '../../api/client';

const EMPTY = { current: '', next: '', confirm: '' };

export default function PasswordCard() {
  const [values, setValues] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (key) => (event) => setValues((prev) => ({ ...prev, [key]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (values.next.length < 8) {
      setMessage({ type: 'error', text: 'The new password must be at least 8 characters.' });
      return;
    }
    if (values.next !== values.confirm) {
      setMessage({ type: 'error', text: 'The two new passwords do not match.' });
      return;
    }
    setBusy(true);
    setMessage({ type: '', text: '' });
    try {
      const data = await changePassword(values.current, values.next);
      // The server cancels the old token, so keep the new one or the patient is logged out.
      if (data.access_token) localStorage.setItem('token', data.access_token);
      setValues(EMPTY);
      setMessage({ type: 'ok', text: 'Your password was changed.' });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cl-pd-card cl-pd-section-card" aria-labelledby="cl-pd-pass-title">
      <h2 id="cl-pd-pass-title">Change password</h2>

      {message.text && (
        <div
          className={`cl-pd-notice ${message.type === 'error' ? 'cl-pd-notice--error' : ''}`}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      )}

      <form className="cl-pd-form" onSubmit={handleSubmit}>
        <div className="cl-pd-field cl-pd-field--wide">
          <label htmlFor="cl-pd-pass-current">Current password</label>
          <input
            id="cl-pd-pass-current"
            type="password"
            autoComplete="current-password"
            required
            value={values.current}
            onChange={handleChange('current')}
          />
        </div>
        <div className="cl-pd-field">
          <label htmlFor="cl-pd-pass-new">New password</label>
          <input
            id="cl-pd-pass-new"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            value={values.next}
            onChange={handleChange('next')}
          />
        </div>
        <div className="cl-pd-field">
          <label htmlFor="cl-pd-pass-confirm">Confirm new password</label>
          <input
            id="cl-pd-pass-confirm"
            type="password"
            autoComplete="new-password"
            maxLength={72}
            required
            value={values.confirm}
            onChange={handleChange('confirm')}
          />
        </div>
        <div className="cl-pd-field--wide">
          <button type="submit" className="cl-pd-btn cl-pd-btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </section>
  );
}
