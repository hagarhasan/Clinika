import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function BookingAccessNotice() {
  const { token, role, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="booking-access-notice" role="status" aria-live="polite">
        Checking your account...
      </div>
    );
  }

  if (token && role === "patient") return null;

  if (token) {
    return (
      <section className="booking-access-notice" role="alert" aria-labelledby="booking-access-title">
        <h2 id="booking-access-title">Patient account required</h2>
        <p>You can view this doctor's availability, but booking is available to patient accounts. Register as a patient or sign in with a patient account to continue.</p>
        <div className="booking-access-actions">
          <button
            type="button"
            className="confirm-booking-btn btn btn-primary"
            onClick={() => {
              logout();
              navigate("/register", { replace: true });
            }}
          >
            Sign out and register as a patient
          </button>
          <Link to="/login" className="change-doctor-btn btn btn-outline-primary">Sign in with a patient account</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="booking-access-notice" role="alert" aria-labelledby="booking-access-title">
      <h2 id="booking-access-title">Sign in or register to book</h2>
      <p>You can view this doctor's availability without an account. To reserve an appointment, sign in or register as a patient.</p>
      <div className="booking-access-actions">
        <Link to="/register" className="confirm-booking-btn btn btn-primary">Register as a patient</Link>
        <Link to="/login" className="change-doctor-btn btn btn-outline-primary">Sign in</Link>
      </div>
    </section>
  );
}
