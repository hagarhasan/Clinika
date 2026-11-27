import {
  BadgeCheck,
  CalendarDays,
  Clock,
  Heart,
  MapPin,
  Star,
  UserRound,
} from "lucide-react";

export default function DoctorProfileHeader({ doctor = {}, isOwnProfile, onBook }) {
  const specialtyText =
    typeof doctor.specialty === "object"
      ? doctor.specialty?.name || "Medical Specialist"
      : doctor.specialty || "Medical Specialist";

  const degreeText =
    typeof doctor.degree === "object"
      ? doctor.degree?.title || doctor.degree?.name || ""
      : doctor.degree || "";

  const clinicName =
    typeof doctor.clinic === "object"
      ? doctor.clinic?.name || ""
      : doctor.clinic || "";

  const locationText =
    typeof doctor.location === "object"
      ? doctor.location?.city || doctor.location?.name || ""
      : doctor.location || (typeof doctor.clinic === "object" ? doctor.clinic?.city : "") || "";

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
        <p className="profile-specialty">{specialtyText}</p>
        {degreeText && <p className="profile-degree">{degreeText}</p>}
        <div className="profile-header-details">
          <span><Star size={14} fill="currentColor" className="profile-star" /><strong>{doctor.rating}</strong> ({doctor.reviews} patient reviews)</span>
          <span><Clock size={14} />{doctor.experience} Years Clinical Practice</span>
          {(clinicName || locationText) && (
            <span>
              <MapPin size={14} />
              {clinicName}
              {locationText && `, ${locationText}`}
            </span>
          )}
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
