import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Clock3, ShieldCheck, Star, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatAvailability, formatName } from "../../utils/format";

export default function FeaturedDoctorsSection({
  doctorsQuery,
  featuredDoctors = [],
}) {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const handleBookClick = (e, doctor, targetState) => {
    if (!token || !user) {
      e.preventDefault();
      showToast({
        type: "info",
        title: "Sign in required",
        message: "Please log in first to book an appointment.",
      });
      navigate("/login", {
        state: {
          from: `/doctors/doctor_profile/${doctor.id}/book-appointment`,
          forwardState: targetState,
        },
      });
    }
  };

  return (
    <section className="home-section bg-light">
      <div className="container">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3 mb-4">
          <div className="home-section-heading">
            <span className="home-eyebrow">PEOPLE BEHIND THE CARE</span>
            <h2 className="mt-2 mb-2">Meet our doctors</h2>
            <p className="mb-0">Get to know trusted practitioners and find the right care partner.</p>
          </div>
          <Link to="/doctors" className="btn btn-outline-primary rounded-3 align-self-start align-self-md-end">
            View all doctors <ArrowRight size={16} className="ms-2" />
          </Link>
        </div>

        {doctorsQuery.isLoading ? (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading doctors...</span>
            </div>
          </div>
        ) : doctorsQuery.isError ? (
          <div className="alert alert-warning" role="alert">
            {doctorsQuery.error?.message || "Doctors could not be loaded right now."}
          </div>
        ) : featuredDoctors.length === 0 ? (
          <p className="home-muted">No doctors are available right now.</p>
        ) : (
          <div className="row align-items-center justify-content-center row-cols-1 row-cols-sm-2 row-cols-xl-4 g-4">
            {featuredDoctors.map((doctor) => {
              const displayName = formatName(doctor.full_name);
              const rating = doctor.rating_avg ? Number(doctor.rating_avg).toFixed(1) : "New";
              const bookState = {
                doctor: {
                  ...doctor,
                  name: displayName,
                  specialty: doctor.specialty?.name || "Medical Specialist",
                  clinic: doctor.clinic?.name || "Clinika Clinic",
                  clinicId: doctor.next_available?.clinic_id || doctor.clinic?.id,
                  appointmentDate: doctor.next_available?.appointment_date || "",
                  startTime: doctor.next_available?.start_time || "",
                  fee: doctor.consultation_fee ?? 0,
                  image: doctor.photo_url || "",
                },
              };

              return (
                <div className="col home-rise-in" key={doctor.id}>
                  <article className="home-doctor-card card h-100">
                    <div className="position-relative">
                      {doctor.photo_url ? (
                        <img
                          className="home-doctor-photo"
                          src={doctor.photo_url}
                          alt={displayName}
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                            event.currentTarget.nextElementSibling?.classList.remove("d-none");
                          }}
                        />
                      ) : null}
                      <div className={`home-doctor-placeholder ${doctor.photo_url ? "d-none" : ""}`}>
                        <UserRound size={52} />
                      </div>
                      {doctor.is_verified && (
                        <span className="badge text-bg-light position-absolute top-0 start-0 m-3">
                          <ShieldCheck size={14} className="text-primary me-1" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="card-body d-flex flex-column p-4">
                      <h3 className="h5 fw-bold text-truncate mb-1" title={displayName}>
                        {displayName}
                      </h3>
                      <p className="text-primary fw-semibold small mb-2">
                        {doctor.specialty?.name || "Medical Specialist"}
                      </p>
                      <p className="home-muted small mb-3">
                        {doctor.years_of_experience ?? 0} years of clinical practice
                      </p>
                      <div className="d-flex align-items-center gap-2 small mb-3">
                        <Star size={15} fill="currentColor" className="text-warning" />
                        <strong>{rating}</strong>
                        {Number(doctor.reviews_count) > 0 && (
                          <span className="home-muted">({doctor.reviews_count} reviews)</span>
                        )}
                      </div>
                      <div className="small home-muted mb-3">
                        <Clock3 size={15} className="text-primary me-2" />
                        {formatAvailability(doctor.next_available)}
                      </div>
                      <div className="d-flex gap-2 mt-auto">
                        <Link
                          to={`/doctors/doctor_profile/${doctor.id}`}
                          state={{ doctor: bookState.doctor }}
                          className="btn btn-outline-primary btn-sm flex-grow-1"
                        >
                          Profile
                        </Link>
                        <Link
                          to={`/doctors/doctor_profile/${doctor.id}/book-appointment`}
                          state={bookState}
                          onClick={(e) => handleBookClick(e, doctor, bookState)}
                          className="btn btn-primary btn-sm flex-grow-1"
                        >
                          Book
                        </Link>
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
