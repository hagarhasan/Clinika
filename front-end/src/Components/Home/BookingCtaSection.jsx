import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function BookingCtaSection() {
  return (
    <section className="container pb-5">
      <div className="home-cta p-4 p-lg-5 home-fade-in">
        <div className="row align-items-center g-4">
          <div className="col-lg-8">
            <span className="small fw-semibold text-uppercase">MAKE TIME FOR WHAT MATTERS</span>
            <h2 className="display-6 fw-bold mt-2 mb-3">Take the next step toward better care.</h2>
            <p className="mb-0">Find a doctor who fits your needs and book a time that fits your life.</p>
          </div>
          <div className="col-lg-4 d-flex flex-wrap gap-2 justify-content-lg-end">
            <Link to="/doctors" className="btn btn-light btn-lg rounded-3">
              Book an appointment <ArrowRight size={17} className="ms-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
