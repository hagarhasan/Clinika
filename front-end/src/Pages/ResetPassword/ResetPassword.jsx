import { useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function ResetPassword() {
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  const token = paramToken || queryToken || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!token) {
      setStatus({
        type: 'danger',
        message: 'Invalid or missing reset token. Please request a new link from your email.',
      });
      return;
    }

    if (newPassword.length < 8) {
      setStatus({
        type: 'danger',
        message: 'Password must be at least 8 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({
        type: 'danger',
        message: 'Passwords do not match.',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to reset password.');
      }

      setStatus({
        type: 'success',
        message: 'Password reset successfully! Redirecting to login...',
      });
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setStatus({
        type: 'danger',
        message: err.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container min-vh-100 d-flex align-items-center justify-content-center py-5">
      <Helmet>
        <title>Reset Password | Clinika</title>
      </Helmet>
      <div className="card shadow-sm border-0 p-4 p-md-5" style={{ maxWidth: '440px', width: '100%', borderRadius: '1rem' }}>
        <div className="text-center mb-4">
          <Link to="/" className="cl-logo justify-content-center mb-3">
            <span className="cl-logo-mark">
              <i className="fa-solid fa-plus"></i>
            </span>
            Clinika
          </Link>
          <h2 className="h4 fw-bold mb-1">Reset Password</h2>
          <p className="text-muted small">Enter your new password below</p>
        </div>

        {!token && (
          <div className="alert alert-warning py-2 small mb-4" role="alert">
            <i className="fa-solid fa-triangle-exclamation me-2"></i>
            No token found in URL. Make sure you opened the complete link from your Gmail.
          </div>
        )}

        {status.message && (
          <div className={`alert alert-${status.type} py-2 small mb-4`} role="alert">
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold">New Password</label>
            <div className="input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
              >
                <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-semibold">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 fw-semibold"
            disabled={loading || !token}
            style={{ borderRadius: 'var(--cl-radius-btn, 0.75rem)' }}
          >
            {loading ? (
              <span>
                <i className="fa-solid fa-spinner fa-spin me-2"></i>Resetting...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/login" className="small text-decoration-none text-muted">
            <i className="fa-solid fa-arrow-left me-1"></i> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
