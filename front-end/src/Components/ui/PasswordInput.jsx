import { useState } from 'react';

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder = 'Enter your password',
  error,
  required = false,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="cl-pd-field">
      {label && <label htmlFor={id}>{label}</label>}
      <div className="input-group">
        <input
          id={id}
          className="form-control"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {visible ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
      {error && <small className="text-danger">{error}</small>}
    </div>
  );
}
