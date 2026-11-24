
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL, TOKEN_KEY } from "../../api/adminApi";
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

// Where each role lands after a successful login.
const HOME_BY_ROLE = {
  patient: "/patient-dashboard",
  doctor: "/doctor-dashboard",
  admin: "/admin-dashboard",
};

export default function Login() {
  const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
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
      const { data } = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: email.trim(),
        password,
        remember_me: rememberMe,
      });
      localStorage.setItem(TOKEN_KEY, data.access_token);
      navigate(HOME_BY_ROLE[data.user?.role] || "/", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        !err?.response
          ? "Cannot reach the server. Check your connection and try again."
          : typeof detail === "string"
          ? detail
          : "Could not sign in. Please check your email and password."
      );
    } finally {
      setSubmitting(false);
    }

   localStorage.setItem("token", token);
localStorage.setItem("role", role);

navigate(
  role === "patient"
    ? "/patient-dashboard"
    : role === "doctor"
    ? "/doctor-dashboard"
    : "/admin-dashboard"
);
  } catch (err) {
    setError(
      err.response?.data?.detail ||
      err.response?.data?.message ||
      "Login failed. Please check your email and password."
    );
  } finally {
    setLoading(false);
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

      <main className="clinika-login">

        {/* LEFT SIDE */}
        <section className="clinika-login-left">
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
                  <BadgeCheck size={15} className="clinika-verified-icon" />
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
        <section className="clinika-login-right">

          <div className="clinika-login-card">

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

              <label className="clinika-section-label">
                Select Account Role
              </label>

              <div className="clinika-role-switch">

                <button
                  type="button"
                  className={role === "patient" ? "clinika-role-active" : ""}
                  onClick={() => setRole("patient")}
                >
                  <UserRound size={14} />
                  Patient
                </button>

                <button
                  type="button"
                  className={role === "doctor" ? "clinika-role-active" : ""}
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

                <div className="clinika-input-box">
                  <Mail size={16} />

                  <input
                    id="clinika-email"
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

                <div className="clinika-input-box">
                  <KeyRound size={16} />

                  <input
                    id="clinika-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your security password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <button
                    type="button"
                    className="clinika-password-button"
                    onClick={() => setShowPassword(!showPassword)}
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
              <label className="clinika-remember">

                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />

                <span>Remember this device for 30 days</span>

              </label>

              {error && (
                <p role="alert" style={{ margin: "0 0 12px", color: "#b91c1c", fontSize: "14px", fontWeight: 500 }}>
                  {error}
                </p>
              )}

              {/* BUTTON */}
              <button
                type="submit"
                className="clinika-submit-button"
                disabled={submitting}
              >
                <span>{submitting ? "Signing in…" : "Sign In to Clinika"}</span>
                <ArrowRight size={17} />
              </button>

            </form>
{error && (
  <p className="login-error" role="alert">
    {error}
  </p>
)}
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

        {/* PRIVACY NOTICE */}
        <div className="clinika-privacy-notice">

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

      </main>
    </>
  );
}
