import { Link } from "react-router-dom";
import { Activity, ArrowRight, Baby, Bone, Brain, HeartPulse, Stethoscope } from "lucide-react";

const specialtyIcons = [HeartPulse, Stethoscope, Brain, Bone, Baby, Activity];

export default function SpecialtiesSection({ specialties = [], openSpecialty }) {
  return (
    <section className="home-section">
      <div className="container">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3 mb-4">
          <div className="home-section-heading">
            <span className="home-eyebrow">CARE FOR EVERY PART OF YOU</span>
            <h2 className="mt-2 mb-2">Explore our specialties</h2>
            <p className="mb-0">Find knowledgeable practitioners for the care you need.</p>
          </div>
          <Link to="/doctors" className="btn btn-outline-primary rounded-3 align-self-start align-self-md-end">
            All specialties <ArrowRight size={16} className="ms-2" />
          </Link>
        </div>

        {specialties.length > 0 ? (
          <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
            {specialties.slice(0, 6).map((specialty, index) => {
              const SpecialtyIcon = specialtyIcons[index % specialtyIcons.length];
              return (
                <div className="col home-rise-in" style={{ animationDelay: `${index * 70}ms` }} key={specialty.id}>
                  <button
                    type="button"
                    className="home-specialty-card card h-100 w-100 text-start"
                    onClick={() => openSpecialty(specialty)}
                  >
                    <span className="card-body p-4">
                      <span className="home-specialty-icon mb-3"><SpecialtyIcon size={23} /></span>
                      <span className="d-flex justify-content-between align-items-center">
                        <span className="h5 fw-semibold mb-0">{specialty.name}</span>
                        <ArrowRight size={18} className="text-primary" />
                      </span>
                      {specialty.description && (
                        <span className="d-block home-muted small mt-2">{specialty.description}</span>
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="home-muted">Explore available doctors and specialties in our directory.</p>
        )}
      </div>
    </section>
  );
}
