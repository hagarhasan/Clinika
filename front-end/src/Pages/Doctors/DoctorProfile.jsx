import  { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../api";
import {
  Home,
  ChevronRight,
  Star,
  MapPin,
  Clock,
  CalendarDays,
  ShieldCheck,
  BadgeCheck,
  Video,
  UserRound,
  GraduationCap,
  Stethoscope,
  Languages,
  Heart,
  ArrowLeft,
} from "lucide-react";
import "./Doctors.css";
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
  const navigate = useNavigate();
  const location = useLocation();

  // بيانات الدكتور القادمة من صفحة Doctors
  const passedDoctor = location.state?.doctor;
const [doctor, setDoctor] = useState(passedDoctor || null);
const [loading, setLoading] = useState(!passedDoctor);
const [error, setError] = useState("");

const [selectedTime, setSelectedTime] = useState("");
const [availableSlots, setAvailableSlots] = useState([]);
const [slotsLoading, setSlotsLoading] = useState(false);
const [slotsError, setSlotsError] = useState("");
const [selectedDate, setSelectedDate] = useState(() =>
  formatLocalDate(new Date())
);

  // Fetch doctor data if not received through navigation
  
  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        setError("");

        if (passedDoctor && String(passedDoctor.id) === String(id)) {
          setDoctor(passedDoctor);
          setLoading(false);
          return;
        }

        setLoading(true);

        const response = await api.get("/doctors", {
          params: {
            limit: 20,
            offset: 0,
            sort: "recommended",
          },
        });

        const doctorFromApi = response.data.find(
          (item) => String(item.id) === String(id)
        );

        if (!doctorFromApi) {
          throw new Error("Doctor not found");
        }

        const data = await response.json();
        setDoctor(data);
      } catch {
        setError("Unable to load doctor profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [id, passedDoctor]);


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
    name: doctor.name || "Doctor Name",
    specialty:
      doctor.specialty ||
      doctor.specialization ||
      "Medical Specialist",

    clinic: doctor.clinic || "Medical Center",
    location: doctor.location || "",

    fee: doctor.fee || doctor.consultationFee || 0,

  rating: doctor.rating ?? 0,
    reviews: doctor.reviews || doctor.reviewCount || 0,

    experience: doctor.experience || 0,

    degree:
      doctor.degree ||
      doctor.qualification ||
      "",

    image:
      doctor.image ||
      doctor.profileImage ||
      "",

    gender: doctor.gender || "",

    about:
      doctor.about ||
      doctor.bio ||
      "Doctor profile information will be available soon.",

    languages: doctor.languages || ["English"],

    focusAreas: doctor.focusAreas || [],

    education: doctor.education || [],

    availableDays: doctor.availableDays || [],

    availableSlots: doctor.availableSlots || [],

    nextAvailable:
      doctor.nextAvailable ||
      doctor.availability ||
      "Available",

    nextAvailableTime: doctor.time || "",

    clinicAddress:
      doctor.clinicAddress ||
      doctor.address ||
      doctor.location ||
      "",

    verified: doctor.verified ?? false,
  };
const upcomingDates = getUpcomingDates(14);
  // Book appointment

const handleBookAppointment = () => {
  navigate(`/doctors/doctor_profile/${doctor.id}/book-appointment`, {
    state: {
      doctor: {
        ...doctor,
        clinicId: doctor.clinicId,
        appointmentDate: doctor.appointmentDate,
        startTime: doctor.startTime,
        fee: doctor.fee,
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
        <div className="doctor-profile-container">

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

          {/* Doctor Header */}
          <div className="profile-header-card">

            {/* Doctor Image */}
            {/* Doctor Image */}
<div className="profile-doctor-image">
  {doctorData.image && (
    <img
      src={doctorData.image}
      alt={doctorData.name}
      onError={(e) => {
        e.currentTarget.style.display = "none";
        e.currentTarget.nextElementSibling.style.display = "flex";
      }}
    />
  )}

  <UserRound
    size={55}
    style={{
      display: doctorData.image ? "none" : "flex",
    }}
  />
</div>
            {/* Doctor Information */}
            <div className="profile-header-info">

              <div className="profile-name-row">
                <h1>{doctorData.name}</h1>

                {doctorData.verified && (
                  <span className="profile-verified-badge">
                    <BadgeCheck size={14} />
                    Verified
                  </span>
                )}
              </div>

              <p className="profile-specialty">
                {doctorData.specialty}
              </p>

              <p className="profile-degree">
                {doctorData.degree}
              </p>

              <div className="profile-header-details">

                <span>
                  <Star
                    size={14}
                    fill="currentColor"
                    className="profile-star"
                  />

                  <strong>{doctorData.rating}</strong>
                  ({doctorData.reviews} patient reviews)
                </span>

                <span>
                  <Clock size={14} />
                  {doctorData.experience} Years Clinical Practice
                </span>

                <span>
                  <MapPin size={14} />
                  {doctorData.clinic}
                  {doctorData.location &&
                    `, ${doctorData.location}`}
                </span>

              </div>
            </div>

            {/* Consultation Fee */}
            <div className="profile-fee-card">

              <span>CONSULTATION FEE</span>

              <strong>
                {doctorData.fee}
                <small> EGP</small>
              </strong>

              <p>Per appointment</p>

              <div className="profile-fee-actions">

                <button
                  type="button"
                  onClick={handleBookAppointment}
                >
                  <CalendarDays size={14} />
                  Book Visit
                </button>

                <button type="button">
                  <Heart size={14} />
                  Save Doctor
                </button>

              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="profile-main-layout">

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
                        {area}
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
                            {item.title ||
                              item.degree ||
                              item.name}
                          </strong>

                          <p>
                            {item.institution ||
                              item.university ||
                              ""}
                          </p>

                          <small>
                            {item.year ||
                              item.date ||
                              ""}
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
            <aside className="profile-booking-card">

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
<div className="profile-date-options">
  {upcomingDates.map((date) => (
    <button
      type="button"
      key={date.value}
      className={selectedDate === date.value ? "active" : ""}
      onClick={() => {
        setSelectedDate(date.value);
        setSelectedTime("");
      }}
    >
      <span>{date.day}</span>
      <strong>{date.number}</strong>
    </button>
  ))}
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
             {/* Times */}
<div className="profile-time-slots">
  {slotsLoading ? (
    <p>Loading available slots...</p>
  ) : slotsError ? (
    <p>{slotsError}</p>
  ) : availableSlots.length > 0 ? (
    availableSlots.map((slot, index) => {
      const time =
        typeof slot === "string" ? slot : slot.time;

      return (
        <button
          type="button"
          key={index}
          className={selectedTime === time ? "active" : ""}
          onClick={() => setSelectedTime(time)}
        >
          {time}
        </button>
      );
    })
  ) : (
    <p>No available slots for this date.</p>
  )}
</div>

              {/* Appointment Summary */}
              <div className="profile-booking-summary">

                <CalendarDays size={15} />

                <div>
                  <strong>Appointment Summary</strong>

                  <p>
                    {doctorData.nextAvailable}

                    {doctorData.nextAvailableTime &&
                      ` - ${doctorData.nextAvailableTime}`}
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

            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
