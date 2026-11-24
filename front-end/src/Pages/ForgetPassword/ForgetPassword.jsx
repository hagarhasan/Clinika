
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import './ForgetPassword.css';
import api from '../../api';
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11a9 9 0 1 1 2.6 6.4" />
      <path d="M3 4v7h7" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 14v-3a8 8 0 0 1 16 0v3" />
      <path d="M4 13H3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h3v-6H4Z" />
      <path d="M20 13h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-3v-6h2Z" />
      <path d="M12 17h2" />
    </svg>
  );
}

export default function ForgetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

 const handleSubmit = async (e) => {
  e.preventDefault();

  setLoading(true);
  setMessage('');
  setError('');

  try {
    await api.post('/auth/forgot-password', {
      email,
    });

    setMessage(
      'If an account exists with this email, a password reset link has been sent.'
    );
  } catch (err) {
    setError(
      err.response?.data?.detail ||
      err.response?.data?.message ||
      'Failed to send reset link. Please try again.'
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <Helmet>
        <title>Forget Password | Clinika</title>
      </Helmet>

      <div className="forget-page">

        <main className="forget-main">

          {/* Back Button */}
          <Link to="/login" className="page-back-link">
            <span>←</span>
            Back to Login
          </Link>

          {/* Left Column */}
          <aside className="forget-sidebar">

            <section className="security-card">

              <div className="security-heading">
                <div className="small-icon">
                  <ShieldIcon />
                </div>

                <div>
                  <span className="eyebrow">SECURITY PROTOCOL</span>
                  <h3>HIPAA-Compliant Access</h3>
                </div>
              </div>

              <p className="security-description">
                Clinika adheres to strict federal patient privacy mandates.
                Your authentication credentials, appointment histories, and
                records are protected by multi-tier encryption.
              </p>

              <div className="reassurance-box">
                <span className="info-icon">ⓘ</span>
                <p>
                  <strong>Reassurance Policy:</strong> For patient safety,
                  our portal does not reveal whether a submitted email
                  address corresponds to an active account. If verified,
                  instructions will be delivered immediately.
                </p>
              </div>

              <h4 className="timeline-title">RECOVERY TIMELINE</h4>

              <div className="timeline">

                <div className="timeline-item">
                  <span className="timeline-number active">01</span>
                  <div>
                    <h4>Submit Email</h4>
                    <p>Provide your registered contact profile</p>
                  </div>
                </div>

                <div className="timeline-item">
                  <span className="timeline-number">02</span>
                  <div>
                    <h4>15-Minute Magic Link</h4>
                    <p>Single-use cryptographically signed URL</p>
                  </div>
                </div>

                <div className="timeline-item">
                  <span className="timeline-number">03</span>
                  <div>
                    <h4>Instant Account Access</h4>
                    <p>Set password &amp; return to consultations</p>
                  </div>
                </div>

              </div>
            </section>

            {/* Support Card */}
            <section className="support-card">

              <div className="support-icon">
                <SupportIcon />
              </div>

              <div className="support-text">
                <h4>Immediate Assistance?</h4>
                <p>Live clinical coordinators are on standby</p>
              </div>

              <a href="tel:+10000000000" className="call-desk">
                Call Desk
              </a>

            </section>

          </aside>

          {/* Right Column */}
          <section className="forget-content">

            <div className="reset-card">

              <div className="reset-heading">

                <div className="reset-icon">
                  <ResetIcon />
                </div>

                <div>
                  <span className="portal-label">
                    <span></span>
                    PATIENT PORTAL RECOVERY
                  </span>

                  <h1>Forgot Your Password?</h1>
                </div>

              </div>

              <p className="reset-description">
                Enter the email address associated with your Clinika account.
                We'll send you a secure, time-sensitive verification link to
                reset your credentials.
              </p>

              <form onSubmit={handleSubmit}>

                <div className="email-label-row">
                  <label htmlFor="registered-email">
                    Registered Email Address
                  </label>

                  <span>Required for account lookup</span>
                </div>

                <div className="email-input-wrapper">

                  <svg viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.7">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>

                  <input
                    id="registered-email"
                    type="email"
                    name="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                </div>

                <p className="email-hint">
                  If you have secondary hospital charts or guardian links,
                  use the primary account holder's contact address.
                </p>

                <button
                  type="submit"
                  className="reset-button"
                  disabled={loading}
                >

                  <svg viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 5h12v10H4z" />
                    <path d="m4 6 6 5 6-5" />
                    <path d="M15 17h5m-2-2 2 2-2 2" />
                  </svg>

                  {loading
                    ? 'Sending...'
                    : 'Send Password Reset Link'}

                </button>

                {/* Success Message */}
                {message && (
                 <p className="success-message" role="status">
  {message}
</p>
                )}

                {/* Error Message */}
                {error && (
                 <p className="error-message" role="alert">
  {error}
</p>
                )}

              </form>

              {/* Create Account */}
              <div className="reset-footer">
                <div className="create-account">
                  <span>Need a new record?</span>
                  <Link to="/register">Create Patient Account</Link>
                </div>
              </div>

            </div>

            {/* Privacy Notice */}
            <div className="privacy-notice">
              <ShieldIcon />

              <p>
                Zero-knowledge email masking is active. For patient security,
                password resetting terminates all other active concurrent web
                and mobile telehealth sessions.
              </p>
            </div>

          </section>

        </main>

        {/* Bottom Footer */}
        <footer className="forget-bottom-footer">

          <span>© 2025 Clinika Health, Inc. All rights reserved.</span>

          <div>
            <Link to="/privacy">Privacy</Link>
            <span>•</span>
            <Link to="/terms">Terms</Link>
            <span>•</span>
            <a href="/hipaa-notice">HIPAA Notice</a>
          </div>

        </footer>

      </div>
    </>
  );
}
