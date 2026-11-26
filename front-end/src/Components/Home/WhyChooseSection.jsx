import { Link } from "react-router-dom";
import {
  ClipboardList,
  CalendarCheck,
  CalendarDays,
  FileText,
  LockKeyhole,
  ArrowRight,
} from "lucide-react";
import aboutImage from "../../assets/images/about.png";

export default function WhyChooseSection() {
  return (
    <section className="home-why-wrapper">
      <div className="container">
        <div className="home-why-section">
          {/* IMAGE SIDE */}
          <div className="home-why-image-wrapper">
            <img
              src={aboutImage}
              alt="Doctor helping a patient with her appointment"
              className="home-why-image"
            />
            <div className="home-why-image-card">
              <div className="home-why-image-icon">
                <ClipboardList size={18} />
              </div>
              <div>
                <h4>Less juggling. More clarity.</h4>
                <p>Your appointment and visit details organized in one private hub.</p>
              </div>
            </div>
          </div>

          {/* CONTENT SIDE */}
          <div className="home-why-content">
            <span className="home-section-eyebrow">WHY CHOOSE CLINIKA</span>
            <h2>
              Care is personal.
              <br />
              Booking should be simple.
            </h2>
            <p className="home-why-description">
              We connect the moving parts of healthcare to your next doctor visit
              feels like a seamless step forward — not another administrative task
              to manage.
            </p>

            {/* FEATURES */}
            <div className="home-why-features">
              <div className="home-why-feature">
                <div className="home-why-feature-icon">
                  <CalendarCheck size={16} />
                </div>
                <div>
                  <h3>Easy booking</h3>
                  <p>
                    A clear path from finding a doctor to confirming a real-time
                    visit in moments.
                  </p>
                </div>
              </div>

              <div className="home-why-feature">
                <div className="home-why-feature-icon">
                  <CalendarDays size={16} />
                </div>
                <div>
                  <h3>Convenient scheduling</h3>
                  <p>
                    Explore available appointment times around your personal schedule.
                  </p>
                </div>
              </div>

              <div className="home-why-feature">
                <div className="home-why-feature-icon">
                  <FileText size={16} />
                </div>
                <div>
                  <h3>Organized records</h3>
                  <p>
                    Keep appointments, visits, doctor contact info, and past details
                    safely at hand.
                  </p>
                </div>
              </div>

              <div className="home-why-feature">
                <div className="home-why-feature-icon">
                  <LockKeyhole size={16} />
                </div>
                <div>
                  <h3>Secure access</h3>
                  <p>
                    HIPAA-compliant, high-standard data encryption for all patient bookings.
                  </p>
                </div>
              </div>
            </div>

            <Link to="/about" className="home-why-link">
              Get to know Clinika
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
