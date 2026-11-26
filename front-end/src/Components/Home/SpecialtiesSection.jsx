import { Link } from "react-router-dom";

export default function SpecialtiesSection() {
  return (
    <section className="home-specialties-wrapper">
      <div className="container">
        <div className="home-specialties-section">
          <div className="home-specialties-header">
            <div className="home-specialties-heading">
              <span className="home-section-label">CARE FOR EVERY PART OF YOU</span>
              <h2>A specialist for your next step.</h2>
              <p>
                From everyday wellness questions to specialized care pathways,
                explore verified practitioners across our integrated clinic network.
              </p>
            </div>

            <Link to="/doctors" className="home-view-specialties">
              View all specialties
              <span>→</span>
            </Link>
          </div>

          <div className="home-specialties-grid">
            {/* PRIMARY CARE */}
            <div className="home-specialty-card">
              <div className="home-specialty-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="5" width="16" height="15" rx="2" />
                  <path d="M9 3h6M12 9v6M9 12h6" />
                </svg>
              </div>
              <h3>Primary Care</h3>
              <p>
                Your first stop for routine health, physical exams,
                preventive checkups, and continuing wellness.
              </p>
            </div>

            {/* CARDIOLOGY */}
            <div className="home-specialty-card">
              <div className="home-specialty-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
                  <path d="M3.5 12h4l2-3 3 6 2-3h6" />
                </svg>
              </div>
              <h3>Cardiology</h3>
              <p>
                Comprehensive cardiovascular screening, blood pressure
                monitoring, and advanced heart health protocols.
              </p>
            </div>

            {/* DERMATOLOGY */}
            <div className="home-specialty-card">
              <div className="home-specialty-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 18h16" />
                  <path d="M6 18v-5l3-2 2 3 3-6 2 3 2-1v8" />
                  <path d="M8 6h.01M12 4h.01M17 8h.01" />
                </svg>
              </div>
              <h3>Dermatology</h3>
              <p>
                Focused consultations for skin, hair, and nail health
                with accredited board-certified dermatologists.
              </p>
            </div>

            {/* PEDIATRICS */}
            <div className="home-specialty-card">
              <div className="home-specialty-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="9" cy="9" r="1" />
                  <circle cx="15" cy="9" r="1" />
                  <path d="M8.5 14c1 2 2.2 3 3.5 3s2.5-1 3.5-3" />
                </svg>
              </div>
              <h3>Pediatrics</h3>
              <p>
                Gentle, expert care for infants, children, and young
                adolescents navigating every developmental milestone.
              </p>
            </div>

            {/* ORTHOPEDICS */}
            <div className="home-specialty-card">
              <div className="home-specialty-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3v5l-2 2v5l2 2v4" />
                  <path d="M16 3v5l2 2v5l-2 2v4" />
                  <path d="M8 8h8M8 16h8" />
                  <path d="M10 5h4M10 19h4" />
                </svg>
              </div>
              <h3>Orthopedics</h3>
              <p>
                Restore mobility with specialized care for joints,
                spinal wellness, sports recovery, and physical healing.
              </p>
            </div>

            {/* NEUROLOGY */}
            <div className="home-specialty-card">
              <div className="home-specialty-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a3 3 0 0 0-3 3 3 3 0 0 0-3 3 3 3 0 0 0 1 2.2A3.5 3.5 0 0 0 8 17a3 3 0 0 0 4 2.8V3Z" />
                  <path d="M12 3a3 3 0 0 1 3 3 3 3 0 0 1 3 3 3 3 0 0 1-1 2.2A3.5 3.5 0 0 1 16 17a3 3 0 0 1-4 2.8" />
                  <path d="M9 8h2M8 12h3M14 8h2M13 12h3" />
                </svg>
              </div>
              <h3>Neurology</h3>
              <p>
                Evidence-based consultations for neurological support,
                chronic headaches, sleep conditions, and nerve function.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
