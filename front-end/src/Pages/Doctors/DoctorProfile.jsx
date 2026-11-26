import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  useDoctor,
  useDoctorAvailability,
  useDoctorReviews,
  useDoctorSlots,
} from "../../hooks/useDoctors";
import {
  formatName,
  formatTime,
  formatAvailability,
} from "../../utils/format";
import {
  Home,
  ChevronRight,
  Star,
  MapPin,
  CalendarDays,
  ShieldCheck,
  Video,
  UserRound,
  GraduationCap,
  Stethoscope,
  Languages,
  ArrowLeft,
} from "lucide-react";
import "./Doctors.css";
import { useAuth } from "../../context/AuthContext";
import DoctorProfileHeader from "../../Components/Doctors/DoctorProfileHeader";
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
      day: date.toLocaleDateString("en-US", {
        weekday: "short",
      }),
      number: date.getDate(),
    };
  });
};
export default function DoctorProfile() {
  const { id } = useParams();
  const doctorQuery = useDoctor(id);
  const availabilityQuery = useDoctorAvailability(id);
  useDoctorReviews(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { role, user } = useAuth();

  // بيانات الدكتور القادمة من صفحة Doctors
  const passedDoctor = location.state?.doctor;
  const [doctor, setDoctor] = useState(passedDoctor || null);
  const [loading, setLoading] = useState(!passedDoctor);
  const [error, setError] = useState("");

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

  const [selectedDate, setSelectedDate] = useState(() =>
    passedDoctor?.appointmentDate || formatLocalDate(new Date())
  );
  const [selectedTime, setSelectedTime] = useState(() => passedDoctor?.startTime || "");
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Automatically select the first available date if current selectedDate is not available
  useEffect(() => {
    if (availabilityMap.size > 0) {
      const currentItem = availabilityMap.get(selectedDate);
      const isCurrentAvailable = currentItem
        ? currentItem.is_working_day && currentItem.available_slots > 0
        : false;
      if (!isCurrentAvailable) {
        const firstAvailable = upcomingDates.find((d) => {
          const item = availabilityMap.get(d.value);
          return item && item.is_working_day && item.available_slots > 0;
        });
        if (firstAvailable) {
          setSelectedDate(firstAvailable.value);
          setSelectedTime("");
          setSelectedSlot(null);
        }
      }
    }
  }, [availabilityMap, selectedDate, upcomingDates]);

  // Fetch real available slots for selected doctor and date
  const slotsQuery = useDoctorSlots(id, selectedDate);
  const availableSlots = Array.isArray(slotsQuery.data) ? slotsQuery.data : [];
  const slotsLoading = slotsQuery.isLoading;
  const slotsError = slotsQuery.error?.message || "";

  // Fetch doctor data if not received through navigation
  useEffect(() => {
    if (passedDoctor && String(passedDoctor.id) === String(id)) {
      setDoctor(passedDoctor);
      setLoading(false);
      setError("");
      return;
    }
    if (doctorQuery.isLoading) {
      setLoading(true);
      setError("");
      return;
    }
    if (doctorQuery.isError) {
      setLoading(false);
      setError("Unable to load doctor profile.");
      return;
    }
    if (doctorQuery.data) {
      setDoctor(doctorQuery.data);
      setLoading(false);
      setError("");
    }
  }, [id, passedDoctor, doctorQuery.data, doctorQuery.isLoading, doctorQuery.isError]);


  // Loading
  if (loading) {
    return (
      <>
        <Helmet>
          <title>Doctor Profile | Clinika</title>
        </Helmet>

        <div className="doctor-profile-loading">
          Loading doctor profile...
        </div>
      </>
    );
  }

  // Error
  if (error || !doctor) {
    return (
      <>
        <Helmet>
          <title>Doctor Not Found | Clinika</title>
        </Helmet>

        <div className="doctor-profile-error">
          <h2>Doctor not found</h2>
          <p>We couldn't find this doctor's profile.</p>

          <Link to="/doctors" className="profile-back-btn">
            <ArrowLeft size={16} />
            Back to Doctors
          </Link>
        </div>
      </>
    );
  }

  // Doctor data
  const doctorData = {
    name: formatName(doctor.name || doctor.full_name || "Doctor Name"),
    specialty:
      typeof doctor.specialty === "object"
        ? doctor.specialty?.name || "Medical Specialist"
        : doctor.specialty || doctor.specialization || "Medical Specialist",

    clinic:
      typeof doctor.clinic === "object"
        ? doctor.clinic?.name || "Medical Center"
        : doctor.clinic || "Medical Center",
    location:
      typeof doctor.location === "object"
        ? doctor.location?.city || doctor.location?.name || ""
        : doctor.location || (typeof doctor.clinic === "object" ? doctor.clinic?.city : "") || "",

    fee: doctor.fee || doctor.consultation_fee || doctor.consultationFee || 0,

    rating: doctor.rating ?? doctor.rating_avg ?? 0,
    reviews: doctor.reviews ?? doctor.reviews_count ?? doctor.reviewCount ?? 0,

    experience: doctor.experience ?? doctor.years_of_experience ?? 0,

    degree:
      doctor.degree ||
      doctor.title ||
      doctor.qualification ||
      "",

    image:
      doctor.image ||
      doctor.photo_url ||
      doctor.profileImage ||
      "",

    gender: doctor.gender || "",

    about:
      doctor.about ||
      doctor.bio ||
      "Doctor profile information will be available soon.",

    languages: doctor.languages || ["English"],

    focusAreas: doctor.focus_areas || doctor.focusAreas || [],

    education:
      Array.isArray(doctor.credentials) && doctor.credentials.length > 0
        ? doctor.credentials
        : Array.isArray(doctor.education)
        ? doctor.education
        : [],

    availableDays: doctor.availableDays || [],

    availableSlots: doctor.availableSlots || [],

    nextAvailable: doctor.next_available
      ? formatAvailability(doctor.next_available)
      : doctor.nextAvailable || doctor.availability || "Available",

    nextAvailableTime: doctor.next_available?.start_time
      ? formatTime(doctor.next_available.start_time)
      : doctor.time || "",

    clinicAddress:
      doctor.clinicAddress ||
      (typeof doctor.clinic === "object" ? doctor.clinic?.address || doctor.clinic?.city : "") ||
      doctor.address ||
      doctor.location ||
      "",

    verified: doctor.is_verified ?? doctor.verified ?? false,
  };
  const isOwnDoctorProfile =
    role === "doctor" && Number(doctor.user_id) === Number(user?.id);
  // Book appointment
  const handleBookAppointment = () => {
    navigate(`/doctors/doctor_profile/${doctor.id}/book-appointment`, {
      state: {
        doctor: {
          ...doctor,
          id: doctor.id,
          name: doctorData.name,
          specialty: doctorData.specialty,
          clinic: doctorData.clinic,
          clinicId:
            selectedSlot?.clinic_id ||
            doctor.clinic_id ||
            (typeof doctor.clinic === "object" ? doctor.clinic?.id : null),
          appointmentDate: selectedDate,
          startTime: selectedTime || doctor.next_available?.start_time || "",
          fee: doctorData.fee,
          image: doctorData.image,
          selectedSlot: selectedSlot || null,
        },
      },
    });
  };

  return (
    <>
      <Helmet>
        <title>Doctor Profile | Clinika</title>
      </Helmet>

      <section className="doctor-profile-page">
        <div className="container doctor-profile-container">

          {/* Breadcrumb */}
          <div className="profile-breadcrumb">
            <Link to="/">
              <Home size={13} />
              Home
            </Link>

            <ChevronRight size={13} />

            <Link to="/doctors">
              Find Doctors
            </Link>

            <ChevronRight size={13} />

            <span>{doctorData.name}</span>
          </div>

          <DoctorProfileHeader
            doctor={doctorData}
            isOwnProfile={isOwnDoctorProfile}
            onBook={handleBookAppointment}
          />

          {/* Main Content */}
          <div className={`profile-main-layout ${isOwnDoctorProfile ? "profile-main-layout--self" : ""}`}>

            {/* Left Content */}
            <div className="profile-content">

              {/* About Doctor */}
              <section className="profile-section-card">

                <h3>
                  <span className="profile-section-icon">
                    <UserRound size={16} />
                  </span>

                  About the Doctor
                </h3>

                <p className="profile-about-text">
                  {doctorData.about}
                </p>

                <div className="profile-languages">

                  <div>
                    <Languages size={15} />
                    <span>Languages Spoken</span>
                  </div>

                  <strong>
                    {Array.isArray(doctorData.languages)
                      ? doctorData.languages.join(", ")
                      : doctorData.languages}
                  </strong>

                </div>
              </section>

              {/* Clinical Focus Areas */}
              <section className="profile-section-card">

                <h3>
                  <span className="profile-section-icon">
                    <Stethoscope size={16} />
                  </span>

                  Key Clinical Focus Areas
                </h3>

                <p className="profile-section-description">
                  Specialized treatments and medical services
                  offered by the doctor.
                </p>

                <div className="profile-focus-list">

                  {doctorData.focusAreas.length > 0 ? (
                    doctorData.focusAreas.map((area, index) => (
                      <span
                        key={index}
                        className="profile-focus-tag"
                      >
                        <ShieldCheck size={12} />
                        {typeof area === "object" ? area.name || area.title || "" : area}
                      </span>
                    ))
                  ) : (
                    <span className="profile-empty-text">
                      Clinical focus areas will be updated soon.
                    </span>
                  )}

                </div>
              </section>

              {/* Education */}
              <section className="profile-section-card">

                <h3>
                  <span className="profile-section-icon">
                    <GraduationCap size={16} />
                  </span>

                  Education & Credentials
                </h3>

                <div className="profile-education-list">

                  {doctorData.education.length > 0 ? (
                    doctorData.education.map((item, index) => (
                      <div
                        className="profile-education-item"
                        key={index}
                      >
                        <span className="education-icon">
                          <GraduationCap size={15} />
                        </span>

                        <div>
                          <strong>
                            {typeof item === "object"
                              ? item.title || item.degree || item.name || ""
                              : item}
                          </strong>

                          <p>
                            {typeof item === "object"
                              ? item.institution || item.university || ""
                              : ""}
                          </p>

                          <small>
                            {typeof item === "object"
                              ? item.year || item.date || ""
                              : ""}
                          </small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="profile-education-item">

                      <span className="education-icon">
                        <GraduationCap size={15} />
                      </span>

                      <div>
                        <strong>
                          {doctorData.degree ||
                            "Medical Degree"}
                        </strong>

                        <p>Education details</p>
                      </div>

                    </div>
                  )}

                </div>
              </section>

              {/* Clinic Location */}
              <section className="profile-section-card">

                <h3>
                  <span className="profile-section-icon">
                    <MapPin size={16} />
                  </span>

                  Clinic Location
                </h3>

                <div className="profile-clinic-info">
                  <strong>{doctorData.clinic}</strong>
                  <p>{doctorData.clinicAddress}</p>
                </div>

                <div className="profile-map-placeholder">

                  <MapPin size={30} />

                  <span>
                    {doctorData.location ||
                      "Clinic Location"}
                  </span>

                  {doctorData.clinicAddress && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        doctorData.clinicAddress
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on Google Maps
                    </a>
                  )}

                </div>
              </section>

              {/* Reviews */}
              <section className="profile-section-card">

                <h3>
                  <span className="profile-section-icon">
                    <Star size={16} />
                  </span>

                  Verified Patient Reviews
                </h3>

                <div className="profile-reviews-header">

                  <div>
                    <strong>{doctorData.rating}</strong>
                    <span>/ 5.0</span>
                  </div>

                  <div className="profile-reviews-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={13}
                        fill="currentColor"
                      />
                    ))}
                  </div>

                  <span>{doctorData.reviews} Reviews</span>

                </div>

                <div className="profile-review-placeholder">
                  <p>
                    Patient reviews will be displayed here.
                  </p>
                </div>

              </section>
            </div>

            {/* Booking Sidebar */}
            {!isOwnDoctorProfile && <aside className="profile-booking-card">

              {/* Booking Header */}
              <div className="profile-booking-title">

                <div>
                  <h3>Book an Appointment</h3>

                  <p>
                    Select your preferred date, time and visit type.
                  </p>
                </div>

                <span className="booking-calendar-icon">
                  <CalendarDays size={15} />
                </span>

              </div>

              {/* Consultation Type */}
              <h4>Consultation Type</h4>

              <div className="profile-consultation-options">

                <button
                  type="button"
                  className="consultation-option active"
                >
                  <Stethoscope size={15} />

                  <div>
                    <strong>In-Person Visit</strong>
                    <small>At clinic</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="consultation-option"
                >
                  <Video size={15} />

                  <div>
                    <strong>Video Consult</strong>
                    <small>Online session</small>
                  </div>
                </button>

              </div>

              {/* Selected Date */}
              <div className="profile-date-header">

                <h4>Selected Date</h4>

                <button type="button">
                  View More
                </button>

              </div>

              {/* Dates */}
            {/* Dates */}
              {/* Dates */}
              <div className="profile-date-options">
                {upcomingDates.map((date) => {
                  const availItem = availabilityMap.get(date.value);
                  const isAvailable =
                    availabilityMap.size === 0 ||
                    (availItem ? availItem.is_working_day && availItem.available_slots > 0 : false);
                  const isSelected = selectedDate === date.value;

                  return (
                    <button
                      type="button"
                      key={date.value}
                      className={isSelected ? "active" : ""}
                      disabled={!isAvailable}
                      title={!isAvailable ? "Doctor not available on this date" : ""}
                      onClick={() => {
                        if (!isAvailable) return;
                        setSelectedDate(date.value);
                        setSelectedTime("");
                        setSelectedSlot(null);
                      }}
                    >
                      <span>{date.day}</span>
                      <strong>{date.number}</strong>
                    </button>
                  );
                })}
              </div>

              {/* Available Slots */}
              <div className="profile-slots-header">
                <h4>Available Slots</h4>
                <span>
                  <span className="slots-green-dot"></span>
                  Slots open
                </span>
              </div>

              {/* Times */}
              <div className="profile-time-slots">
                {slotsLoading ? (
                  <p>Loading available slots...</p>
                ) : slotsError ? (
                  <p className="text-danger">{slotsError}</p>
                ) : availableSlots.length > 0 ? (
                  availableSlots
                    .filter((slot) => slot.is_available !== false)
                    .map((slot, index) => {
                      const rawTime = slot.start_time || slot.time || slot;
                      const displayTime = formatTime(rawTime);
                      const isSelected = selectedTime === rawTime;

                      return (
                        <button
                          type="button"
                          key={slot.id || index}
                          className={isSelected ? "active" : ""}
                          onClick={() => {
                            setSelectedTime(rawTime);
                            setSelectedSlot(slot);
                          }}
                        >
                          {displayTime}
                        </button>
                      );
                    })
                ) : (
                  <p className="text-muted">No available slots for this date.</p>
                )}
              </div>

              {/* Appointment Summary */}
              <div className="profile-booking-summary">
                <CalendarDays size={15} />
                <div>
                  <strong>Appointment Summary</strong>
                  <p>
                    {selectedTime ? (
                      formatAvailability({
                        appointment_date: selectedDate,
                        start_time: selectedTime,
                      })
                    ) : doctor.next_available ? (
                      `Next available: ${formatAvailability(doctor.next_available)}`
                    ) : (
                      "Select a date and time slot"
                    )}
                  </p>
                </div>
              </div>

              {/* Confirm Booking */}
   <button
  type="button"
  className="confirm-booking-btn"
  onClick={handleBookAppointment}
>
  <span>Confirm & Book Appointment</span>
  <ChevronRight size={17} />
</button>

              {/* Booking Note */}
              <div className="profile-booking-note">
                <ShieldCheck size={13} />
                Instant confirmation • No payment required
              </div>

              <p className="profile-booking-fee">
                Consultation Fee: {doctorData.fee} EGP
              </p>

            </aside>}
          </div>
        </div>
      </section>
    </>
  );
}
