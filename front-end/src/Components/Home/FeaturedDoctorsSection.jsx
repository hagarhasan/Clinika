import { Link } from "react-router-dom";
import { Star, ShieldCheck, UserRound } from "lucide-react";
import { formatName, formatAvailability } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";

export default function FeaturedDoctorsSection({
  doctors = [],
  loadingDoctors = false,
  doctorsError = "",
}) {
  const { role, user } = useAuth();
  const visibleDoctors = role === "doctor"
    ? doctors.filter((doctor) => Number(doctor.user_id) !== Number(user?.id))
    : doctors;

  return (
    <section className="home-doctors-wrapper">
      <div className="container">
        <div className="home-doctors-section">
          <div className="home-doctors-header">
            <div className="home-doctors-heading">
              <span className="home-section-eyebrow">PEOPLE BEHIND THE CARE</span>
              <h2>Meet your next care partner.</h2>
              <p>
                Get to know a doctor's focus, verified experience, and clinical
                background before reserving your appointment.
              </p>

              <div className="home-doctors-trust">
                <ShieldCheck size={14} />
                <span>
                  Verified clinic specialists. Real-time scheduling calendar updated continuously.
                </span>
              </div>
            </div>

            <Link to="/doctors" className="home-view-specialties d-none d-md-inline-flex">
              View all doctors
              <span>→</span>
            </Link>
          </div>

          <div className="home-doctors-grid">
            {loadingDoctors ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div className="home-doctor-card home-doctor-skeleton-card" key={i}>
                  <div className="home-doctor-skeleton-image"></div>
                  <div className="home-doctor-info">
                    <div className="skeleton-line" style={{ width: "70%", height: "18px", marginBottom: "8px" }}></div>
                    <div className="skeleton-line" style={{ width: "45%", height: "14px", marginBottom: "8px" }}></div>
                    <div className="skeleton-line" style={{ width: "55%", height: "12px", marginBottom: "12px" }}></div>
                    <div className="skeleton-line" style={{ width: "100%", height: "42px", borderRadius: "10px", marginTop: "auto", marginBottom: "14px" }}></div>
                    <div className="d-flex gap-2">
                      <div className="skeleton-line flex-grow-1" style={{ height: "38px", borderRadius: "8px" }}></div>
                      <div className="skeleton-line flex-grow-1" style={{ height: "38px", borderRadius: "8px" }}></div>
                    </div>
                  </div>
                </div>
              ))
            ) : doctorsError ? (
              <p role="alert" className="text-danger">{doctorsError}</p>
            ) : visibleDoctors.length === 0 ? (
              <p className="text-muted">No doctors available right now.</p>
            ) : (
              visibleDoctors.map((doctor) => {
                const displayName = formatName(doctor.full_name);
                const rating = doctor.rating_avg ? Number(doctor.rating_avg).toFixed(1) : "New";

                return (
                  <article className="home-doctor-card" key={doctor.id}>
                    <div className="home-doctor-image-wrapper">
                      {doctor.photo_url && (
                        <img
                          src={doctor.photo_url}
                          alt={displayName}
                          className="home-doctor-image"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = "flex";
                            }
                          }}
                        />
                      )}

                      <div
                        className="home-doctor-image-placeholder"
                        style={{
                          display: doctor.photo_url ? "none" : "flex",
                        }}
                      >
                        <UserRound size={64} strokeWidth={1.5} />
                      </div>

                      {doctor.is_verified && (
                        <span className="home-verified-badge">
                          <ShieldCheck size={12} strokeWidth={2.5} />
                          <span>Verified Doctor</span>
                        </span>
                      )}
                    </div>

                    <div className="home-doctor-info">
                      <h3 title={displayName}>{displayName}</h3>

                      <span className="home-doctor-specialty">
                        {doctor.specialty?.name || "Medical Specialist"}
                      </span>

                      <p className="home-doctor-experience">
                        {doctor.years_of_experience ?? 0} years clinical practice
                      </p>

                      <div className="home-doctor-rating">
                        <Star size={14} fill="#f59e0b" color="#f59e0b" />
                        <strong>{rating}</strong>
                        {Number(doctor.reviews_count) > 0 && (
                          <span>({doctor.reviews_count} patient reviews)</span>
                        )}
                      </div>

                      <div className="home-doctor-availability">
                        <span className="home-availability-dot"></span>
                        <div className="home-availability-text-group">
                          <span className="home-availability-label">NEXT AVAILABLE</span>
                          <span className="home-availability-time">
                            {formatAvailability(doctor.next_available)}
                          </span>
                        </div>
                      </div>

                      <div className="home-doctor-actions">
                        <Link
                          to={`/doctors/doctor_profile/${doctor.id}`}
                          state={{ doctor }}
                          className="home-doctor-profile-button"
                        >
                          Profile
                        </Link>

                        <Link
                          to={`/doctors/doctor_profile/${doctor.id}/book-appointment`}
                          state={{
                            doctor: {
                              ...doctor,
                              id: doctor.id,
                              name: displayName,
                              specialty: doctor.specialty?.name || "Medical Specialist",
                              clinic: doctor.clinic?.name || "Clinika Clinic",
                              clinicId: doctor.next_available?.clinic_id || doctor.clinic?.id,
                              appointmentDate: doctor.next_available?.appointment_date || "",
                              startTime: doctor.next_available?.start_time || "",
                              fee: doctor.consultation_fee ?? 0,
                              image: doctor.photo_url || "",
                            },
                          }}
                          className="home-doctor-book-button"
                        >
                          Book
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
