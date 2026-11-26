import {
  BadgeCheck,
  Clock,
  MapPin,
  Star,
  UserRound,
} from "lucide-react";

export default function DoctorCard({ doctor, onViewProfile, onBookAppointment }) {
  return (
    <article className="doctor-card card">
      <div className="doctor-image-wrapper">
        {doctor.image && (
          <img
            src={doctor.image}
            alt={doctor.name}
            className="doctor-image"
            onError={(event) => {
              event.currentTarget.style.display = "none";
              event.currentTarget.nextElementSibling.style.display = "flex";
            }}
          />
        )}
        <div
          className="doctor-image-placeholder"
          style={{ display: doctor.image ? "none" : "flex" }}
        >
          <UserRound size={45} />
        </div>
        <span className="image-verified">
          <BadgeCheck size={11} />
          Verified
        </span>
      </div>

      <div className="doctor-information">
        <div className="doctor-top-row">
          <div>
            <h3>{doctor.name}</h3>
            <p className="doctor-specialty">{doctor.specialty}</p>
          </div>
          <div className="doctor-rating">
            {doctor.rating != null ? (
              <>
                <Star size={12} fill="currentColor" />
                <strong>{doctor.rating}</strong>
                <span>({doctor.reviews})</span>
              </>
            ) : (
              <span>No ratings yet</span>
            )}
          </div>
        </div>

        <div className="doctor-details">
          <div>
            <MapPin size={12} />
            <span>{doctor.clinic} - {doctor.location}</span>
          </div>
          <div>
            <BadgeCheck size={12} />
            <span>{doctor.degree}</span>
          </div>
          <div>
            <Clock size={12} />
            <span>{doctor.experience} years clinical practice</span>
          </div>
          <div>
            <MapPin size={12} />
            <span>{doctor.location}</span>
          </div>
        </div>

        <div className="doctor-booking-info">
          <div className="doctor-fee">
            <span>Consultation Fee</span>
            <strong>{doctor.fee}</strong>
            <small>EGP</small>
          </div>
          <div className="doctor-availability">
            <span>Next Available</span>
            <strong>
              <span className="availability-dot"></span>
              {doctor.availability === "Today"
                ? `Today, ${doctor.time}`
                : doctor.availability === "Tomorrow"
                  ? `Tomorrow, ${doctor.time}`
                  : doctor.time}
            </strong>
          </div>
        </div>

        <div className="doctor-card-actions">
          <button type="button" className="view-profile-btn btn btn-outline-primary" onClick={onViewProfile}>
            View Profile
          </button>
          <button type="button" className="book-appointment-btn btn btn-primary" onClick={onBookAppointment}>
            Book Appointment
          </button>
        </div>
      </div>
    </article>
  );
}
