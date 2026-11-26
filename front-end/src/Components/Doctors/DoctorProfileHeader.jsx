import {
  BadgeCheck,
  CalendarDays,
  Clock,
  Heart,
  MapPin,
  Star,
  UserRound,
} from "lucide-react";

export default function DoctorProfileHeader({ doctor, isOwnProfile, onBook }) {
  return (
    <div className="profile-header-card">
      <div className="profile-doctor-image">
        {doctor.image && (
          <img
            src={doctor.image}
            alt={doctor.name}
            onError={(event) => {
              event.currentTarget.style.display = "none";
              event.currentTarget.nextElementSibling.style.display = "flex";
            }}
          />
        )}
        <UserRound size={55} style={{ display: doctor.image ? "none" : "flex" }} />
      </div>
      <div className="profile-header-info">
        <div className="profile-name-row">
          <h1>{doctor.name}</h1>
          {doctor.verified && (
            <span className="profile-verified-badge"><BadgeCheck size={14} />Verified</span>
          )}
        </div>
        <p className="profile-specialty">{doctor.specialty}</p>
        <p className="profile-degree">{doctor.degree}</p>
        <div className="profile-header-details">
          <span><Star size={14} fill="currentColor" className="profile-star" /><strong>{doctor.rating}</strong> ({doctor.reviews} patient reviews)</span>
          <span><Clock size={14} />{doctor.experience} Years Clinical Practice</span>
          <span><MapPin size={14} />{doctor.clinic}{doctor.location && `, ${doctor.location}`}</span>
        </div>
      </div>
      <div className="profile-fee-card">
        <span>CONSULTATION FEE</span>
        <strong>{doctor.fee}<small> EGP</small></strong>
        <p>Per appointment</p>
        <div className="profile-fee-actions">
          {!isOwnProfile && (
            <button type="button" onClick={onBook}>
              <CalendarDays size={14} />
              Book Visit
            </button>
          )}
          <button type="button"><Heart size={14} />Save Doctor</button>
        </div>
      </div>
    </div>
  );
}
