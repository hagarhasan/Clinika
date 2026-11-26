import { Helmet } from "react-helmet-async";
import { useDoctors } from "../../hooks/useDoctors";
import { usePublicLocations, usePublicStats, useSpecialties } from "../../hooks/useReferenceData";
import "./Home.css";

import {
  HeroSection,
  SearchSection,
  SpecialtiesSection,
  FeaturedDoctorsSection,
  HowItWorksSection,
  WhyChooseSection,
  BookingCtaSection,
} from "../../Components/Home";

export default function Home() {
  const doctorsQuery = useDoctors({ limit: 4, offset: 0, sort: "recommended" });
  usePublicStats();
  const specialtiesQuery = useSpecialties();
  const locationsQuery = usePublicLocations();

  const doctors = Array.isArray(doctorsQuery.data?.data) ? doctorsQuery.data.data : [];
  const specialties = Array.isArray(specialtiesQuery.data?.data) ? specialtiesQuery.data.data : [];
  const locations = Array.isArray(locationsQuery.data?.cities)
    ? locationsQuery.data.cities.map((item) => item.city).filter(Boolean)
    : [];
  const loadingDoctors = doctorsQuery.isLoading;
  const doctorsError = doctorsQuery.error?.message || "";

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
        <SearchSection specialties={specialties} locations={locations} />
        <SpecialtiesSection />
        <FeaturedDoctorsSection
          doctors={doctors}
          loadingDoctors={loadingDoctors}
          doctorsError={doctorsError}
        />
        <HowItWorksSection />
        <WhyChooseSection />
        <BookingCtaSection />
      </main>
    </>
  );
}
