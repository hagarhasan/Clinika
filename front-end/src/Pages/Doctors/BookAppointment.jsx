
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useLocation } from "react-router-dom";
import api from "../../api";
import {
  Home,
  ShieldCheck,
  MapPin,
  Clock,
  Banknote,
  ArrowRight,
  ArrowLeftRight,
  Building2,
  Video,
  CalendarDays,
  CalendarCheck,
  Check,
  CheckCircle2,
} from "lucide-react";

import "./Doctors.css";

export default function BookAppointment() {
  const { id } = useParams();
  const location = useLocation();

  // Doctor data received from DoctorProfile
  const passedDoctor = location.state?.doctor;

  // Original profile URL
  const profilePath = location.state?.from || "/doctors";

  // Validate doctor ID
  const doctor =
    passedDoctor && String(passedDoctor.id) === String(id)
      ? passedDoctor
      : null;

  const doctorName = doctor?.name || "Doctor information unavailable";

  const doctorSpecialty =
    doctor?.specialty || "Specialty unavailable";

  const doctorLocation =
    doctor?.location || "Location unavailable";

  const doctorPrice = doctor?.fee ?? doctor?.consultationFee ?? 0;

  const [modality, setModality] = useState("in-person");

  const [confirmed, setConfirmed] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
 const appointmentDate = doctor?.appointmentDate || "";
const appointmentTime = doctor?.startTime || "";

const formattedDate = appointmentDate
  ? new Date(`${appointmentDate}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  : "No date available";

const formattedMonth = appointmentDate
  ? new Date(`${appointmentDate}T00:00:00`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  : "Availability unavailable";

const formattedTime = appointmentTime
  ? new Date(`2000-01-01T${appointmentTime}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  : "No time available";
 const handleConfirm = async () => {
  setError("");
  setConfirmed(false);

  if (!doctor) {
    setError("Doctor information is unavailable.");
    return;
  }

  if (!doctor.appointmentDate || !doctor.startTime || !doctor.clinicId) {
    setError("Appointment availability information is missing.");
    return;
  }

  setLoading(true);

  try {
    await api.post("/appointments", {
      doctor_id: Number(doctor.id),
      appointment_date: doctor.appointmentDate,
      start_time: doctor.startTime,
      reason: "General consultation",
      consultation_type: modality === "in-person" ? "in_person" : "video",
      clinic_id: Number(doctor.clinicId),
    });

    setConfirmed(true);
  } catch (err) {
    setError(
      err.response?.data?.detail ||
      err.response?.data?.message ||
      "Unable to book appointment. Please try again."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <Helmet>
        <title>Book Appointment | Clinika</title>
      </Helmet>

      <div className="booking-page">

        {/* Breadcrumb */}
        <div className="booking-breadcrumb">

          <Link to="/">
            <Home size={13} />
            Home
          </Link>

          <span>›</span>

          <Link to="/doctors">
            Find Doctors
          </Link>

          <span>›</span>

          <Link
            to={profilePath}
            state={{ doctor }}
          >
            {doctorName}
          </Link>

          <span>›</span>

          {/* Current Page */}
          <span className="active">
            Book an Appointment
          </span>

        </div>

        {/* Heading */}
        <div className="booking-heading">
          <div>
            <span className="booking-secure-badge">
              <span></span>
              Secure Clinical Booking - Syndicate Verified
            </span>

            <h1>Book an Appointment</h1>

            <p>
              Choose your preferred date and time for your consultation.
            </p>
          </div>

          <div className="verified-booking">
            <ShieldCheck size={15} />
            Verified Doctor Booking
          </div>
        </div>

        {/* Doctor Information */}
        <div className="booking-doctor-card">

          <div className="booking-doctor-info">

            <div className="booking-doctor-avatar">
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200"
                alt="Doctor"
              />

              <span>
                <Check size={11} />
              </span>
            </div>

            <div className="booking-doctor-details">

              <h3>
                {doctorName}

                {doctor && (
                  <span className="top-rated">
                    Top Rated
                  </span>
                )}
              </h3>

              <p className="doctor-specialty">
                {doctorSpecialty}
              </p>

              <div className="doctor-meta">

                <span>
                  <MapPin size={12} />
                  {doctorLocation}
                </span>

                <span>
                  <Clock size={12} />
                  30 Min Consultations
                </span>

                <strong>
                  <Banknote size={12} />
                  {doctorPrice} EGP / visit
                </strong>

              </div>
            </div>
          </div>

          <Link
            to="/doctors"
            className="change-doctor-btn"
          >
            <ArrowLeftRight size={13} />
            Change Doctor
          </Link>

        </div>

        {/* Booking Content */}
        <div className="booking-layout">

          <div className="booking-main">

            {/* Consultation Modality */}
            <section className="booking-section">

              <div className="booking-section-heading">

                <h3>
                  <span className="step-number">1</span>
                  Consultation Modality
                </h3>

                <span className="step-label">
                  Step 1 of 3
                </span>

              </div>

              <div className="modality-options">

                <button
                  type="button"
                  className={`modality-card ${
                    modality === "in-person" ? "selected" : ""
                  }`}
                  onClick={() => setModality("in-person")}
                >
                  <div className="modality-icon">
                    <Building2 size={19} />
                  </div>

                  {modality === "in-person" && (
                    <span className="modality-check">
                      <Check size={12} />
                    </span>
                  )}

                  <h4>In-Person Consultation</h4>

                  <p>
                    Room 304, Heliopolis Medical Pavilion
                  </p>

                  <span className="modality-note">
                    Clinic Check-in
                  </span>
                </button>

                <button
                  type="button"
                  className={`modality-card ${
                    modality === "video" ? "selected" : ""
                  }`}
                  onClick={() => setModality("video")}
                >
                  <div className="modality-icon video-icon">
                    <Video size={19} />
                  </div>

                  {modality === "video" && (
                    <span className="modality-check">
                      <Check size={12} />
                    </span>
                  )}

                  <h4>Video Invitation Link</h4>

                  <p>
                    Meeting link sent directly to your registered email.
                  </p>

                  <span className="modality-note">
                    Join from Home
                  </span>
                </button>

              </div>
            </section>

            {/* Select Date */}
            <section className="booking-section">

              <div className="booking-section-heading">

                <h3>
                  <span className="step-number">2</span>
                  Select Date
                </h3>

                <span className="booking-month">
  <CalendarDays size={13} />
  {formattedMonth}
</span>

              </div>

            <div className="date-options">
  <button
    type="button"
    className="date-card selected"
    disabled={!appointmentDate}
  >
    <span className="date-day">
      {appointmentDate
        ? formattedDate.split(",")[0].slice(0, 3).toUpperCase()
        : "--"}
    </span>

    <strong>
      {appointmentDate
        ? new Date(`${appointmentDate}T00:00:00`).getDate()
        : "--"}
    </strong>

    <span className="date-month">
      {appointmentDate
        ? new Date(`${appointmentDate}T00:00:00`).toLocaleDateString("en-US", {
            month: "short",
          })
        : "--"}
    </span>

    <span className="date-status">
      {appointmentDate ? "Available" : "Unavailable"}
    </span>
  </button>
</div>
            </section>

            {/* Select Time */}
            <section className="booking-section">

              <div className="booking-section-heading">

                <h3>
                  <span className="step-number">3</span>
                  Select Time Slot
                </h3>

               <span className="available-slots">
  <span></span>
  {appointmentTime ? "Next available appointment" : "No available slots"}
</span>
              </div>

              <div className="time-options">
  <button
    type="button"
    className="time-card selected"
    disabled={!appointmentTime}
  >
    <Clock size={13} />
    <span>{formattedTime}</span>
    <Check size={14} />
  </button>
</div>
            </section>

          </div>

          {/* Booking Summary */}
          <aside className="booking-summary">

            <div className="summary-header">

              <div>
                <span>CHECKOUT</span>
                <h2>Booking Summary</h2>
              </div>

              <div className="summary-icon">
                <CalendarCheck size={19} />
              </div>

            </div>

            <div className="summary-details">

              <div className="summary-row">
                <span>Doctor:</span>
                <strong>{doctorName}</strong>
              </div>

              <div className="summary-row">
                <span>Specialty:</span>
                <strong>{doctorSpecialty}</strong>
              </div>

              <div className="summary-row">
                <span>Modality:</span>

                <strong className="summary-blue">
                  {modality === "in-person"
                    ? "In-Person (Room 304)"
                    : "Video Consultation"}
                </strong>
              </div>
<div className="summary-row">
  <span>Date:</span>
  <strong>{formattedDate}</strong>
</div>

             <div className="summary-row">
  <span>Time Slot:</span>
  <strong>{formattedTime} (30 min)</strong>
</div>

              <div className="summary-divider"></div>

              <div className="summary-row">
                <span>Consultation Fee</span>
                <strong>{doctorPrice} EGP</strong>
              </div>

              <div className="summary-row">
                <span>Clinika Platform Fee</span>
                <strong className="summary-green">
                  0 EGP (Waived)
                </strong>
              </div>

              <div className="summary-row">
                <span>Payment Mode</span>
                <strong>Payment at the clinic</strong>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-total">

                <div>
                  <h3>Total Due</h3>
                  <p>VAT inclusive where applicable</p>
                </div>

                <strong>
                  {doctorPrice}
                  <small> EGP</small>
                </strong>

              </div>

            </div>
<button
  type="button"
  className="confirm-booking-btn"
  onClick={handleConfirm}
  disabled={!doctor || loading}
>
  {loading ? "Booking..." : "Confirm Appointment"}
  <ArrowRight size={16} />
</button>
{error && (
  <p className="booking-error" role="alert">
    {error}
  </p>
)}
            {confirmed && (
              <div className="booking-success">
                <CheckCircle2 size={17} />
Appointment booked successfully!
              </div>
            )}

            <div className="summary-notes">

              <p>
                <CalendarCheck size={13} />
                Free cancellation up to 2 hours before visit
              </p>

              <p>
                <ShieldCheck size={13} />
                Syndicate compliant verified booking
              </p>

            </div>

          </aside>

        </div>

      </div>
    </>
  );
}
