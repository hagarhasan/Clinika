import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDoctors } from "../../hooks/useDoctors";
import { usePublicLocations, useSpecialties } from "../../hooks/useReferenceData";
import { formatTime } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import {
  DoctorFilters,
  DoctorResults,
  DoctorResultsHeader,
  DoctorSearchForm,
  DoctorsBreadcrumb,
  DoctorsIntro,
} from "../../Components/Doctors/DoctorDirectorySections";
import "./DoctorDirectory.css";

export default function Doctors() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, user } = useAuth();

  const specialtiesQuery = useSpecialties();
  const locationsQuery = usePublicLocations();
  const specialtyRecords = Array.isArray(specialtiesQuery.data?.data)
    ? specialtiesQuery.data.data
    : [];
  const specialties = specialtyRecords.map((item) => item.name).filter(Boolean);
  const locations = Array.isArray(locationsQuery.data?.cities)
    ? locationsQuery.data.cities.map((item) => item.city).filter(Boolean)
    : [];

  const [keyword, setKeyword] = useState(() => searchParams.get("search") || "");
  const [location, setLocation] = useState(() => searchParams.get("location") || "All Locations");
  const [specialty, setSpecialty] = useState(() => searchParams.get("specialty") || "All Specialties");
  const [date, setDate] = useState(() => searchParams.get("date") || "");
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [feeFilter, setFeeFilter] = useState("all");
  const [availability, setAvailability] = useState("Anytime");
  const [gender, setGender] = useState("All");
  const [sortBy, setSortBy] = useState("Recommended");

  const selectedSpecialtyRecord = specialtyRecords.find((item) => item.name === specialty);
  const selectedSpecialtyId = selectedSpecialtyRecord?.id;

  useEffect(() => {
    if (specialtiesQuery.isLoading) return;
    const next = new URLSearchParams();
    if (keyword.trim()) next.set("search", keyword.trim());
    if (location !== "All Locations") next.set("location", location);
    if (specialty !== "All Specialties") next.set("specialty", specialty);
    if (selectedSpecialtyId) next.set("specialty_id", String(selectedSpecialtyId));
    if (date) next.set("date", date);
    setSearchParams(next, { replace: true });
  }, [keyword, location, specialty, selectedSpecialtyId, date, specialtiesQuery.isLoading, setSearchParams]);

  const doctorsQuery = useDoctors({
    limit: 100,
    offset: 0,
    q: keyword.trim() || (!selectedSpecialtyId && specialty !== "All Specialties" ? specialty : undefined),
    city: location !== "All Locations" ? location : undefined,
    specialty_id: selectedSpecialtyId ? Number(selectedSpecialtyId) : undefined,
    date: date || undefined,
    gender: gender !== "All" ? gender.toLowerCase() : undefined,
    min_fee: feeFilter === "500-800" ? 500 : feeFilter === "800plus" ? 800 : undefined,
    max_fee: feeFilter === "under500" ? 499.99 : feeFilter === "500-800" ? 800 : undefined,
    availability: availability === "Anytime" ? undefined : availability.toLowerCase().replace(" ", "_"),
    sort: sortBy === "Highest Rated"
      ? "rating"
      : sortBy === "Lowest Fee"
        ? "fee"
        : sortBy === "Most Experienced"
          ? "experience"
        : "recommended",
  });

  const doctorsData = (doctorsQuery.data?.data || [])
    .filter((doctor) => role !== "doctor" || Number(doctor.user_id) !== Number(user?.id))
    .map((doctor) => {
      const nextAvailable = doctor.next_available;
      const appointmentDate = nextAvailable?.appointment_date;
      let doctorAvailability = "This Week";

      if (appointmentDate) {
        const today = new Date();
        const appointment = new Date(`${appointmentDate}T00:00:00`);
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const difference = Math.round((appointment - todayDate) / (1000 * 60 * 60 * 24));
        if (difference === 0) doctorAvailability = "Today";
        else if (difference === 1) doctorAvailability = "Tomorrow";
        else if (difference < 0 || difference > 7) doctorAvailability = "Unavailable";
      } else {
        doctorAvailability = "Unavailable";
      }

      return {
        id: doctor.id,
        user_id: doctor.user_id,
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
        time: nextAvailable?.start_time ? formatTime(nextAvailable.start_time) : "Not available",
        gender: doctor.gender || "",
        image: doctor.photo_url || "",
        clinicId: doctor.clinic?.id || nextAvailable?.clinic_id || null,
        appointmentDate: nextAvailable?.appointment_date || "",
        startTime: nextAvailable?.start_time || "",
      };
    });

  const resetFilters = () => {
    setSelectedSpecialties([]);
    setSelectedLocations([]);
    setFeeFilter("all");
    setAvailability("Anytime");
    setGender("All");
    setKeyword("");
    setLocation("All Locations");
    setSpecialty("All Specialties");
    setDate("");
    setSortBy("Recommended");
  };

  const searchText = keyword.toLowerCase();
  const filteredDoctors = doctorsData.filter((doctor) => (
    (doctor.name || "").toLowerCase().includes(searchText)
    || doctor.specialty.toLowerCase().includes(searchText)
    || doctor.clinic.toLowerCase().includes(searchText)
  ) && (
    location === "All Locations" || doctor.location === location
  ) && (
    specialty === "All Specialties" || doctor.category === specialty
  ) && (
    selectedSpecialties.length === 0 || selectedSpecialties.includes(doctor.category)
  ) && (
    selectedLocations.length === 0 || selectedLocations.includes(doctor.location)
  ) && (
    feeFilter === "all"
    || (feeFilter === "under500" && doctor.fee < 500)
    || (feeFilter === "500-800" && doctor.fee >= 500 && doctor.fee <= 800)
    || (feeFilter === "800plus" && doctor.fee > 800)
  ) && (
    availability === "Anytime" || doctor.availability === availability
  ) && (
    gender === "All" || doctor.gender.toLowerCase() === gender.toLowerCase()
  ));

  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    if (sortBy === "Highest Rated") return (b.rating ?? 0) - (a.rating ?? 0);
    if (sortBy === "Lowest Fee") return a.fee - b.fee;
    if (sortBy === "Most Experienced") return b.experience - a.experience;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  const handleSearch = (event) => event.preventDefault();

  return (
    <section className="doctors-page py-4 py-lg-5">
      <div className="container">
        <DoctorsBreadcrumb />
        <DoctorsIntro />
        <DoctorSearchForm
          keyword={keyword}
          setKeyword={setKeyword}
          location={location}
          setLocation={setLocation}
          specialty={specialty}
          setSpecialty={setSpecialty}
          date={date}
          setDate={setDate}
          locations={locations}
          specialties={specialties}
          onSubmit={handleSearch}
        />
        <div className="doctors-results-layout row g-4">
          <DoctorFilters
            specialties={specialties}
            locations={locations}
            selectedSpecialties={selectedSpecialties}
            setSelectedSpecialties={setSelectedSpecialties}
            selectedLocations={selectedLocations}
            setSelectedLocations={setSelectedLocations}
            feeFilter={feeFilter}
            setFeeFilter={setFeeFilter}
            availability={availability}
            setAvailability={setAvailability}
            gender={gender}
            setGender={setGender}
            onReset={resetFilters}
          />
          <main className="doctors-results col-12 col-lg-8 col-xl-9">
            <DoctorResultsHeader
              count={sortedDoctors.length}
              sortBy={sortBy}
              setSortBy={setSortBy}
              selectedSpecialties={selectedSpecialties}
              specialty={specialty}
            />
            <DoctorResults
              loading={doctorsQuery.isLoading}
              error={doctorsQuery.error?.message || ""}
              doctors={sortedDoctors}
              onViewProfile={(doctor) => navigate(`/doctors/doctor_profile/${doctor.id}`, { state: { doctor } })}
              onBookAppointment={(doctor) => navigate(`/doctors/doctor_profile/${doctor.id}/book-appointment`, { state: { doctor } })}
              onReset={resetFilters}
            />
          </main>
        </div>
      </div>
    </section>
  );
}
