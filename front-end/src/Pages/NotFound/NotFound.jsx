import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | Clinika</title>
      </Helmet>
      <div className="container min-vh-100 d-flex flex-column align-items-center justify-content-center text-center py-5">
        <h1 className="display-1 fw-bold text-primary mb-3">404</h1>
        <h2 className="h3 fw-semibold mb-2">Page Not Found</h2>
        <p className="text-muted mb-4" style={{ maxWidth: '480px' }}>
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
        <Link to="/" className="btn btn-primary px-4 py-2" style={{ borderRadius: 'var(--cl-radius-btn, 0.75rem)' }}>
          <i className="fa-solid fa-house me-2"></i>Back to Home
        </Link>
      </div>
    </>
  );
}