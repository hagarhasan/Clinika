import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  Banknote,
  Check,
  Clock,
  MapPin,
  UserRound,
} from "lucide-react";

export default function BookingDoctorCard({ doctor, name, specialty, location, price, image }) {
  const specialtyText =
    typeof specialty === "object"
      ? specialty?.name || "Specialty unavailable"
      : specialty || "Specialty unavailable";

  const locationText =
    typeof location === "object"
      ? location?.city || location?.name || ""
      : location || "";

  return (
    <div className="booking-doctor-card">
      <div className="booking-doctor-info">
        <div className="booking-doctor-avatar">
          {image ? (
            <img
              src={image}
              alt={name}
              onError={(event) => {
                event.currentTarget.style.display = "none";
                if (event.currentTarget.nextElementSibling) event.currentTarget.nextElementSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="booking-avatar-placeholder"
            style={{
              display: image ? "none" : "flex",
            }}
          >
            <UserRound size={32} />
          </div>
          <span><Check size={11} /></span>
        </div>
        <div className="booking-doctor-details">
          <h3>{name}{doctor && <span className="top-rated">Top Rated</span>}</h3>
          <p className="doctor-specialty">{specialtyText}</p>
          <div className="doctor-meta">
            {locationText && <span><MapPin size={12} />{locationText}</span>}
            <span><Clock size={12} />30 Min Consultations</span>
            <strong><Banknote size={12} />{price} EGP / visit</strong>
          </div>
        </div>
      </div>
      <Link to="/doctors" className="change-doctor-btn btn btn-outline-primary">
        <ArrowLeftRight size={13} />
        Change Doctor
      </Link>
    </div>
  );
}
