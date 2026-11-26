import { AlertTriangle, Mail, MapPin, Phone } from "lucide-react";

export function ContactInfoCards() {
  return (
    <div className="contact-info-cards-row row g-3">
      <div className="col-md-6 col-xl-4">
        <article className="info-card-item h-100">
          <div className="info-card-icon" aria-hidden="true"><Mail size={19} /></div>
          <div>
            <span className="info-card-title">DIRECT EMAIL</span>
            <a href="mailto:support@clinika.example" className="info-card-value">support@clinika.example</a>
            <p className="info-card-desc">Responses typically within 2–4 business hours for ticketed requests.</p>
          </div>
        </article>
      </div>
      <div className="col-md-6 col-xl-4">
        <article className="info-card-item h-100">
          <div className="info-card-icon" aria-hidden="true"><Phone size={19} /></div>
          <div>
            <span className="info-card-title">PHONE HELPLINE</span>
            <a href="tel:+201000000000" className="info-card-value">+20 100 000 0000</a>
            <p className="info-card-desc">Toll-free patient, family &amp; practitioner coordination desk.</p>
          </div>
        </article>
      </div>
      <div className="col-md-12 col-xl-4">
        <article className="info-card-item h-100">
          <div className="info-card-icon" aria-hidden="true"><MapPin size={19} /></div>
          <div>
            <span className="info-card-title">CLINIC HEADQUARTERS</span>
            <span className="info-card-value address-text">Building 42, Sector 1, North 90th Street</span>
            <p className="info-card-desc">New Cairo, Cairo Governorate, Egypt</p>
          </div>
        </article>
      </div>
    </div>
  );
}

export function ContactEmergencyBanner() {
  return (
    <aside className="contact-emergency-footer-banner">
      <div className="emergency-banner-left">
        <AlertTriangle size={21} className="text-red" aria-hidden="true" />
        <span><strong>Need immediate clinical triage?</strong> For medical emergencies, please dial your local emergency services or call our 24/7 priority line directly.</span>
      </div>
      <a href="tel:+201000000000" className="call-helpline-link">Call 24/7 Helpline <span aria-hidden="true">→</span></a>
    </aside>
  );
}
