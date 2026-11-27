import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDoctors } from "../../hooks/useDoctors";
import { usePublicLocations, useSpecialties } from "../../hooks/useReferenceData";
import {
  HeroSection,
  SearchSection,
  SpecialtiesSection,
  FeaturedDoctorsSection,
  HowItWorksSection,
  BookingCtaSection,
} from "../../Components/Home";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const doctorsQuery = useDoctors({ limit: 4, offset: 0, sort: "recommended" });
  const specialtiesQuery = useSpecialties();
  const locationsQuery = usePublicLocations();

  const doctors = Array.isArray(doctorsQuery.data?.data) ? doctorsQuery.data.data : [];
  const specialties = Array.isArray(specialtiesQuery.data?.data) ? specialtiesQuery.data.data : [];
  const locations = Array.isArray(locationsQuery.data?.cities)
    ? locationsQuery.data.cities.map((item) => item.city).filter(Boolean)
    : [];

  const featuredDoctors = role === "doctor"
    ? doctors.filter((doctor) => {
        if (Number(doctor.user_id) === Number(user?.id)) return false;
        if (doctor.email && user?.email && doctor.email.toLowerCase() === user.email.toLowerCase()) return false;
        return true;
      })
    : doctors;

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

  const openSpecialty = (specialty) => {
    const params = new URLSearchParams({
      specialty: specialty.name,
      specialty_id: String(specialty.id),
    });
    navigate(`/doctors?${params.toString()}`);
  };

  return (
    <>
      <Helmet>
        <title>Clinika | Find the Right Doctor</title>
        <meta
          name="description"
          content="Find verified doctors, explore clinics and book your healthcare appointment with Clinika."
        />
      </Helmet>

      <main className="home-page">
        <HeroSection />
        <SearchSection
          keyword={keyword}
          setKeyword={setKeyword}
          location={location}
          setLocation={setLocation}
          date={date}
          setDate={setDate}
          specialties={specialties}
          locations={locations}
          handleSearch={handleSearch}
        />
        <SpecialtiesSection
          specialties={specialties}
          openSpecialty={openSpecialty}
        />
        <FeaturedDoctorsSection
          doctorsQuery={doctorsQuery}
          featuredDoctors={featuredDoctors}
        />
        <HowItWorksSection />
        <BookingCtaSection />
      </main>
    </>
  );
}
