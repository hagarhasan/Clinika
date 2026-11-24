
import { useState, useEffect } from 'react';
import {
  useParams,
  useSearchParams,
  Link,
  useNavigate
} from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './ResetPassword.css';
import { resetPassword, validateResetToken } from '../../api/authApi';

export default function ResetPassword() {
 
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();

  const queryToken = searchParams.get('token');
  const token = paramToken || queryToken || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({
    type: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const validateToken = async () => {
      if (!token) {
        setStatus({
          type: 'danger',
          message: 'Invalid or missing reset token.'
        });
        setTokenValid(false);
        setValidating(false);
        return;
      }

      try {
        await validateResetToken(token);

        if (active) {
          setTokenValid(true);
          setStatus({ type: '', message: '' });
        }
      } catch (err) {
        if (active) {
          setTokenValid(false);
          setStatus({
            type: 'danger',
            message:
              err.response?.data?.detail ||
              'This reset link is invalid or has expired.'
          });
        }
      } finally {
        if (active) {
          setValidating(false);
        }
      }
    };

    validateToken();

    return () => {
      active = false;
    };
  }, [token]);

  const requirements = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword)
  };

  const completedRequirements = Object.values(requirements).filter(Boolean).length;

  const getStrength = () => {
    if (!newPassword) return 'Weak';
    if (completedRequirements <= 1) return 'Weak';
    if (completedRequirements <= 3) return 'Medium';
    return 'Strong';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setStatus({ type: '', message: '' });

    if (!tokenValid || validating) {
      setStatus({
        type: 'danger',
        message: 'Please use a valid password reset link.'
      });
      return;
    }

    if (completedRequirements !== 4) {
      setStatus({
        type: 'danger',
        message: 'Please meet all password requirements.'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({
        type: 'danger',
        message: 'Passwords do not match.'
      });
      return;
    }

    setLoading(true);

    try {
      await resetPassword({
        token,
        new_password: newPassword
      });

      setStatus({
        type: 'success',
        message: 'Password reset successfully! Redirecting to login...'
      });

      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      setStatus({
        type: 'danger',
        message:
          err.response?.data?.detail ||
          err.response?.data?.message ||
          'Failed to reset password. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">

      <Helmet>
        <title>Reset Password | Clinika</title>
      </Helmet>

      <div className="reset-main">

        <div className="reset-card">

          <div className="reset-header">

            <div className="reset-icon-wrapper">
              <i className="fa-solid fa-clock-rotate-left"></i>
              <span className="reset-icon-badge">
                <i className="fa-solid fa-shield-halved"></i>
              </span>
            </div>

            <h2>Reset Your Password</h2>

            <p>
              Please enter and confirm your new password
              below to regain full access to your Clinika
              account.
            </p>

          </div>

          {status.message && (
            <div
              className={`reset-alert ${status.type}`}
              role="alert"
            >
              {status.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div className="reset-form-group">

              <label htmlFor="newPassword">
                New Password
              </label>

              <div className="reset-input-wrapper">

                <i className="fa-solid fa-lock input-lock"></i>

                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="reset-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>

              </div>

            </div>

            <div className="reset-form-group confirm-group">

              <label htmlFor="confirmPassword">
                Confirm New Password
              </label>

              <div className="reset-input-wrapper">

                <i className="fa-solid fa-lock input-lock"></i>

                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="reset-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>

              </div>

            </div>

            <div className="password-strength-box">

              <div className="strength-header">
                <span>Security strength</span>
                <span className={`strength-label ${getStrength().toLowerCase()}`}>
                  {getStrength()}
                </span>
              </div>

              <div className="strength-bars">
                {[1, 2, 3, 4].map((bar) => (
                  <span
                    key={bar}
                    className={bar <= completedRequirements ? 'active' : ''}
                  ></span>
                ))}
              </div>

              <div className="password-requirements">

                <div className={requirements.length ? 'requirement completed' : 'requirement'}>
                  <i className={`fa-regular ${requirements.length ? 'fa-circle-check' : 'fa-circle'}`}></i>
                  <span>8+ characters</span>
                </div>

                <div className={requirements.uppercase ? 'requirement completed' : 'requirement'}>
                  <i className={`fa-regular ${requirements.uppercase ? 'fa-circle-check' : 'fa-circle'}`}></i>
                  <span>1 uppercase letter</span>
                </div>

                <div className={requirements.number ? 'requirement completed' : 'requirement'}>
                  <i className={`fa-regular ${requirements.number ? 'fa-circle-check' : 'fa-circle'}`}></i>
                  <span>1 number included</span>
                </div>

                <div className={requirements.special ? 'requirement completed' : 'requirement'}>
                  <i className={`fa-regular ${requirements.special ? 'fa-circle-check' : 'fa-circle'}`}></i>
                  <span>1 special symbol</span>
                </div>

              </div>

            </div>

            <button
              type="submit"
              className="reset-submit-btn"
              disabled={loading || validating || !tokenValid}
            >
              {validating ? (
                'Validating Link...'
              ) : loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Resetting...
                </>
              ) : (
                <>
                  Reset Password
                  <i className="fa-solid fa-arrow-right"></i>
                </>
              )}
            </button>

          </form>

          <div className="reset-back-login">
            <Link to="/login">
              <i className="fa-solid fa-arrow-left"></i>
              Back to Login
            </Link>
          </div>

          <div className="reset-security-note">
            <i className="fa-solid fa-lock"></i>
            <p>
              All account credentials are protected by
              encrypted token protocols.
            </p>
          </div>

        </div>

        <div className="reset-support">
          Need assistance with verification?
          <a href="mailto:support@clinika.com">
            Contact Care Support
          </a>
        </div>

      </div>

      <footer className="reset-footer">
        © 2025 Clinika Health, Inc. • Healthcare & Clinic Care •
        <Link to="/privacy"> Privacy </Link>
        & 
        <Link to="/terms"> Terms</Link>
      </footer>

    </div>
  );
}
