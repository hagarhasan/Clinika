
import { Link } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="clinika-footer">

      {/* Emergency Helpline */}
      <div className="clinika-footer-emergency">
        <HeartPulse size={20} strokeWidth={2} />

        <span>
          24/7 Emergency Medical Helpline:{" "}
          <strong>1-800-CLINIKA (254-6452)</strong>
        </span>
      </div>

      {/* Main Footer */}
      <div className="clinika-footer-main">

        {/* Brand Section */}
        <div className="clinika-footer-brand">
          <Link to="/" className="clinika-footer-logo">
            <span className="footer-logo-text">Clinika</span>
          </Link>

          <p>
            Reliable medical appointment scheduling and healthcare
            practitioner discovery. Connecting you with verified
            specialists seamlessly.
          </p>
        </div>

        {/* Specialties */}
        <div className="clinika-footer-column">
          <h3>SPECIALTIES</h3>
          <Link to="/doctors">Cardiology</Link>
          <Link to="/doctors">Neurology</Link>
          <Link to="/doctors">Pediatrics</Link>
          <Link to="/doctors">Orthopedics</Link>
        </div>

        {/* Patients */}
        <div className="clinika-footer-column">
          <h3>FOR PATIENTS</h3>
          <Link to="/doctors">Search Doctors</Link>
          <Link to="/doctors">Schedule Visit</Link>
          <Link to="/contact">Clinic Locations</Link>
          <Link to="/contact">Patient Support</Link>
        </div>

        {/* Legal */}
        <div className="clinika-footer-column">
          <h3>LEGAL & INFO</h3>
          <Link to="/doctors">For Doctors</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/accessibility">Accessibility</Link>
        </div>

      </div>

      {/* Bottom Footer */}
      <div className="clinika-footer-bottom">
        <p>
          © 2025 Clinika Health, Inc. All rights reserved.
          Non-diagnostic booking platform.
        </p>

        <div className="clinika-footer-bottom-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/accessibility">Accessibility</Link>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
