
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import {
  ShieldCheck,
  ArrowRight,
  Heart,
  CalendarCheck,
  Users,
  Smile,
  Clock,
  CheckCircle2
} from 'lucide-react';
import './About.css';
import doctorImage from '../../assets/images/about.png';
import teamImage from '../../assets/images/about1.png';
export default function About() {
  return (
    <>
      <Helmet>
        <title>About Us | Clinika</title>
      </Helmet>

      <div className="about-page">

        {/* Hero Section */}
        <section className="about-hero">
          <div className="about-content">
            <span className="about-badge">
              <ShieldCheck size={14} />
              COMPASSIONATE CARE, SIMPLIFIED
            </span>

            <h1>
              Healthcare Made Easier
              <br />
              with Clinika
            </h1>

            <p>
              Clinika connects patients seamlessly with licensed
              doctors and certified specialists, simplifying
              appointment scheduling and empowering better
              everyday health for you and your family.
            </p>

            <div className="about-buttons">
             <Link to="/doctors" className="about-primary-btn">
  Explore Our Doctors
  <ArrowRight size={16} />
</Link>

              <button
  type="button"
  className="about-secondary-btn"
  onClick={() => {
    document.getElementById('about-mission')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }}
>
  Learn How It Works
</button>
            </div>

            <div className="about-stats">
              <span>
                <ShieldCheck size={15} />
                48+ Certified Doctors
              </span>

              <i></i>

              <span>
                <CheckCircle2 size={15} />
                100% Verified Care
              </span>

              <i></i>

              <span>
                <Clock size={15} />
                Instant Confirmation
              </span>
            </div>
          </div>

          <div className="about-hero-image">
    <img
  src={doctorImage}
  alt="Doctor providing medical consultation"
/>

            <div className="about-image-card">
              <div className="about-heart-icon">
                <Heart size={20} />
              </div>

              <div>
                <h4>Personalized Care</h4>
                <p>At every step of your health journey</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="about-mission" id="about-mission">
          <div className="mission-content">
            <span className="about-badge">
              OUR MISSION
            </span>

            <h2>
              Making trusted medical care accessible
              to everyone, everywhere.
            </h2>

            <p>
              We believe that finding quality medical attention
              should never feel overwhelming or stressful.
              Clinika bridges the gap between individuals and
              healthcare specialists through frictionless digital
              scheduling, verified clinician credentials, and
              clear medical coordination.
            </p>

            <p>
              By replacing convoluted phone calls with immediate
              calendar clarity, we nurture supportive doctor-patient
              relationships and ensure patient comfort from initial
              booking through follow-up recovery.
            </p>

            <div className="mission-features">
              <span>
                <CheckCircle2 size={15} />
                Patient-First Approach
              </span>

              <span>
                <ShieldCheck size={15} />
                Secure & Confidential
              </span>
            </div>
          </div>

          <div className="mission-image">
          <img
  src={teamImage}
  alt="Healthcare team meeting"
/>
            <span className="mission-image-badge">
              <span></span>
              STATE-OF-THE-ART CARE
            </span>
          </div>
        </section>

        {/* Why Clinika Section */}
        <section className="about-why">
          <div className="why-heading">
            <span className="about-badge">
              CORE ADVANTAGES
            </span>

            <h2>Why Clinika</h2>

            <p>
              Built for patients and providers to connect
              with ease and confidence.
            </p>
          </div>

          <div className="why-cards">

            <div className="why-card">
              <div className="why-icon">
                <CalendarCheck size={20} />
              </div>

              <h3>Easy Appointment Booking</h3>

              <p>
                Search real-time availability and confirm your
                consultation in seconds without waiting on hold.
              </p>
            </div>

            <div className="why-card">
              <div className="why-icon">
                <ShieldCheck size={20} />
              </div>

              <h3>Qualified Doctors</h3>

              <p>
                Verified specialists across cardiology, pediatrics,
                family medicine, dermatology, and more.
              </p>
            </div>

            <div className="why-card">
              <div className="why-icon">
                <Smile size={20} />
              </div>

              <h3>Patient-Centered Care</h3>

              <p>
                Direct communication, transparent scheduling,
                and care tailored to your routine and comfort.
              </p>
            </div>

          </div>
        </section>

        {/* CTA Section */}
        <section className="about-cta" id="about-cta">
          <span className="cta-badge">GET STARTED TODAY</span>

          <h2>
            Ready to take control of your
            <br />
            health?
          </h2>

          <p>
            Find a doctor in your area and book your next
            appointment today with trusted healthcare providers.
          </p>
<div className="cta-buttons">
  <Link to="/doctors" className="cta-light-btn">
    Find Your Doctor
  </Link>

  <Link to="/doctors" className="cta-dark-btn">
    Book Appointment
  </Link>
</div>
        </section>

      </div>
    </>
  );
}
