import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { sendContactMessage } from '../../api/publicApi';
import { useToast } from '../../context/ToastContext';
import { 
  User, 
  Headset, 
  Mail, 
  AlignLeft,
  ChevronDown,
  Send,
  Lock
} from 'lucide-react';
import './Contact.css';
import contactus from '../../assets/images/contact.png';
import { ContactEmergencyBanner, ContactInfoCards } from '../../Components/Contact/ContactInfoSections';

export default function Contact() {
  const { showToast } = useToast();
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
      const response = await sendContactMessage({
        name,
        email,
        subject,
        message,
      });

      setSuccess(
        response?.message ||
        "Thanks! We received your message and will get back to you soon."
      );
      showToast({ type: 'success', title: 'Message sent', message: 'Your message was sent successfully.' });

      setName("");
      setEmail("");
      setSubject("General Inquiry");
      setMessage("");
    } catch (err) {
      setError(err?.message || "Failed to send your message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact Us | Clinika</title>
      </Helmet>

      <section className="clinika-contact-page">
        <div className="container contact-main-container py-5">
          <header className="contact-header-content">
            <div className="help-badge">
              <User size={14} aria-hidden="true" />
              <span>WE&apos;RE HERE TO HELP</span>
            </div>
            <h1>Get in touch with Clinika</h1>
            <p>
              Have a question or need assistance with scheduling? Our clinical
              coordination team is here to support you every step of the way.
            </p>
          </header>

          <div className="contact-grid-section row g-4 align-items-stretch">
            <div className="col-12 col-lg-5">
              <div
                className="contact-left-card h-100"
                style={{ backgroundImage: `url(${contactus})` }}
              >
                <div className="contact-visual-copy">
                  <span className="contact-visual-tag">CLINIKA SUPPORT</span>
                  <h2>Care coordination, made simple.</h2>
                  <p>One helpful team for questions about appointments, clinics, and your Clinika account.</p>
                </div>

                <div className="left-card-floating-badge">
                  <div className="headset-icon-box">
                    <Headset size={23} />
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
            </div>

            <section className="contact-right-form-card card col-12 col-lg-7" aria-labelledby="contact-form-title">
              <div className="form-card-header">
                <div>
                  <span className="form-card-eyebrow">CONTACT OUR TEAM</span>
                  <h2 id="contact-form-title">Send us a message</h2>
                  <p>We&apos;ll review your inquiry and reply by email or phone.</p>
                </div>
                <div className="envelope-icon-box" aria-hidden="true">
                  <Mail size={19} />
                </div>
              </div>

              <form className="contact-form row g-3" onSubmit={handleSubmit}>
                <div className="contact-field col-md-6">
                  <label htmlFor="contact-name">Full name <span>*</span></label>
                  <div className="contact-input-group">
                    <User size={17} className="field-icon" aria-hidden="true" />
                    <input
                      id="contact-name"
                      className="form-control"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Sarah Jenkins"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="contact-field col-md-6">
                  <label htmlFor="contact-email">Email address <span>*</span></label>
                  <div className="contact-input-group">
                    <Mail size={17} className="field-icon" aria-hidden="true" />
                    <input
                      id="contact-email"
                      className="form-control"
                      type="email"
                      autoComplete="email"
                      placeholder="e.g. sarah.j@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="contact-field col-12">
                  <label htmlFor="contact-subject">Subject <span>*</span></label>
                  <div className="contact-input-group contact-select-group">
                    <AlignLeft size={17} className="field-icon" aria-hidden="true" />
                    <select
                      id="contact-subject"
                      className="form-select"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Technical Support">Technical Support</option>
                      <option value="Billing">Billing &amp; Payments</option>
                    </select>
                    <ChevronDown size={15} className="select-arrow-icon" aria-hidden="true" />
                  </div>
                </div>

                <div className="contact-field col-12">
                  <label htmlFor="contact-message">Your message <span>*</span></label>
                  <textarea
                    id="contact-message"
                    className="form-control"
                    rows="5"
                    placeholder="How can our team help you today?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <div className="col-12">
                  <button type="submit" className="send-message-btn btn btn-primary" disabled={loading}>
                    {loading ? "Sending..." : "Send message"}
                    <Send size={16} aria-hidden="true" />
                  </button>
                </div>

                {success && (
                  <div className="col-12">
                    <p className="contact-success alert alert-success" role="status">{success}</p>
                  </div>
                )}

                {error && (
                  <div className="col-12">
                    <p className="contact-error alert alert-danger" role="alert">{error}</p>
                  </div>
                )}

                <div className="form-security-note col-12">
                  <Lock size={14} aria-hidden="true" />
                  <span>Encrypted and confidential. We protect your personal information.</span>
                </div>
              </form>
            </section>
          </div>

          <ContactInfoCards />
          <ContactEmergencyBanner />
        </div>
      </section>
    </>
  );
}
