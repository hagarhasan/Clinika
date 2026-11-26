
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatName } from "../../utils/format";

import {
  Stethoscope,
  BadgeCheck,
  Star,
  ShieldCheck,
  LockKeyhole,
  CalendarCheck,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Info,
  ArrowRight,
  ArrowLeft,
  UserRound,
} from "lucide-react";

import "./Login.css";



export default function Login() {
const [error, setError] = useState("");
  const { login } = useAuth();
  const { showToast } = useToast();
  const [role, setRole] = useState("patient");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  // Real login: the server checks the password and tells us the account role.
  // The role buttons above are only a hint - the account's own role decides the dashboard
  // (this is also how an admin signs in).
  
const handleLogin = async (e) => {
  e.preventDefault();
  setError("");
  setSubmitting(true);

  try {
    const user = await login({
      email: email.trim(),
      password,
      remember_me: rememberMe,
    });
    const actualRole = user?.role || "patient";

    // Validate selected tab vs account role (Admins can sign in from either tab)
    if (actualRole !== "admin") {
      if (role === "doctor" && actualRole !== "doctor") {
        setError(
          "This account is registered as a Patient. Please switch to the Patient tab to sign in."
        );
        setSubmitting(false);
        return;
      }
      if (role === "patient" && actualRole !== "patient") {
        setError(
          "This account is registered as a Doctor. Please switch to the Doctor tab to sign in."
        );
        setSubmitting(false);
        return;
      }
    }

    // Strip titles like DR., Dr., Doctor, Prof. from user name
    const rawName =
      user?.full_name ||
      `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
    const cleanName = formatName(rawName) || "Clinika User";
    showToast({ type: "success", title: "Welcome Back!", message: `Signed in successfully as ${cleanName}.` });

    navigate(
      actualRole === "patient"
        ? "/patient-dashboard"
        : actualRole === "doctor"
        ? "/doctor-dashboard"
        : "/admin-dashboard",
      { replace: true }
    );
  } catch (err) {
    if (err?.status === 0 || (!err?.status && err?.message?.includes("reach"))) {
      setError("Cannot reach the server. Check your connection and try again.");
      return;
    }
    if (err?.status === 401) {
      setError(err.message || "Invalid email or password.");
      return;
    }
    setError(err?.message || "Could not sign in. Please check your email and password.");
  } finally {
    setSubmitting(false);
  }
};


  const handleDemo = (selectedRole) => {
    setRole(selectedRole);

    if (selectedRole === "patient") {
      setEmail("patient@clinika.com");
      setPassword("Patient123");
    } else {
      setEmail("doctor@clinika.com");
      setPassword("Doctor123");
    }
  };

  return (
    <>
      <Helmet>
        <title>Login | Clinika</title>
      </Helmet>

      <main className="clinika-login container-fluid min-vh-100 d-flex flex-column">
        <div className="container-xxl flex-grow-1 d-flex flex-column">
          <div className="row align-items-center justify-content-center g-4 g-xl-5 flex-grow-1">

        {/* LEFT SIDE */}
        <section className="clinika-login-left col-12 col-lg-5">
          <Link to="/" className="clinika-back-home">
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>

          <div className="clinika-access-badge">
            <span className="clinika-badge-dot"></span>
            ENCRYPTED PORTAL ACCESS
          </div>

          <h1 className="clinika-main-heading">
            Your Health Journey,
            <span>Protected &amp; Seamless.</span>
          </h1>

          <p className="clinika-intro-text">
            Directly synchronize clinical consultations, access
            verified medical records, and coordinate specialized
            appointments with zero administrative friction.
          </p>

          {/* DOCTOR CARD */}
          <div className="clinika-doctor-card">
            <div className="clinika-doctor-top">
              <div className="clinika-doctor-avatar">
                <Stethoscope size={25} />
              </div>

              <div className="clinika-doctor-details">
                <h3>
                  Dr. Maya Lin, MD
                  <BadgeCheck
                    size={15}
                    className="clinika-verified-icon"
                  />
                </h3>

                <p>
                  Chief of Cardiology • St. Jude Medical
                </p>
              </div>

              <div className="clinika-rating">
                <Star size={12} fill="currentColor" />
                <span>4.9</span>
              </div>
            </div>

            <p className="clinika-doctor-quote">
              "Clinika has eliminated patient wait-times and
              automated our practice schedules completely.
              Confidential, transparent, and built with genuine care."
            </p>

            <div className="clinika-doctor-stats">
              <div>
                <ShieldCheck size={13} />
                <span>Identity Verified</span>
              </div>

              <div>
                <CalendarCheck size={13} />
                <span>1,420+ Visits Facilitated</span>
              </div>
            </div>
          </div>

          {/* SECURITY CARDS */}
          <div className="clinika-security-cards">
            <div className="clinika-security-card">
              <div className="clinika-security-icon">
                <LockKeyhole size={19} />
              </div>

              <div>
                <h4>Standard TLS</h4>
                <p>Encrypted connection</p>
              </div>
            </div>

            <div className="clinika-security-card">
              <div className="clinika-security-icon">
                <ShieldCheck size={19} />
              </div>

              <div>
                <h4>Account Protected</h4>
                <p>Privacy protected data</p>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="clinika-login-right col-12 col-lg-6">
          <div className="clinika-login-card card border-0 shadow-sm">

            {/* HEADER */}
            <div className="clinika-card-header">
              <div>
                <h2>Welcome Back</h2>

                <p>
                  Sign in to your Clinika account to manage
                  your appointments and health records.
                </p>
              </div>

              <span className="clinika-secure-badge">
                SECURE PORTAL
              </span>
            </div>

            {/* ROLE SELECTOR */}
            <div className="clinika-role-section">
              <p className="clinika-section-label">
                Select Account Role
              </p>

              <div className="clinika-role-switch">
                <button
                  type="button"
                  className={
                    role === "patient" ? "clinika-role-active btn" : "btn"
                  }
                  onClick={() => setRole("patient")}
                >
                  <UserRound size={14} />
                  Patient
                </button>

                <button
                  type="button"
                  className={
                    role === "doctor" ? "clinika-role-active btn" : "btn"
                  }
                  onClick={() => setRole("doctor")}
                >
                  <Stethoscope size={14} />
                  Doctor
                </button>
              </div>

              <div className="clinika-role-hint">
                <Info size={12} />

                <span>
                  {role === "patient"
                    ? "Patient mode: Book visits, check scheduled slots & prescriptions."
                    : "Doctor mode: Manage appointments, schedules & patient records."}
                </span>
              </div>
            </div>

            {/* FORM */}
            <form
              className="clinika-login-form"
              onSubmit={handleLogin}
            >
              {/* EMAIL */}
              <div className="clinika-field">
                <div className="clinika-field-header">
                  <label htmlFor="clinika-email">
                    Email Address
                  </label>

                  <span>Institutional or personal</span>
                </div>

                <div className="clinika-input-box input-group">
                  <span className="input-group-text">
                    <Mail size={17} />
                  </span>

                  <input
                    id="clinika-email"
                    className="form-control"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="clinika-field">
                <div className="clinika-field-header">
                  <label htmlFor="clinika-password">
                    Password
                  </label>

                  <Link to="/forget-password">
                    Forgot Password?
                  </Link>
                </div>

                <div className="clinika-input-box input-group">
                  <span className="input-group-text">
                    <KeyRound size={17} />
                  </span>

                  <input
                    id="clinika-password"
                    className="form-control"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your security password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <button
                    type="button"
                    className="clinika-password-button btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <>
                        <EyeOff size={15} />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye size={15} />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* REMEMBER ME */}
              <label className="clinika-remember form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />

                <span className="form-check-label">Remember this device for 30 days</span>
              </label>

              {error && (
                <p className="login-error alert alert-danger" role="alert">
                  {error}
                </p>
              )}

              {/* BUTTON */}
              <button
                type="submit"
                className="clinika-submit-button btn btn-primary"
                disabled={submitting}
              >
                <span>
                  {submitting ? "Signing in…" : "Sign In to Clinika"}
                </span>

                <ArrowRight size={17} />
              </button>
            </form>

            {/* DEMO */}
            <div className="clinika-demo-section">
              <span>Quick Fill:</span>

              <button
                type="button"
                onClick={() => handleDemo("patient")}
              >
                Patient Demo
              </button>

              <span className="clinika-demo-dot">•</span>

              <button
                type="button"
                onClick={() => handleDemo("doctor")}
              >
                Doctor Demo
              </button>
            </div>

            {/* REGISTER */}
            <div className="clinika-register">
              <span>Don't have a Clinika account?</span>

              <Link to="/register">
                Create an Account
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>

          </div>

        {/* PRIVACY NOTICE */}
        <div className="clinika-privacy-notice alert alert-light mb-3">
          <div className="clinika-privacy-icon">
            <ShieldCheck size={17} />
          </div>

          <div className="clinika-privacy-text">
            <strong>Zero diagnostic disclosure</strong>

            <span>
              Clinika solely administers patient scheduling,
              verified credential directory, and clinic coordination.
            </span>
          </div>

          <div className="clinika-privacy-links">
            <Link to="/privacy-policy">
              Privacy Notice
            </Link>

            <span>•</span>

            <Link to="/terms">
              Terms of Care
            </Link>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="clinika-login-footer">
          © 2025 Clinika Health, Inc.
          <span>•</span>

          <Link to="/privacy-policy">
            Privacy &amp; Terms
          </Link>
        </footer>
        </div>
      </main>
    </>
  );
}
