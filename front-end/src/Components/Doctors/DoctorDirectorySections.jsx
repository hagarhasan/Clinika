import { Link } from "react-router-dom";
import {
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Filter,
  Home,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import DoctorCard from "./DoctorCard";

export function DoctorsBreadcrumb() {
  return (
    <nav className="doctors-breadcrumb d-flex align-items-center gap-2" aria-label="Breadcrumb">
      <Link to="/">
        <Home size={14} />
        <span>Home</span>
      </Link>
      <ChevronRight className="breadcrumb-arrow" size={14} />
      <span className="breadcrumb-active">Find Doctors</span>
    </nav>
  );
}

export function DoctorsIntro() {
  return (
    <div className="doctors-hero row align-items-end g-3">
      <div className="doctors-heading col-lg-8">
        <span className="verified-badge">VERIFIED MEDICAL NETWORK</span>
        <h2>Find Your Doctor</h2>
        <p>
          Find the right licensed specialist and book your clinical
          appointment with seamless administrative coordination.
        </p>
      </div>
      <div className="doctors-trust col-lg-4">
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
  );
}

export function DoctorSearchForm({
  keyword,
  setKeyword,
  location,
  setLocation,
  specialty,
  setSpecialty,
  date,
  setDate,
  locations,
  specialties,
  onSubmit,
}) {
  return (
    <form className="doctors-search-box row g-3 align-items-stretch" onSubmit={onSubmit}>
      <div className="search-field mt-0 keyword-field col-12 col-md-6 col-xl-3">
        <Search size={19} />
        <div className="field-content">
          <label htmlFor="doctor-keyword">Search Keyword</label>
          <input
            id="doctor-keyword"
            type="text"
            className="form-control"
            placeholder="Doctor name, specialty, or clinic..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </div>

      <div className="search-field mt-0 select-field col-12 col-md-6 col-xl-2">
        <MapPin size={20} />
        <div className="field-content">
          <label htmlFor="doctor-location">Location</label>
          <select
            id="doctor-location"
            className="form-select"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          >
            <option value="All Locations">All Locations</option>
            {locations.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <ChevronDown size={13} />
      </div>

      <div className="search-field mt-0 select-field col-12 col-md-6 col-xl-2">
        <Stethoscope size={20} />
        <div className="field-content">
          <label htmlFor="doctor-specialty">Specialty</label>
          <select
            id="doctor-specialty"
            className="form-select"
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
          >
            <option value="All Specialties">All Specialties</option>
            {specialties.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <ChevronDown size={13} />
      </div>

      <div className="search-field mt-0 select-field col-12 col-md-6 col-xl-2">
        <CalendarDays size={19} />
        <div className="field-content">
          <label htmlFor="doctor-date">Appointment date</label>
          <input
            id="doctor-date"
            type="date"
            className="form-control"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </div>

      <button type="submit" className="doctors-search-btn mt-0 btn btn-primary col-12 col-xl-3">
        <Search size={18} />
        <span>Search</span>
      </button>
    </form>
  );
}

export function DoctorFilters({
  specialties,
  locations,
  selectedSpecialties,
  setSelectedSpecialties,
  selectedLocations,
  setSelectedLocations,
  feeFilter,
  setFeeFilter,
  availability,
  setAvailability,
  gender,
  setGender,
  onReset,
}) {
  const toggleValue = (value, values, setValues) => {
    setValues(values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value]);
  };

  return (
    <aside className="doctors-filter-sidebar col-12 col-lg-4 col-xl-3">
      <div className="filter-header">
        <div className="filter-title"><Filter size={15} /><span>Filter By</span></div>
        <button className="reset-filters" onClick={onReset} type="button">
          <RotateCcw size={12} />
          Reset all
        </button>
      </div>

      <div className="filter-group">
        <h4>MEDICAL SPECIALTY</h4>
        {specialties.map((item) => (
          <label className="filter-checkbox" key={item}>
            <input
              type="checkbox"
              checked={selectedSpecialties.includes(item)}
              onChange={() => toggleValue(item, selectedSpecialties, setSelectedSpecialties)}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>

      <div className="filter-group location-filter-group">
        <h4>REGION / CLINIC LOCATION</h4>
        {locations.map((item) => (
          <label className="filter-checkbox" key={item}>
            <input
              type="checkbox"
              checked={selectedLocations.includes(item)}
              onChange={() => toggleValue(item, selectedLocations, setSelectedLocations)}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>

      <div className="filter-group">
        <h4>CONSULTATION FEE</h4>
        <label className="filter-radio">
          <input type="radio" name="fee" checked={feeFilter === "all"} onChange={() => setFeeFilter("all")} />
          <span>All Consultation Fees</span>
        </label>
        <label className="filter-radio">
          <input type="radio" name="fee" checked={feeFilter === "under500"} onChange={() => setFeeFilter("under500")} />
          <span>Under 500 EGP</span>
        </label>
        <label className="filter-radio">
          <input type="radio" name="fee" checked={feeFilter === "500-800"} onChange={() => setFeeFilter("500-800")} />
          <span>500 - 800 EGP</span>
        </label>
        <label className="filter-radio">
          <input type="radio" name="fee" checked={feeFilter === "800plus"} onChange={() => setFeeFilter("800plus")} />
          <span>800+ EGP</span>
        </label>
      </div>

      <div className="filter-group">
        <h4>AVAILABILITY</h4>
        <div className="availability-options">
          {["Anytime", "Today", "Tomorrow", "This Week"].map((item) => (
            <button
              key={item}
              type="button"
              className={availability === item ? "availability-btn active" : "availability-btn"}
              onClick={() => setAvailability(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group gender-filter">
        <h4>DOCTOR GENDER</h4>
        <div className="gender-options">
          {["All", "Female", "Male"].map((item) => (
            <button
              type="button"
              key={item}
              className={gender === item ? "gender-btn active" : "gender-btn"}
              onClick={() => setGender(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function DoctorResultsHeader({
  count,
  sortBy,
  setSortBy,
  selectedSpecialties,
  specialty,
}) {
  return (
    <div className="results-header">
      <div className="results-header-info">
        <h3>Showing {count} doctors</h3>
        <span className="verified-profiles"><BadgeCheck size={12} />Verified Profiles</span>
      </div>
      <div className="results-sort">
        <label htmlFor="sort-doctors">Sort by:</label>
        <select className="form-select" id="sort-doctors" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
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
  );
}

export function DoctorResults({
  loading,
  error,
  doctors,
  onViewProfile,
  onBookAppointment,
  onReset,
}) {
  return (
    <div className="doctors-list">
      {loading ? (
        <p>Loading doctors...</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : doctors.length ? (
        doctors.map((doctor) => (
          <DoctorCard
            key={doctor.id}
            doctor={doctor}
            onViewProfile={() => onViewProfile(doctor)}
            onBookAppointment={() => onBookAppointment(doctor)}
          />
        ))
      ) : (
        <div className="no-doctors-found">
          <Search size={35} />
          <h3>No doctors found</h3>
          <p>Try changing your search or filters to find doctors.</p>
          <button className="btn btn-outline-primary" type="button" onClick={onReset}>Reset Filters</button>
        </div>
      )}
    </div>
  );
}
