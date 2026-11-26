import { Helmet } from "react-helmet-async";
import {
  AboutAdvantages,
  AboutCallToAction,
  AboutHero,
  AboutMission,
} from "../../Components/About/AboutSections";
import "./About.css";

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Us | Clinika</title>
      </Helmet>
      <div className="about-page">
        <AboutHero />
        <AboutMission />
        <AboutAdvantages />
        <AboutCallToAction />
      </div>
    </>
  );
}
