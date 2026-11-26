import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Heart,
  ShieldCheck,
  Smile,
} from "lucide-react";
import doctorImage from "../../assets/images/about.png";
import teamImage from "../../assets/images/about1.png";

export function AboutHero() {
  return (
    <section className="about-hero container py-5">
      <div className="row align-items-center g-4 g-lg-5">
      <div className="about-content col-lg-6">
        <span className="about-badge"><ShieldCheck size={14} /> COMPASSIONATE CARE, SIMPLIFIED</span>
        <h1>Healthcare Made Easier<br />with Clinika</h1>
        <p>Clinika connects patients seamlessly with licensed doctors and certified specialists, simplifying appointment scheduling and empowering better everyday health for you and your family.</p>
        <div className="about-buttons">
          <Link to="/doctors" className="about-primary-btn btn btn-primary">Explore Our Doctors <ArrowRight size={16} /></Link>
          <button type="button" className="about-secondary-btn btn btn-outline-primary" onClick={() => document.getElementById("about-mission")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Learn How It Works
          </button>
        </div>
        <div className="about-stats">
          <span><ShieldCheck size={15} />48+ Certified Doctors</span>
          <i></i>
          <span><CheckCircle2 size={15} />100% Verified Care</span>
          <i></i>
          <span><Clock size={15} />Instant Confirmation</span>
        </div>
      </div>
      <div className="about-hero-image col-lg-6">
        <img src={doctorImage} alt="Doctor providing medical consultation" />
        <div className="about-image-card">
          <div className="about-heart-icon"><Heart size={20} /></div>
          <div><h4>Personalized Care</h4><p>At every step of your health journey</p></div>
        </div>
        </div>
      </div>
    </section>
  );
}

export function AboutMission() {
  return (
    <section className="about-mission container my-4 py-5 px-4 px-lg-5" id="about-mission">
      <div className="row align-items-center g-4 g-lg-5">
      <div className="mission-content col-lg-6">
        <span className="about-badge">OUR MISSION</span>
        <h2>Making trusted medical care accessible to everyone, everywhere.</h2>
        <p>We believe that finding quality medical attention should never feel overwhelming or stressful. Clinika bridges the gap between individuals and healthcare specialists through frictionless digital scheduling, verified clinician credentials, and clear medical coordination.</p>
        <p>By replacing convoluted phone calls with immediate calendar clarity, we nurture supportive doctor-patient relationships and ensure patient comfort from initial booking through follow-up recovery.</p>
        <div className="mission-features">
          <span><CheckCircle2 size={15} />Patient-First Approach</span>
          <span><ShieldCheck size={15} />Secure &amp; Confidential</span>
        </div>
      </div>
      <div className="mission-image col-lg-6">
        <img src={teamImage} alt="Healthcare team meeting" />
        <span className="mission-image-badge"><span></span>STATE-OF-THE-ART CARE</span>
      </div>
      </div>
    </section>
  );
}

export function AboutAdvantages() {
  return (
    <section className="about-why container py-5">
      <div className="why-heading">
        <span className="about-badge">CORE ADVANTAGES</span>
        <h2>Why Clinika</h2>
        <p>Built for patients and providers to connect with ease and confidence.</p>
      </div>
      <div className="why-cards row g-4">
        <div className="col-md-6 col-lg-4">
          <article className="why-card card h-100">
            <div className="why-icon"><CalendarCheck size={20} /></div>
            <h3>Easy Appointment Booking</h3>
            <p>Search real-time availability and confirm your consultation in seconds without waiting on hold.</p>
          </article>
        </div>
        <div className="col-md-6 col-lg-4">
          <article className="why-card card h-100">
            <div className="why-icon"><ShieldCheck size={20} /></div>
            <h3>Qualified Doctors</h3>
            <p>Verified specialists across cardiology, pediatrics, family medicine, dermatology, and more.</p>
          </article>
        </div>
        <div className="col-md-6 col-lg-4">
          <article className="why-card card h-100">
            <div className="why-icon"><Smile size={20} /></div>
            <h3>Patient-Centered Care</h3>
            <p>Direct communication, transparent scheduling, and care tailored to your routine and comfort.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

export function AboutCallToAction() {
  return (
    <section className="about-cta container my-5 py-5 px-4" id="about-cta">
      <span className="cta-badge">GET STARTED TODAY</span>
      <h2>Ready to take control of your<br />health?</h2>
      <p>Find a doctor in your area and book your next appointment today with trusted healthcare providers.</p>
      <div className="cta-buttons">
        <Link to="/doctors" className="cta-light-btn btn btn-light">Find Your Doctor</Link>
        <Link to="/doctors" className="cta-dark-btn btn btn-primary">Book Appointment</Link>
      </div>
    </section>
  );
}
