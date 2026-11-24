import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import api from '../../api';
import { 
  User, 
  Headset, 
  Mail, 
  Phone, 
  MapPin, 
  AlertTriangle,
  AlignLeft,
  ChevronDown,
  Send,
  Lock
} from 'lucide-react';
import './Contact.css';
import contactus from '../../assets/images/contact.png';

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General Inquiry");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setSuccess("");
    setError("");

    try {
      const response = await api.post("/contact", {
        name,
        email,
        subject,
        message,
      });

      setSuccess(
        response.data?.message ||
        "Thanks! We received your message and will get back to you soon."
      );

      setName("");
      setEmail("");
      setSubject("General Inquiry");
      setMessage("");
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : err.response?.data?.message ||
            "Failed to send your message. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact Us | Clinika</title>
      </Helmet>

      <div className="clinika-contact-page">
       

        {/* Main Header Section */}
        <div className="contact-main-container">
          <div className="contact-header-content">
            <div className="help-badge">
              <User size={14} /> WE'RE HERE TO HELP
            </div>
            <h2>Get in Touch</h2>
            <p>Have a question or need assistance with scheduling? Our dedicated clinical coordination team is here to support you every step of the way.</p>
          </div>

          {/* Grid Layout for Form and Left Card */}
          <div className="contact-grid-section">
            {/* Left Image / Card Box */}
          <div
  className="contact-left-card"
  style={{ backgroundImage: `url(${contactus})` }}
>
              <div className="left-card-floating-badge">
                <div className="headset-icon-box">
                  <Headset size={24} />
                </div>
                <div className="badge-text">
                  <div className="title-row">
                    <strong>Dedicated Care Desk</strong>
                    <span className="status-pill">Available</span>
                  </div>
                  <small>Typical response within 2–4 hours</small>
                </div>
                <div className="priority-side">
                  <span className="priority-label">PRIORITY DESK</span>
                  <span className="active-days">Sun–Thu Active</span>
                </div>
              </div>
            </div>

            {/* Right Form Box */}
            <div className="contact-right-form-card">
              <div className="form-card-header">
                <div>
                  <h2>Send a Message</h2>
                  <p>We’ll review your inquiry and reply via email or phone.</p>
                </div>
                <div className="envelope-icon-box">
                  <Mail size={18} />
                </div>
              </div>

         <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label>FULL NAME *</label>
                  <div className="input-with-icon">
                    <User size={16} className="field-icon" />
                    <input
  type="text"
  placeholder="e.g. Sarah Jenkins"
  value={name}
  onChange={(e) => setName(e.target.value)}
  required
/>
                  </div>
                </div>

                <div className="input-group">
                  <label>EMAIL ADDRESS *</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="field-icon" />
                    <input
  type="email"
  placeholder="e.g. sarah.j@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
/>
                  </div>
                </div>

                <div className="input-group">
                  <label>SUBJECT *</label>
                  <div className="select-with-icons">
                    <AlignLeft size={16} className="field-icon" />
                   <select
  value={subject}
  onChange={(e) => setSubject(e.target.value)}
  required
>
  <option value="General Inquiry">General Inquiry</option>
  <option value="Technical Support">Technical Support</option>
  <option value="Billing">Billing & Payments</option>
</select>
                    <ChevronDown size={14} className="select-arrow-icon" />
                  </div>
                </div>

                <div className="input-group">
                  <label>YOUR MESSAGE *</label>
                  <textarea
  rows="4"
  placeholder="How can our team help you today?"
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  required
></textarea>
                </div>

               <button
  type="submit"
  className="send-message-btn"
  disabled={loading}
>
  {loading ? "Sending..." : "Send Message"}
  <Send size={15} />
</button>
{success && (
  <p className="contact-success" role="status">
    {success}
  </p>
)}

{error && (
  <p className="contact-error" role="alert">
    {error}
  </p>
)}
                <div className="form-security-note">
                  <Lock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  <span>Encrypted & confidential • We protect your personal health information.</span>
                </div>
              </form>
            </div>
          </div>

          {/* Bottom Info Cards */}
          <div className="contact-info-cards-row">
            <div className="info-card-item">
              <div className="info-card-icon">
                <Mail size={18} />
              </div>
              <div>
                <span className="info-card-title">DIRECT EMAIL</span>
                <a href="mailto:support@clinika.example" className="info-card-value">support@clinika.example</a>
                <p className="info-card-desc">Responses typically within 2–4 business hours for ticketed requests.</p>
              </div>
            </div>

            <div className="info-card-item">
              <div className="info-card-icon">
                <Phone size={18} />
              </div>
              <div>
                <span className="info-card-title">PHONE HELPLINE</span>
                <a href="tel:+201000000000" className="info-card-value">+20 100 000 0000</a>
                <p className="info-card-desc">Toll-free patient, family & practitioner coordination desk.</p>
              </div>
            </div>

            <div className="info-card-item">
              <div className="info-card-icon">
                <MapPin size={18} />
              </div>
              <div>
                <span className="info-card-title">CLINIC HEADQUARTERS</span>
                <span className="info-card-value address-text">Building 42, Sector 1, North 90th Street</span>
                <p className="info-card-desc">New Cairo, Cairo Governorate, Egypt</p>
              </div>
            </div>
          </div>

          {/* Bottom Emergency Banner */}
          <div className="contact-emergency-footer-banner">
            <div className="emergency-banner-left">
              <AlertTriangle size={20} className="text-red" />
              <span><strong>Need immediate clinical triage?</strong> For medical emergencies, please dial your local emergency services or call our 24/7 priority line directly.</span>
            </div>
            <a href="#triage" className="call-helpline-link">Call 24/7 Helpline ➔</a>
          </div>
        </div>
      </div>
    </>
  );
}
