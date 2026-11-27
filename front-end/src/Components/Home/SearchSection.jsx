import { CalendarDays, MapPin, Search, Stethoscope } from "lucide-react";

export default function SearchSection({
  keyword,
  setKeyword,
  location,
  setLocation,
  date,
  setDate,
  specialties = [],
  locations = [],
  handleSearch,
}) {
  return (
    <section className="container" id="home-search" aria-labelledby="home-search-title">
      <div className="home-search-card card home-rise-in home-delay-2">
        <div className="card-body p-4 p-lg-5">
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
            <div>
              <span className="home-eyebrow">START YOUR SEARCH</span>
              <h2 className="h4 fw-bold mt-2 mb-0" id="home-search-title">
                Find care that works for you
              </h2>
            </div>
            <p className="home-muted small mb-1">Doctor, specialty, or clinic location</p>
          </div>
          <form className="row g-3 align-items-end" onSubmit={handleSearch}>
            <div className="col-12 col-md-6 col-lg-4">
              <label htmlFor="home-specialty" className="form-label fw-semibold small">
                Doctor or specialty
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white"><Stethoscope size={18} /></span>
                <input
                  id="home-specialty"
                  className="form-control"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  list="home-specialty-options"
                  placeholder="e.g. Cardiology"
                />
                <datalist id="home-specialty-options">
                  {specialties.map((specialty) => (
                    <option key={specialty.id} value={specialty.name} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label htmlFor="home-location" className="form-label fw-semibold small">Location</label>
              <div className="input-group">
                <span className="input-group-text bg-white"><MapPin size={18} /></span>
                <select
                  id="home-location"
                  className="form-select"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                >
                  <option value="">All locations</option>
                  {locations.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label htmlFor="home-date" className="form-label fw-semibold small">Appointment date</label>
              <div className="input-group">
                <span className="input-group-text bg-white"><CalendarDays size={18} /></span>
                <input
                  id="home-date"
                  className="form-control"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-2 d-grid">
              <button type="submit" className="btn btn-primary rounded-3 py-2">
                <Search size={17} className="me-2" /> Search
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
