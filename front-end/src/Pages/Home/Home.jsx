import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import "./Home.css";
import {
  Star,
  Search,
  CalendarDays,
   CircleCheck,
  ClipboardList,
  CalendarCheck,
  FileText,
  ArrowRight,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import aboutImage from "../../assets/images/about.png";
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function MedicalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 3h6v3h3a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h3V3Z" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Clinika | Find the Right Doctor</title>
        <meta
          name="description"
          content="Find verified doctors, explore clinics and book your healthcare appointment with Clinika."
        />
      </Helmet>

      <main className="home-page" >

        {/* HERO SECTION */}
        <section className="home-hero">

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

              <div className="home-image-card-icon">
                ♡
              </div>

              <div>
                <h4>Care, made personal.</h4>
                <p>Your next chapter of wellness starts here.</p>
              </div>

            </div>

          </div>

        </section>


        {/* SEARCH SECTION */}
        <section className="home-search-section">

          <div className="home-search-header">

            <h2>The right care starts with a search.</h2>

            <span>
              Search by doctor, specialty, or clinic location
            </span>

          </div>


          <div className="home-search-form">

            {/* SPECIALTY */}
            <div className="home-search-field">

              <div className="home-search-icon">
                <MedicalIcon />
              </div>

              <div className="home-search-input-wrapper">
                <label htmlFor="home-specialty">
                  Doctor or specialty
                </label>

                <input
                  type="text"
                  id="home-specialty"
                  placeholder="e.g. Primary Care, Cardiology"
                />
              </div>

            </div>


            {/* LOCATION */}
            <div className="home-search-field">

              <div className="home-search-icon">
                <LocationIcon />
              </div>

              <div className="home-search-input-wrapper">
                <label htmlFor="home-location">
                  Location or Zip
                </label>

                <input
                  type="text"
                  id="home-location"
                  placeholder="City, State or ZIP"
                />
              </div>

            </div>


            {/* DATE */}
            <div className="home-search-field home-date-field">

              <div className="home-search-icon">
                <CalendarIcon />
              </div>

              <div className="home-search-input-wrapper">
                <label htmlFor="home-date">
                  Appointment date
                </label>

                <input
                  type="date"
                  id="home-date"
                />
              </div>

            </div>


            {/* SEARCH BUTTON */}
            <Link to="/doctors" className="home-search-button">
              <SearchIcon />
              Search
            </Link>

          </div>


          {/* FEATURES */}
          <div className="home-search-features">

            <div className="home-feature">
              <div className="home-feature-icon">
                <ShieldIcon />
              </div>

              <span>Verified credentials</span>
            </div>


            <div className="home-feature">
              <div className="home-feature-icon">
                <span>ϟ</span>
              </div>

              <span>Instant confirmation</span>
            </div>


            <div className="home-feature">
              <div className="home-feature-icon">
                <MedicalIcon />
              </div>

              <span>Organized records</span>
            </div>


            <div className="home-feature">
              <div className="home-feature-icon">
                <ShieldIcon />
              </div>

              <span>Strictly confidential</span>
            </div>

          </div>

        </section>
        {/* =========================
    SPECIALTIES SECTION
========================= */}

<section className="home-specialties-section">

  <div className="home-specialties-header">

    <div className="home-specialties-heading">

      <span className="home-section-label">
        CARE FOR EVERY PART OF YOU
      </span>

      <h2>
        A specialist for your next step.
      </h2>

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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

</section>
{/* FEATURED DOCTORS SECTION */}

<section className="home-doctors-section">

  <div className="home-doctors-header">

    <div className="home-doctors-heading">

      <span className="home-section-eyebrow">
        PEOPLE BEHIND THE CARE
      </span>

      <h2>Meet your next care partner.</h2>

      <p>
        Get to know a doctor's focus, verified experience, and clinical
        background before reserving your appointment.
      </p>

      <div className="home-doctors-trust">
        <ShieldCheck size={14} />
        <span>
          Verified clinic specialists. Real-time scheduling calendar updated continuously.
        </span>
      </div>

    </div>


  </div>


  {/* DOCTORS GRID */}

  <div className="home-doctors-grid">

    {/* DOCTOR 1 */}

    <article className="home-doctor-card">

      <div className="home-doctor-image-wrapper">

        <img
          src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=85"
          alt="Dr. Maya Bennett"
          className="home-doctor-image"
        />

        <span className="home-verified-badge">
          Verified Doctor
        </span>

      </div>

      <div className="home-doctor-info">

        <h3>Dr. Maya Bennett</h3>

        <span className="home-doctor-specialty">
          Primary Care Physician
        </span>

        <p className="home-doctor-experience">
          12 years clinical practice
        </p>

        <div className="home-doctor-rating">
          <Star size={13} fill="#f59e0b" color="#f59e0b" />
          <strong>4.9</strong>
          <span>(128 patient reviews)</span>
        </div>

        <div className="home-doctor-availability">

          <span className="home-availability-label">
            NEXT AVAILABLE
          </span>

          <span className="home-availability-dot"></span>

          <span className="home-availability-time">
            Today, 2:30 PM
          </span>

        </div>

        <div className="home-doctor-actions">

          <Link
            to="/doctors/doctor_profile/1"
            className="home-doctor-profile-button"
          >
            Profile
          </Link>

          <Link
            to="/doctors/doctor_profile/1/book-appointment"
            className="home-doctor-book-button"
          >
            Book
          </Link>

        </div>

      </div>

    </article>


    {/* DOCTOR 2 */}

    <article className="home-doctor-card">

      <div className="home-doctor-image-wrapper">

        <img
          src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=600&q=85"
          alt="Dr. Daniel Park"
          className="home-doctor-image"
        />

        <span className="home-verified-badge">
          Verified Doctor
        </span>

      </div>

      <div className="home-doctor-info">

        <h3>Dr. Daniel Park</h3>

        <span className="home-doctor-specialty">
          Cardiologist
        </span>

        <p className="home-doctor-experience">
          15 years clinical practice
        </p>

        <div className="home-doctor-rating">
          <Star size={13} fill="#f59e0b" color="#f59e0b" />
          <strong>4.8</strong>
          <span>(94 patient reviews)</span>
        </div>

        <div className="home-doctor-availability">

          <span className="home-availability-label">
            NEXT AVAILABLE
          </span>

          <span className="home-availability-dot"></span>

          <span className="home-availability-time">
            Tomorrow, 10:00 AM
          </span>

        </div>

        <div className="home-doctor-actions">

          <Link
            to="/doctors/doctor_profile/2"
            className="home-doctor-profile-button"
          >
            Profile
          </Link>

          <Link
            to="/doctors/doctor_profile/2/book-appointment"
            className="home-doctor-book-button"
          >
            Book
          </Link>

        </div>

      </div>

    </article>


    {/* DOCTOR 3 */}

    <article className="home-doctor-card">

      <div className="home-doctor-image-wrapper">

        <img
          src="https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=600&q=85"
          alt="Dr. Elena Rossi"
          className="home-doctor-image"
        />

        <span className="home-verified-badge">
          Verified Doctor
        </span>

      </div>

      <div className="home-doctor-info">

        <h3>Dr. Elena Rossi</h3>

        <span className="home-doctor-specialty">
          Dermatologist
        </span>

        <p className="home-doctor-experience">
          9 years clinical practice
        </p>

        <div className="home-doctor-rating">
          <Star size={13} fill="#f59e0b" color="#f59e0b" />
          <strong>4.9</strong>
          <span>(215 patient reviews)</span>
        </div>

        <div className="home-doctor-availability">

          <span className="home-availability-label">
            NEXT AVAILABLE
          </span>

          <span className="home-availability-dot"></span>

          <span className="home-availability-time">
            Today, 4:00 PM
          </span>

        </div>

        <div className="home-doctor-actions">

          <Link
            to="/doctors/doctor_profile/3"
            className="home-doctor-profile-button"
          >
            Profile
          </Link>

          <Link
            to="/doctors/doctor_profile/3/book-appointment"
            className="home-doctor-book-button"
          >
            Book
          </Link>

        </div>

      </div>

    </article>


    {/* DOCTOR 4 */}

    <article className="home-doctor-card">

      <div className="home-doctor-image-wrapper">

        <img
          src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=85"
          alt="Dr. James Morgan"
          className="home-doctor-image"
        />

        <span className="home-verified-badge">
          Verified Doctor
        </span>

      </div>

      <div className="home-doctor-info">

        <h3>Dr. James Morgan</h3>

        <span className="home-doctor-specialty">
          Pediatrician
        </span>

        <p className="home-doctor-experience">
          11 years clinical practice
        </p>

        <div className="home-doctor-rating">
          <Star size={13} fill="#f59e0b" color="#f59e0b" />
          <strong>4.8</strong>
          <span>(180 patient reviews)</span>
        </div>

        <div className="home-doctor-availability">

          <span className="home-availability-label">
            NEXT AVAILABLE
          </span>

          <span className="home-availability-dot"></span>

          <span className="home-availability-time">
            Tomorrow, 9:30 AM
          </span>

        </div>

        <div className="home-doctor-actions">

          <Link
            to="/doctors/doctor_profile/4"
            className="home-doctor-profile-button"
          >
            Profile
          </Link>

          <Link
            to="/doctors/doctor_profile/4/book-appointment"
            className="home-doctor-book-button"
          >
            Book
          </Link>

        </div>

      </div>

    </article>

  </div>

</section>
{/* HOW IT WORKS SECTION */}

<section className="home-how-section">

  <div className="home-how-header">

    <div>
      <span className="home-section-eyebrow">
        A LITTLE SIMPLER. A LOT MORE HUMAN.
      </span>

      <h2>Your next appointment, in three steps.</h2>
    </div>

    <p className="home-how-header-description">
      Less time figuring things out. More space to focus on what matters:
      you and your loved ones' health.
    </p>

  </div>


  <div className="home-how-grid">

    {/* STEP 1 */}

    <article className="home-how-card">

      <div className="home-how-card-top">

        <div className="home-how-icon">
          <Search size={19} />
        </div>

        <span className="home-how-number">01</span>

      </div>

      <h3>Find Your Doctor</h3>

      <p>
        Filter by specialty, clinic location, accepted insurance,
        or doctor name to find a certified fit for your needs.
      </p>

      <div className="home-how-note">

        <span>START WITH WHAT MATTERS</span>

        <p>Specialty · Location · Insurance network</p>

      </div>

    </article>


    {/* STEP 2 */}

    <article className="home-how-card">

      <div className="home-how-card-top">

        <div className="home-how-icon">
          <CalendarDays size={19} />
        </div>

        <span className="home-how-number">02</span>

      </div>

      <h3>Choose Your Appointment</h3>

      <p>
        Browse open time slots live on our scheduling board.
        Pick the day and time that smoothly fits your routine.
      </p>

      <div className="home-how-note">

        <span>MAKE ROOM FOR YOUR HEALTH</span>

        <p>Instant slots · Morning or Evening</p>

      </div>

    </article>


    {/* STEP 3 */}

    <article className="home-how-card">

      <div className="home-how-card-top">

        <div className="home-how-icon home-how-icon-active">
          <CircleCheck size={19} />
        </div>

        <span className="home-how-number">03</span>

      </div>

      <h3>Confirm Your Booking</h3>

      <p>
        Review clinic directions and receive swift digital confirmation
        along with pre-visit check-in instructions.
      </p>

      <div className="home-how-note">

        <span>KNOW WHAT COMES NEXT</span>

        <p>SMS alerts · Calendar synchronization</p>

      </div>

    </article>

  </div>

</section>
{/* WHY CHOOSE CLINIKA SECTION */}

<section className="home-why-section">

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

        <p>
          Your appointment and visit details organized in one private hub.
        </p>
      </div>

    </div>

  </div>


  {/* CONTENT SIDE */}

  <div className="home-why-content">

    <span className="home-section-eyebrow">
      WHY CHOOSE CLINIKA
    </span>

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

</section>

{/* BOOKING CTA SECTION */}

<section className="home-booking-cta">

  {/* LEFT CONTENT */}

  <div className="home-booking-content">

    <span className="home-booking-eyebrow">
      MAKE TIME FOR WHAT MATTERS
    </span>

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

      <Link
        to="/doctors"
        className="home-booking-primary"
      >
        Book Appointment
        <ArrowRight size={14} />
      </Link>

      <Link
        to="/doctors"
        className="home-booking-secondary"
      >
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

      {[
        "09", "10", "11", "12", "13",
        "16", "17", "18", "19", "20"
      ].map((time) => (

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

</section>


      </main>
    </>
  );
}
