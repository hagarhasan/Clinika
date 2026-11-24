
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import {
  Home,
  ChevronRight,
  ChevronDown,
  Search,
  MapPin,
  Stethoscope,
  ShieldCheck,
  Filter,
  RotateCcw,
  Star,
  Clock,
  UserRound,
  BadgeCheck,
} from "lucide-react";

import "./Doctors.css";

const doctorsData = [
  {
    id: 1,
    name: "Dr. Maya Bennett",
    specialty: "Primary Care & Family Medicine",
    category: "Primary Care & Family",
    location: "New Cairo",
    clinic: "Clinika Care Center",
    degree: "MD, Board Certified in Family Medicine",
    experience: 12,
    fee: 550,
    rating: 4.9,
    reviews: 128,
    availability: "Today",
    time: "2:30 PM",
    gender: "Female",
    image: "/images/doctors/maya.jpg",
  },
  {
    id: 2,
    name: "Dr. Daniel Park",
    specialty: "Senior Consultant Cardiologist",
    category: "Cardiology",
    location: "Maadi",
    clinic: "Heart & Vascular Pavilion",
    degree: "FACC, Fellow of American College of Cardiology",
    experience: 15,
    fee: 850,
    rating: 4.8,
    reviews: 94,
    availability: "Tomorrow",
    time: "10:00 AM",
    gender: "Male",
    image: "/images/doctors/daniel.jpg",
  },
  {
    id: 3,
    name: "Dr. Elena Rossi",
    specialty: "Consultant Dermatologist & Aesthetic Specialist",
    category: "Dermatology",
    location: "Zamalek",
    clinic: "Clinika Derma & Laser",
    degree: "MSc Dermatology, European Academy",
    experience: 9,
    fee: 650,
    rating: 4.9,
    reviews: 215,
    availability: "Today",
    time: "4:00 PM",
    gender: "Female",
    image: "/images/doctors/elena.jpg",
  },
  {
    id: 4,
    name: "Dr. James Morgan",
    specialty: "Orthopedic Surgery Consultant",
    category: "Orthopedics",
    location: "Sheikh Zayed",
    clinic: "Ortho Medical Center",
    degree: "MD, Orthopedic Surgery",
    experience: 14,
    fee: 800,
    rating: 4.8,
    reviews: 180,
    availability: "This Week",
    time: "Thursday, 12:00 PM",
    gender: "Male",
    image: "/images/doctors/james.jpg",
  },
  {
    id: 5,
    name: "Dr. Sarah Ahmed",
    specialty: "Pediatric Specialist",
    category: "Pediatrics",
    location: "New Cairo",
    clinic: "Kids Care Clinic",
    degree: "MD, Pediatrics",
    experience: 8,
    fee: 450,
    rating: 4.9,
    reviews: 156,
    availability: "Tomorrow",
    time: "1:00 PM",
    gender: "Female",
    image: "/images/doctors/sarah.jpg",
  },
  {
    id: 6,
    name: "Dr. Omar Hassan",
    specialty: "Neurology Consultant",
    category: "Neurology",
    location: "Maadi",
    clinic: "Neuro Health Center",
    degree: "MD, Neurology",
    experience: 11,
    fee: 700,
    rating: 4.7,
    reviews: 82,
    availability: "Today",
    time: "6:00 PM",
    gender: "Male",
    image: "/images/doctors/omar.jpg",
  },
];

const specialties = [
  "Primary Care & Family",
  "Cardiology",
  "Dermatology",
  "Pediatrics",
  "Orthopedics",
  "Neurology",
];

const locations = [
    "Qena",
  "New Cairo",
  "Maadi",
  "Zamalek",
  "Dokki",
  "Sheikh Zayed",
  "Heliopolis",
];

export default function Doctors() {
  const navigate = useNavigate();

  // API Data
  const [doctorsData, setDoctorsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        setApiError("");

        const response = await api.get("/doctors", {
          params: {
            limit: 20,
            offset: 0,
            sort: "recommended",
          },
        });

       
const formattedDoctors = response.data.map((doctor) => {
  const nextAvailable = doctor.next_available;
  const appointmentDate = nextAvailable?.appointment_date;

  let doctorAvailability = "This Week";

  if (appointmentDate) {
    const today = new Date();
    const appointment = new Date(`${appointmentDate}T00:00:00`);

    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const difference = Math.round(
      (appointment - todayDate) / (1000 * 60 * 60 * 24)
    );

    if (difference === 0) {
      doctorAvailability = "Today";
    } else if (difference === 1) {
      doctorAvailability = "Tomorrow";
    } else if (difference < 0 || difference > 7) {
      doctorAvailability = "Unavailable";
    }
  } else {
    doctorAvailability = "Unavailable";
  }

  return {
    id: doctor.id,
    name: doctor.full_name,
    specialty: doctor.specialty?.name || "Specialty not specified",
    category: doctor.specialty?.name || "",
    location: doctor.clinic?.city || "Location not specified",
    clinic: doctor.clinic?.name || "Clinic not specified",
    degree: doctor.title || "Credentials not provided",
    experience: doctor.years_of_experience ?? 0,
    fee: doctor.consultation_fee ?? 0,
    rating: doctor.rating_avg,
    reviews: doctor.reviews_count ?? 0,
    availability: doctorAvailability,
    time: nextAvailable?.start_time || "Not available",
    gender: doctor.gender || "",
    image: doctor.photo_url || "",

    clinicId: doctor.clinic?.id || nextAvailable?.clinic_id || null,
    appointmentDate: nextAvailable?.appointment_date || "",
    startTime: nextAvailable?.start_time || "",
  };
});


        setDoctorsData(formattedDoctors);

      } catch (err) {
        setApiError(
          err.response?.data?.detail ||
          "Failed to load doctors. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // Search
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("All Locations");
  const [specialty, setSpecialty] = useState("All Specialties");

  // Filters
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [feeFilter, setFeeFilter] = useState("all");
  const [availability, setAvailability] = useState("Anytime");
  const [gender, setGender] = useState("All");

  // Sorting
  const [sortBy, setSortBy] = useState("Recommended");

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const handleCheckbox = (value, setter, currentValues) => {
    setter(
      currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value]
    );
  };

  const resetFilters = () => {
    setSelectedSpecialties([]);
    setSelectedLocations([]);
    setFeeFilter("all");
    setAvailability("Anytime");
    setGender("All");
    setKeyword("");
    setLocation("All Locations");
    setSpecialty("All Specialties");
    setSortBy("Recommended");
  };

  // Filter Doctors
  const filteredDoctors = doctorsData.filter((doctor) => {
    const searchText = keyword.toLowerCase();

    const matchesKeyword =
      doctor.name.toLowerCase().includes(searchText) ||
      doctor.specialty.toLowerCase().includes(searchText) ||
      doctor.clinic.toLowerCase().includes(searchText);

    const matchesSearchLocation =
      location === "All Locations" || doctor.location === location;

    const matchesSearchSpecialty =
      specialty === "All Specialties" ||
      doctor.category === specialty;

    const matchesSpecialtyFilter =
      selectedSpecialties.length === 0 ||
      selectedSpecialties.includes(doctor.category);

    const matchesLocationFilter =
      selectedLocations.length === 0 ||
      selectedLocations.includes(doctor.location);

    const matchesFee =
      feeFilter === "all" ||
      (feeFilter === "under500" && doctor.fee < 500) ||
      (feeFilter === "500-800" && doctor.fee >= 500 && doctor.fee <= 800) ||
      (feeFilter === "800plus" && doctor.fee > 800);

    const matchesAvailability =
      availability === "Anytime" ||
      doctor.availability === availability;

    const matchesGender =
      gender === "All" || doctor.gender === gender;

    return (
      matchesKeyword &&
      matchesSearchLocation &&
      matchesSearchSpecialty &&
      matchesSpecialtyFilter &&
      matchesLocationFilter &&
      matchesFee &&
      matchesAvailability &&
      matchesGender
    );
  });

  // Sorting
  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    if (sortBy === "Highest Rated") {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }

    if (sortBy === "Lowest Fee") {
      return a.fee - b.fee;
    }

    if (sortBy === "Most Experienced") {
      return b.experience - a.experience;
    }

    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  return (
    <section className="doctors-page">
      <div className="doctors-container">

        {/* Breadcrumb */}
        <div className="doctors-breadcrumb">
          <Link to="/">
            <Home size={14} />
            <span>Home</span>
          </Link>

          <ChevronRight className="breadcrumb-arrow" size={14} />

          <span className="breadcrumb-active">
            Find Doctors
          </span>
        </div>

        {/* Hero Section */}
        <div className="doctors-hero">
          <div className="doctors-heading">
            <span className="verified-badge">
              VERIFIED MEDICAL NETWORK
            </span>

            <h2>Find Your Doctor</h2>

            <p>
              Find the right licensed specialist and book your clinical
              appointment with seamless administrative coordination.
            </p>
          </div>

          {/* Trust Badges */}
          <div className="doctors-trust">
            <div className="trust-item">
              <span className="status-dot"></span>
              <span>Real-time Slots Synced</span>
            </div>

            <div className="trust-item">
              <ShieldCheck size={15} />
              <span>Credentialed Providers</span>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <form
          className="doctors-search-box"
          onSubmit={handleSearch}
        >
          {/* Keyword */}
          <div className="search-field keyword-field">
            <Search size={19} />

            <div className="field-content">
              <label htmlFor="doctor-keyword">
                Search Keyword
              </label>

              <input
                id="doctor-keyword"
                type="text"
                placeholder="Doctor name, specialty, or clinic..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <div className="search-field select-field">
            <MapPin size={20} />

            <div className="field-content">
              <label htmlFor="doctor-location">
                Location
              </label>

              <select
                id="doctor-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="All Locations">All Locations</option>
                {locations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <ChevronDown size={13} />
          </div>

          {/* Specialty */}
          <div className="search-field select-field">
            <Stethoscope size={20} />

            <div className="field-content">
              <label htmlFor="doctor-specialty">
                Specialty
              </label>

              <select
                id="doctor-specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              >
                <option value="All Specialties">
                  All Specialties
                </option>

                {specialties.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <ChevronDown size={13} />
          </div>

          {/* Search Button */}
          <button type="submit" className="doctors-search-btn">
            <Search size={18} />
            <span>Search</span>
          </button>
        </form>

        {/* ================================
            DOCTORS RESULTS SECTION
        ================================ */}

        <div className="doctors-results-layout">

          {/* FILTER SIDEBAR */}
          <aside className="doctors-filter-sidebar">

            <div className="filter-header">
              <div className="filter-title">
                <Filter size={15} />
                <span>Filter By</span>
              </div>

              <button
                className="reset-filters"
                onClick={resetFilters}
                type="button"
              >
                <RotateCcw size={12} />
                Reset all
              </button>
            </div>

            {/* Specialty Filter */}
            <div className="filter-group">
              <h4>MEDICAL SPECIALTY</h4>

              {specialties.map((item) => (
                <label className="filter-checkbox" key={item}>
                  <input
                    type="checkbox"
                    checked={selectedSpecialties.includes(item)}
                    onChange={() =>
                      handleCheckbox(
                        item,
                        setSelectedSpecialties,
                        selectedSpecialties
                      )
                    }
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>

            {/* Location Filter */}
            <div className="filter-group location-filter-group">
              <h4>REGION / CLINIC LOCATION</h4>

              {locations.map((item) => (
                <label className="filter-checkbox" key={item}>
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(item)}
                    onChange={() =>
                      handleCheckbox(
                        item,
                        setSelectedLocations,
                        selectedLocations
                      )
                    }
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>

            {/* Fee Filter */}
            <div className="filter-group">
              <h4>CONSULTATION FEE</h4>

              <label className="filter-radio">
                <input
                  type="radio"
                  name="fee"
                  checked={feeFilter === "all"}
                  onChange={() => setFeeFilter("all")}
                />
                <span>All Consultation Fees</span>
              </label>

              <label className="filter-radio">
                <input
                  type="radio"
                  name="fee"
                  checked={feeFilter === "under500"}
                  onChange={() => setFeeFilter("under500")}
                />
                <span>Under 500 EGP</span>
              </label>

              <label className="filter-radio">
                <input
                  type="radio"
                  name="fee"
                  checked={feeFilter === "500-800"}
                  onChange={() => setFeeFilter("500-800")}
                />
                <span>500 - 800 EGP</span>
              </label>

              <label className="filter-radio">
                <input
                  type="radio"
                  name="fee"
                  checked={feeFilter === "800plus"}
                  onChange={() => setFeeFilter("800plus")}
                />
                <span>800+ EGP</span>
              </label>
            </div>

            {/* Availability */}
            <div className="filter-group">
              <h4>AVAILABILITY</h4>

              <div className="availability-options">
                {["Anytime", "Today", "Tomorrow", "This Week"].map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      className={
                        availability === item
                          ? "availability-btn active"
                          : "availability-btn"
                      }
                      onClick={() => setAvailability(item)}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Gender */}
            <div className="filter-group gender-filter">
              <h4>DOCTOR GENDER</h4>

              <div className="gender-options">
                {["All", "Female", "Male"].map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={
                      gender === item
                        ? "gender-btn active"
                        : "gender-btn"
                    }
                    onClick={() => setGender(item)}
                  >
                    {item}
                  </button>
                )
                )}
              </div>
            </div>
          </aside>

          {/* DOCTORS LIST */}
          <main className="doctors-results">

            {/* Results Header */}
            <div className="results-header">
              <div className="results-header-info">
                <h3>
                  Showing {sortedDoctors.length} doctors
                </h3>

                <span className="verified-profiles">
                  <BadgeCheck size={12} />
                  Verified Profiles
                </span>
              </div>

              <div className="results-sort">
                <label htmlFor="sort-doctors">Sort by:</label>

                <select
                  id="sort-doctors"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="Recommended">Recommended</option>
                  <option value="Highest Rated">Highest Rated</option>
                  <option value="Lowest Fee">Lowest Fee</option>
                  <option value="Most Experienced">Most Experienced</option>
                </select>
              </div>

              <div className="active-filters">
                <span>ACTIVE:</span>
                <span className="active-filter-chip">
                  {selectedSpecialties.length > 0
                    ? selectedSpecialties.join(", ")
                    : specialty !== "All Specialties"
                    ? specialty
                    : "All Specializations"}
                </span>
              </div>
            </div>

            {/* Doctor Cards */}
            <div className="doctors-list">

              {loading ? (
                <p>Loading doctors...</p>
              ) : apiError ? (
                <p role="alert">{apiError}</p>
              ) : sortedDoctors.length > 0 ? (
                sortedDoctors.map((doctor) => (
                  <article className="doctor-card" key={doctor.id}>

                    {/* Doctor Image */}
                   {/* Doctor Image */}
<div className="doctor-image-wrapper">
  {doctor.image && (
    <img
      src={doctor.image}
      alt={doctor.name}
      className="doctor-image"
      onError={(e) => {
        e.currentTarget.style.display = "none";
        e.currentTarget.nextElementSibling.style.display = "flex";
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
                    {/* Doctor Information */}
                    <div className="doctor-information">

                      <div className="doctor-top-row">
                        <div>
                          <h3>{doctor.name}</h3>
                          <p className="doctor-specialty">
                            {doctor.specialty}
                          </p>
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
                          <span>
                            {doctor.clinic} - {doctor.location}
                          </span>
                        </div>

                        <div>
                          <BadgeCheck size={12} />
                          <span>{doctor.degree}</span>
                        </div>

                        <div>
                          <Clock size={12} />
                          <span>
                            {doctor.experience} years clinical practice
                          </span>
                        </div>

                        <div>
                          <MapPin size={12} />
                          <span>{doctor.location}</span>
                        </div>
                      </div>

                      {/* Fee and Availability */}
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

                      {/* Card Actions */}
                      <div className="doctor-card-actions">

                        {/* View Doctor Profile */}
                        <button
                          type="button"
                          className="view-profile-btn"
                          onClick={() =>
                            navigate(`/doctors/doctor_profile/${doctor.id}`, {
                              state: { doctor },
                            })
                          }
                        >
                          View Profile
                        </button>

                        {/* Book Appointment */}
                        <button
                          type="button"
                          className="book-appointment-btn"
                          onClick={() =>
                            navigate(`/doctors/doctor_profile/${doctor.id}/book-appointment`, {
                              state: { doctor },
                            })
                          }
                        >
                          Book Appointment
                        </button>

                      </div>

                    </div>
                  </article>
                ))
              ) : (
                <div className="no-doctors-found">
                  <Search size={35} />
                  <h3>No doctors found</h3>
                  <p>
                    Try changing your search or filters to find doctors.
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </button>
                </div>
              )}

            </div>
          </main>
        </div>

      </div>
    </section>
  );
}
