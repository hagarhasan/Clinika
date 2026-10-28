import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const quickLinks = [
  { icon: "fa-user-doctor", title: "Find a Doctor", text: "Search verified specialists by specialty or location.", to: "/doctors", cta: "Search doctors" },
  { icon: "fa-calendar-check", title: "Book Appointment", text: "Pick a time that works and confirm in minutes.", to: "/book", cta: "Schedule visit" },
  { icon: "fa-headset", title: "Contact Support", text: "Our care desk replies within 2–4 business hours.", to: "/contact", cta: "Get in touch" },
];

export default function NotFound() {

  useEffect(() => {
    document.title = "Page not found | Clinika";
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | Clinika</title>
      </Helmet>
      <main className="cl-page">
        <div className="container-fluid px-3 px-lg-5">
          <div className="cl-page-inner">
            <div className="cl-404-wrap">
              <span className="cl-badge">
                <i className="fa-solid fa-compass"></i> Page not found
              </span>

              <div className="cl-404-code" aria-hidden="true">
                4
                <span className="cl-404-zero">
                  <i className="fa-solid fa-magnifying-glass"></i>
                </span>
                4
              </div>

              <h1 className="cl-page-title">
                We couldn’t find <span className="cl-accent">that page.</span>
              </h1>
              <p className="cl-page-intro">
                The link may be broken or the page may have moved. Let’s get you back to booking
                care with zero administrative friction.
              </p>

              <div className="cl-404-actions">
                <Link className="cl-book-btn" to="/">
                  <i className="fa-solid fa-house me-2"></i>Back to Home
                </Link>
                <Link className="cl-btn-ghost" to="/doctors">
                  <i className="fa-solid fa-magnifying-glass"></i> Find a Doctor
                </Link>
              </div>

              <div className="cl-quick-grid">
                {quickLinks.map((q) => (
                  <Link className="cl-quick-card" to={q.to} key={q.title}>
                    <span className="cl-icon-box">
                      <i className={`fa-solid ${q.icon}`}></i>
                    </span>
                    <h3>{q.title}</h3>
                    <p>{q.text}</p>
                    <span className="cl-quick-link">
                      {q.cta} <i className="fa-solid fa-arrow-right"></i>
                    </span>
                  </Link>
                ))}
              </div>

              <div className="cl-triage">
                <span>
                  <i className="fa-solid fa-briefcase-medical"></i>
                  <strong>Need immediate clinical triage?</strong> For medical emergencies, please
                  dial your local emergency services or call our 24/7 priority line.
                </span>
                <Link to="tel:18002546452">
                  Call 24/7 Helpline <i className="fa-solid fa-arrow-right"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}