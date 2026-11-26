
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useLocation } from "react-router-dom";
import { useCreateAppointment } from "../../hooks/useAppointments";
import { useToast } from "../../context/ToastContext";
import {
  useDoctor,
  useDoctorAvailability,
  useDoctorSlots,
} from "../../hooks/useDoctors";
import { formatName, formatTime } from "../../utils/format";
import {
  Home,
  ShieldCheck,
  Clock,
  ArrowRight,
  Building2,
  Video,
  CalendarDays,
  CalendarCheck,
  Check,
  CheckCircle2,
} from "lucide-react";

import "./BookAppointment.css";
import { useAuth } from "../../context/AuthContext";
import BookingAccessNotice from "../../Components/Booking/BookingAccessNotice";
import BookingDoctorCard from "../../Components/Booking/BookingDoctorCard";

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getUpcomingDates = (days = 14) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    return {
      value: formatLocalDate(date),
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      number: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
    };
  });
};

export default function BookAppointment() {
  const { id } = useParams();
  const location = useLocation();
  const createAppointment = useCreateAppointment();
  const { showToast } = useToast();
  const { token, role, loading: authLoading } = useAuth();

  const doctorQuery = useDoctor(id);
  const availabilityQuery = useDoctorAvailability(id);

  // Doctor data received from DoctorProfile or fallback to query
  const passedDoctor = location.state?.doctor;
  const doctor =
    passedDoctor && String(passedDoctor.id) === String(id)
      ? passedDoctor
      : doctorQuery.data || null;

  const doctorName = formatName(doctor?.name || doctor?.full_name || "Doctor");

  const doctorSpecialty =
    typeof doctor?.specialty === "object"
      ? doctor?.specialty?.name || "Specialty unavailable"
      : doctor?.specialty || "Specialty unavailable";

  const doctorLocation =
    typeof doctor?.location === "object"
      ? doctor?.location?.city || doctor?.location?.name || "Location unavailable"
      : typeof doctor?.clinic === "object"
      ? doctor?.clinic?.city || doctor?.clinic?.name || "Location unavailable"
      : doctor?.location || "Location unavailable";

  const doctorPrice = doctor?.fee ?? doctor?.consultation_fee ?? doctor?.consultationFee ?? 0;
  const doctorImage = doctor?.image || doctor?.photo_url || "";

  // Original profile URL
  const profilePath = location.state?.from || `/doctors/doctor_profile/${id}`;

  const [modality, setModality] = useState("in-person");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAccessNotice, setShowAccessNotice] = useState(false);

  const upcomingDates = useMemo(() => getUpcomingDates(14), []);

  const availabilityMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(availabilityQuery.data)) {
      for (const item of availabilityQuery.data) {
        map.set(item.date, item);
      }
    }
    return map;
  }, [availabilityQuery.data]);

  const [selectedDate, setSelectedDate] = useState(
    () => passedDoctor?.appointmentDate || ""
  );
  const [selectedTime, setSelectedTime] = useState(
    () => passedDoctor?.startTime || ""
  );
  const [selectedSlot, setSelectedSlot] = useState(
    () => passedDoctor?.selectedSlot || null
  );

  // Initialize or ensure selectedDate is valid
  useEffect(() => {
    if (!selectedDate) {
      if (passedDoctor?.appointmentDate) {
        setSelectedDate(passedDoctor.appointmentDate);
      } else if (doctor?.next_available?.appointment_date) {
        setSelectedDate(doctor.next_available.appointment_date);
      } else if (availabilityMap.size > 0) {
        const firstAvail = upcomingDates.find((d) => {
          const item = availabilityMap.get(d.value);
          return item && item.is_working_day && item.available_slots > 0;
        });
        if (firstAvail) setSelectedDate(firstAvail.value);
      }
    }
  }, [selectedDate, passedDoctor, doctor, availabilityMap, upcomingDates]);

  // Fetch real available slots for selected doctor and date
  const slotsQuery = useDoctorSlots(id, selectedDate);
  const availableSlots = useMemo(
    () => (Array.isArray(slotsQuery.data) ? slotsQuery.data : []),
    [slotsQuery.data]
  );

  // If selectedTime is not set and slots arrive, select first slot
  useEffect(() => {
    if (availableSlots.length > 0 && !selectedTime) {
      const first = availableSlots.find((s) => s.is_available !== false);
      if (first) {
        setSelectedTime(first.start_time);
        setSelectedSlot(first);
      }
    }
  }, [availableSlots, selectedTime]);

  const formattedDate = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "No date selected";

  const formattedMonth = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Availability unavailable";

  const formattedTime = selectedTime
    ? formatTime(selectedTime)
    : "No time selected";

  const handleConfirm = async () => {
    if (authLoading) return;

    if (!token || role !== "patient") {
      setShowAccessNotice(true);
      return;
    }

    setShowAccessNotice(false);
    setError("");
    setConfirmed(false);

    if (!doctor) {
      setError("Doctor information is unavailable.");
      return;
    }

    if (!selectedDate || !selectedTime) {
      setError("Please select both an appointment date and time slot.");
      return;
    }

    const clinicId =
      selectedSlot?.clinic_id ||
      doctor.clinicId ||
      doctor.clinic_id ||
      (typeof doctor.clinic === "object" ? doctor.clinic?.id : null);

    if (!clinicId) {
      setError("Clinic information is missing.");
      return;
    }

    setLoading(true);

    try {
      await createAppointment.mutateAsync({
        doctor_id: Number(doctor.id || id),
        appointment_date: selectedDate,
        start_time: selectedTime,
        reason: "General consultation",
        consultation_type: modality === "in-person" ? "in_person" : "video",
        clinic_id: Number(clinicId),
      });

      setConfirmed(true);
      showToast({
        type: "success",
        title: "Appointment booked",
        message: "Your appointment was booked successfully.",
      });
    } catch (err) {
      setError(
        err?.message || "Unable to book appointment. Please try again."
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
        <div className="container booking-container py-4 py-lg-5">

        {/* Breadcrumb */}
        <nav className="booking-breadcrumb d-flex flex-wrap align-items-center gap-2" aria-label="Breadcrumb">

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

        </nav>

        {/* Heading */}
        <div className="booking-heading d-flex flex-wrap align-items-center justify-content-between gap-3">
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

        <BookingDoctorCard
          doctor={doctor}
          name={doctorName}
          specialty={doctorSpecialty}
          location={doctorLocation}
          price={doctorPrice}
          image={doctorImage}
        />

        {/* Booking Content */}
        <div className="booking-layout row g-4 align-items-start">

          <div className="booking-main col-12 col-xl-8">

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
                {upcomingDates.slice(0, 10).map((d) => {
                  const availItem = availabilityMap.get(d.value);
                  const isAvail =
                    availabilityMap.size === 0 ||
                    (availItem ? availItem.is_working_day && availItem.available_slots > 0 : false);
                  const isSelected = selectedDate === d.value;

                  return (
                    <button
                      type="button"
                      key={d.value}
                      className={`date-card ${isSelected ? "selected" : ""} ${
                        !isAvail ? "disabled" : ""
                      }`}
                      disabled={!isAvail}
                      onClick={() => {
                        setSelectedDate(d.value);
                        setSelectedTime("");
                        setSelectedSlot(null);
                      }}
                    >
                      <span className="date-day">{d.day.toUpperCase()}</span>

                      <strong>{d.number}</strong>

                      <span className="date-month">{d.month}</span>

                      <span className="date-status">
                        {isAvail ? "Available" : "Unavailable"}
                      </span>
                    </button>
                  );
                })}
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
                  {availableSlots.length > 0
                    ? `${availableSlots.filter((s) => s.is_available !== false).length} slots open`
                    : "No available slots"}
                </span>
              </div>

              <div className="time-options">
                {slotsQuery.isLoading ? (
                  <p className="cl-pd-muted" style={{ gridColumn: "1 / -1", margin: "10px 0" }}>
                    Loading available slots...
                  </p>
                ) : availableSlots.length > 0 ? (
                  availableSlots
                    .filter((slot) => slot.is_available !== false)
                    .map((slot, index) => {
                      const rawTime = slot.start_time;
                      const displayTime = formatTime(rawTime);
                      const isSelected = selectedTime === rawTime;

                      return (
                        <button
                          type="button"
                          key={slot.id || index}
                          className={`time-card ${isSelected ? "selected" : ""}`}
                          onClick={() => {
                            setSelectedTime(rawTime);
                            setSelectedSlot(slot);
                          }}
                        >
                          <Clock size={13} />
                          <span>{displayTime}</span>
                          <span className="time-dot"></span>
                        </button>
                      );
                    })
                ) : (
                  <p className="cl-pd-muted" style={{ gridColumn: "1 / -1", margin: "10px 0" }}>
                    No available time slots for this date.
                  </p>
                )}
              </div>
            </section>

          </div>

          {/* Booking Summary */}
          <aside className="booking-summary col-12 col-xl-4">

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
  className="confirm-booking-btn btn btn-primary"
  onClick={handleConfirm}
  disabled={!doctor || loading || authLoading}
>
  {authLoading ? "Checking account..." : loading ? "Booking..." : "Confirm Appointment"}
  <ArrowRight size={16} />
</button>
{showAccessNotice && <BookingAccessNotice />}
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
      </div>
    </>
  );
}
