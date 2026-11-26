import { Link } from "react-router-dom";
import { CalendarDays, ArrowRight } from "lucide-react";

export default function BookingCtaSection() {
  const calendarSlots = [
    "09", "10", "11", "12", "13",
    "16", "17", "18", "19", "20"
  ];

  return (
    <section className="home-booking-cta-wrapper">
      <div className="container">
        <div className="home-booking-cta">
          {/* LEFT CONTENT */}
          <div className="home-booking-content">
            <span className="home-booking-eyebrow">MAKE TIME FOR WHAT MATTERS</span>

            <h2>
              Your next step toward care
              <br />
              starts here.
            </h2>

            <p>
              Find a doctor who fits your health needs. Choose a verified time
              that fits your life. We will help you bring it all together.
            </p>

            <div className="home-booking-buttons">
              <Link to="/doctors" className="home-booking-primary">
                Book Appointment
                <ArrowRight size={14} />
              </Link>

              <Link to="/doctors" className="home-booking-secondary">
                Find Doctors Nearby
              </Link>
            </div>

            <span className="home-booking-note">
              A little planning. A little peace of mind.
            </span>
          </div>

          {/* MINI CALENDAR */}
          <div className="home-booking-calendar">
            <div className="home-calendar-header">
              <strong>A day for you...</strong>
              <CalendarDays size={15} />
            </div>

            <div className="home-calendar-slots">
              {calendarSlots.map((time) => (
                <span
                  key={time}
                  className={time === "17" ? "active" : ""}
                >
                  {time}
                </span>
              ))}
            </div>

            <div className="home-calendar-confirmation">
              <span></span>
              Slot confirmed · 10:00 AM
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
