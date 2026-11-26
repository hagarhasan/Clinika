import { Link } from "react-router-dom";

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function HeroSection() {
  return (
    <section className="home-hero-wrapper">
      <div className="container">
        <div className="home-hero">
          <div className="home-hero-content">
            <div className="home-badge">
              <span className="home-badge-dot"></span>
              CARE THAT FITS YOUR LIFE
            </div>

            <h1>
              Find the Right Doctor
              <span>for Your Health</span>
            </h1>

            <p className="home-hero-description">
              Healthcare should feel accessible, not complicated. Find verified
              clinic specialists, view real availability, book appointments in
              seconds, and keep your care organized.
            </p>

            <div className="home-hero-buttons">
              <Link to="/doctors" className="home-primary-button">
                Find a Doctor
              </Link>

              <Link to="/doctors" className="home-secondary-button">
                Book Appointment
              </Link>
            </div>

            <div className="home-trust-message">
              <ShieldIcon />
              <span>
                A simpler, trusted way to schedule appointments across our
                certified medical network.
              </span>
            </div>
          </div>

          {/* HERO IMAGE */}
          <div className="home-hero-image-wrapper">
            <img
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=85"
              alt="Doctor providing healthcare"
              className="home-hero-image"
            />

            <div className="home-image-status">
              <span className="home-status-dot"></span>
              Built around you
            </div>

            <div className="home-image-card">
              <div className="home-image-card-icon">♡</div>
              <div>
                <h4>Care, made personal.</h4>
                <p>Your next chapter of wellness starts here.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
