import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock3, HeartPulse, ShieldCheck } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="home-hero py-5">
      <div className="container py-lg-4">
        <div className="row align-items-center g-5">
          <div className="col-lg-6 home-rise-in">
            <span className="home-eyebrow d-inline-flex align-items-center gap-2 mb-3">
              <ShieldCheck size={16} />
              CARE THAT FITS YOUR LIFE
            </span>
            <h1 className="mb-4">
              Your health deserves <span className="text-primary">the right care.</span>
            </h1>
            <p className="home-lead mb-4">
              Discover trusted doctors, find a time that works, and make your next
              healthcare visit feel simple.
            </p>
            <div className="d-flex flex-wrap gap-3">
              <Link to="/doctors" className="btn btn-primary btn-lg rounded-3 px-4">
                Find a doctor <ArrowRight size={18} className="ms-2" />
              </Link>
              <a href="#home-search" className="btn btn-outline-primary btn-lg rounded-3 px-4">
                Explore care
              </a>
            </div>
            <div className="d-flex flex-wrap gap-4 mt-4 pt-2 home-muted small">
              <span className="d-inline-flex align-items-center gap-2">
                <CheckCircle2 size={17} className="text-primary" /> Verified specialists
              </span>
              <span className="d-inline-flex align-items-center gap-2">
                <Clock3 size={17} className="text-primary" /> Convenient scheduling
              </span>
            </div>
          </div>

          <div className="col-lg-6 home-fade-in home-delay-1">
            <div className="home-hero-visual">
              <img
                className="home-hero-photo"
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1100&q=85"
                alt="Doctor ready to provide care"
              />
              <div className="home-floating-card card">
                <div className="card-body d-flex align-items-center gap-3 p-3">
                  <span className="home-specialty-icon flex-shrink-0">
                    <HeartPulse size={23} />
                  </span>
                  <div>
                    <p className="fw-semibold mb-1">Care, made personal.</p>
                    <p className="small home-muted mb-0">Your next step starts here.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
