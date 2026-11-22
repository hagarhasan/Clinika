

import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  UserRound,
  Stethoscope,
  Mail,
  LockKeyhole,
  BadgeCheck,
  Eye,
  EyeOff,
  Star,
} from "lucide-react";

import "./Register.css";

export default function Register() {
  const [accountType, setAccountType] = useState("patient");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <>
      <Helmet>
        <title>Create Account | Clinika</title>
      </Helmet>

      <main className="register-page">

        {/* Back to Home */}
        <Link to="/" className="register-back-home">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        {/* Page Header */}
        <header className="register-header">

          <div className="register-header-content">

            <span className="register-badge">
              <ShieldCheck size={14} />
              SECURE HEALTHCARE ACCESS
            </span>

            <h1>Create Your Clinika Account</h1>

            <p>
              Join Clinika to manage your healthcare appointments
              easily and connect with certified practitioners.
            </p>

          </div>

          <div className="register-syndicate">

            <span className="syndicate-icon">
              <ShieldCheck size={23} />
            </span>

            <div>
              <strong>Egyptian Medical Syndicate</strong>
              <small>Verified Practitioners</small>
            </div>

          </div>

        </header>

        {/* Main Content */}
        <div className="register-layout">

          {/* LEFT SIDE */}
          <section className="register-left">

            {/* Account Type */}
            <div className="register-account-types">

              {/* Patient */}
              <button
                type="button"
                className={`register-type ${
                  accountType === "patient" ? "selected" : ""
                }`}
                onClick={() => setAccountType("patient")}
              >

                <span className="register-type-icon">
                  <UserRound size={22} />
                </span>

                <span className="register-type-content">

                  <strong>
                    Patient Account

                    {accountType === "patient" && (
                      <small className="active-label">
                        ACTIVE
                      </small>
                    )}
                  </strong>

                  <small>
                    Book visits &amp; view consultation schedules
                  </small>

                </span>

              </button>

              {/* Doctor */}
              <button
                type="button"
                className={`register-type ${
                  accountType === "doctor" ? "selected" : ""
                }`}
                onClick={() => setAccountType("doctor")}
              >

                <span className="register-type-icon">
                  <Stethoscope size={22} />
                </span>

                <span className="register-type-content">

                  <strong>
                    Doctor Account

                    {accountType === "doctor" && (
                      <small className="active-label">
                        ACTIVE
                      </small>
                    )}
                  </strong>

                  <small>
                    Join our verified medical network &amp; manage clinic slots
                  </small>

                </span>

              </button>

            </div>

            {/* Registration Form Card */}
            <div className="register-form-card">

              {/* Form Heading */}
              <div className="register-form-heading">

                <div>

                  <h2>
                    {accountType === "patient"
                      ? "Patient Details"
                      : "Doctor Details"}
                  </h2>

                  <p>
                    {accountType === "patient"
                      ? "Instant booking access with zero scheduling fees"
                      : "Create your verified practitioner account"}
                  </p>

                </div>

                <span className="register-shield">
                  <ShieldCheck size={22} />
                </span>

              </div>

              {/* Form */}
              <form className="register-form">

                {/* Full Name */}
                <div className="register-field">

                  <label htmlFor="register-name">
                    Full Legal Name <span>*</span>
                  </label>

                  <input
                    id="register-name"
                    type="text"
                    placeholder="e.g. Youssef Tarek El-Sayed"
                    required
                  />

                </div>

                {/* Email */}
                <div className="register-field">

                  <label htmlFor="register-email">
                    Email Address <span>*</span>
                  </label>

                  <div className="register-input-wrapper">
                    <Mail size={16} />

                    <input
                      id="register-email"
                      type="email"
                      placeholder="name@domain.com"
                      required
                    />
                  </div>

                </div>

                {/* Phone */}
                <div className="register-field">

                  <label htmlFor="register-phone">
                    Egyptian Mobile Number <span>*</span>
                  </label>

                  <div className="register-phone-input">

                    <span className="register-country-code">
                      EG +20
                    </span>

                    <input
                      id="register-phone"
                      type="tel"
                      placeholder="101 234 5678"
                      required
                    />

                  </div>

                  <small className="register-hint">
                    Standard 10-digit number (e.g. 10xxxxxxxx)
                  </small>

                </div>

                {/* Password */}
                <div className="register-field">

                  <label htmlFor="register-password">
                    Password <span>*</span>
                  </label>

                  <div className="register-password-input">

                    <LockKeyhole size={16} />

                    <input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters with numbers"
                      required
                      minLength={8}
                    />

                    <button
                      type="button"
                      className="register-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>

                  </div>

                  <div className="register-password-strength">
                    <span></span>
                  </div>

                  <small className="register-hint">
                    Too short
                  </small>

                </div>

                {/* Confirm Password */}
                <div className="register-field">

                  <label htmlFor="register-confirm">
                    Confirm Password <span>*</span>
                  </label>

                  <div className="register-password-input">

                    <LockKeyhole size={16} />

                    <input
                      id="register-confirm"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Re-enter your password"
                      required
                    />

                    <button
                      type="button"
                      className="register-password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>

                  </div>

                </div>

                {/* Terms */}
                <label className="register-terms">

                  <input
                    type="checkbox"
                    required
                  />

                  <span>
                    I agree to the{" "}
                    <Link to="/terms">
                      Terms of Service
                    </Link>
                    ,{" "}
                    <Link to="/privacy-policy">
                      Privacy Policy
                    </Link>
                    , and understand Clinika is a
                    non-diagnostic scheduling system.
                  </span>

                </label>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="register-submit"
                >

                  <span>
                    Create {accountType === "patient"
                      ? "Patient"
                      : "Doctor"} Account
                  </span>

                  <ArrowRight size={17} />

                </button>

              </form>

            </div>

            {/* Login Link */}
            <div className="register-login-prompt">

              <span>
                Already have a Clinika account?
              </span>

              <Link to="/login">
                Sign In to Patient or Doctor Portal
              </Link>

            </div>

          </section>

          {/* RIGHT SIDE */}
          <aside className="register-right">

            <div className="register-trust-card">

              {/* Trust Header */}
              <div className="register-trust-heading">

                <span>TRUST &amp; TRANSPARENCY</span>

                <strong>
                  <Star size={13} fill="currentColor" />
                  4.9/5.0
                </strong>

              </div>

              {/* Doctor Image */}
              <div className="register-doctor-image">

                <img
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=700"
                  alt="Female doctor in a medical clinic"
                />

                <div className="register-doctor-caption">

                  <strong>
                    Dr. Salma Mansour, MD
                  </strong>

                  <small>
                    Consultant Cardiologist · New Cairo
                  </small>

                </div>

                <span className="register-doctor-verified">
                  <BadgeCheck size={17} />
                </span>

              </div>

              {/* Benefit 1 */}
              <div className="register-benefit">

                <span className="benefit-icon">
                  <Mail size={18} />
                </span>

                <div>

                  <strong>
                    Email Appointment Confirmation
                  </strong>

                  <p>
                    Receive verified booking details and appointment
                    schedule directly to your email.
                  </p>

                </div>

              </div>

              {/* Benefit 2 */}
              <div className="register-benefit">

                <span className="benefit-icon">
                  <LockKeyhole size={18} />
                </span>

                <div>

                  <strong>
                    Protected Account Data
                  </strong>

                  <p>
                    Industry standard encryption for your credentials
                    and appointments.
                  </p>

                </div>

              </div>

              {/* Benefit 3 */}
              <div className="register-benefit register-benefit-highlight">

                <span className="benefit-icon">
                  <BadgeCheck size={18} />
                </span>

                <div>

                  <strong>
                    Certified Syndicate Practitioners
                  </strong>

                  <p>
                    Connecting patients with accredited medical
                    specialists across Egypt.
                  </p>

                </div>

              </div>

            </div>

          </aside>

        </div>

        {/* Footer */}
        <footer className="register-bottom">

          <span>
            © 2025 Clinika Health, Inc. All rights reserved.
          </span>

          <div>

            <Link to="/privacy-policy">
              Privacy Policy
            </Link>

            <span>•</span>

            <Link to="/terms">
              Terms of Service
            </Link>

            <span>•</span>

            <Link to="/contact">
              Support
            </Link>

          </div>

        </footer>

      </main>
    </>
  );
}
