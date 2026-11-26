import { useState } from "react";
import { useNavigate } from "react-router-dom";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function MedicalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 3h6v3h3a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h3V3Z" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function SearchSection({ specialties = [], locations = [] }) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");

  const handleSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    const selectedSpecialty = specialties.find(
      (item) => item.name?.trim().toLowerCase() === keyword.trim().toLowerCase(),
    );

    if (selectedSpecialty) {
      params.set("specialty", selectedSpecialty.name);
      params.set("specialty_id", String(selectedSpecialty.id));
    } else if (keyword.trim()) {
      params.set("search", keyword.trim());
    }

    if (location) params.set("location", location);
    if (date) params.set("date", date);
    const query = params.toString();
    navigate(query ? `/doctors?${query}` : "/doctors");
  };

  return (
    <section className="home-search-wrapper">
      <div className="container">
        <div className="home-search-section">
          <div className="home-search-header">
            <h2>The right care starts with a search.</h2>
            <span>Search by doctor, specialty, or clinic location</span>
          </div>

          <form className="home-search-form" onSubmit={handleSearch}>
            {/* SPECIALTY */}
            <div className="home-search-field">
              <div className="home-search-icon">
                <MedicalIcon />
              </div>
              <div className="home-search-input-wrapper">
                <label htmlFor="home-specialty">Doctor or specialty</label>
                <input
                  type="text"
                  id="home-specialty"
                  placeholder="e.g. Primary Care, Cardiology"
                  list="home-specialty-options"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
                <datalist id="home-specialty-options">
                  {specialties.map((item) => (
                    <option key={item.id} value={item.name} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* LOCATION */}
            <div className="home-search-field">
              <div className="home-search-icon">
                <LocationIcon />
              </div>
              <div className="home-search-input-wrapper">
                <label htmlFor="home-location">Location</label>
                <select
                  id="home-location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                >
                  <option value="">All locations</option>
                  {locations.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* DATE */}
            <div className="home-search-field home-date-field">
              <div className="home-search-icon">
                <CalendarIcon />
              </div>
              <div className="home-search-input-wrapper">
                <label htmlFor="home-date">Appointment date</label>
                <input
                  type="date"
                  id="home-date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
            </div>

            {/* SEARCH BUTTON */}
            <button type="submit" className="home-search-button">
              <SearchIcon />
              Search
            </button>
          </form>

          {/* FEATURES */}
          <div className="home-search-features">
            <div className="home-feature">
              <div className="home-feature-icon">
                <ShieldIcon />
              </div>
              <span>Verified credentials</span>
            </div>

            <div className="home-feature">
              <div className="home-feature-icon">
                <span>ϟ</span>
              </div>
              <span>Instant confirmation</span>
            </div>

            <div className="home-feature">
              <div className="home-feature-icon">
                <MedicalIcon />
              </div>
              <span>Organized records</span>
            </div>

            <div className="home-feature">
              <div className="home-feature-icon">
                <ShieldIcon />
              </div>
              <span>Strictly confidential</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
