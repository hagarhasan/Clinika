import { Link } from "react-router-dom";
import "./clinika-components.css";

const columns = [
    {
        title: "Specialties",
        links: [
            { label: "Cardiology", to: "/specialties/cardiology" },
            { label: "Neurology", to: "/specialties/neurology" },
            { label: "Pediatrics", to: "/specialties/pediatrics" },
            { label: "Orthopedics", to: "/specialties/orthopedics" },
        ],
    },
    {
        title: "For Patients",
        links: [
            { label: "Search Doctors", to: "/doctors" },
            { label: "Schedule Visit", to: "/book" },
            { label: "Clinic Locations", to: "/locations" },
            { label: "Patient Support", to: "/support" },
        ],
    },
    {
        title: "Legal & Info",
        links: [
            { label: "For Doctors", to: "/for-doctors" },
            { label: "Privacy Policy", to: "/privacy" },
            { label: "Terms of Service", to: "/terms" },
            { label: "HIPAA Notice", to: "/hipaa" },
        ],
    },
];

const bottomLinks = [
    { label: "Privacy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
    { label: "Accessibility", to: "/accessibility" },
];

export default function Footer() {
    return (
        <>
            <div className="cl-emergency">
                <i className="fa-solid fa-asterisk"></i>
                24/7 Emergency Medical Helpline:
                <Link to="tel:18002546452">1-800-CLINIKA (254-6452)</Link>
            </div>

            <footer className="cl-footer">
                <div className="container-fluid px-3 px-lg-5">
                    <div className="row gy-5">
                        <div className="col-lg-5">
                            <Link className="cl-logo" to="/">
                                <span className="cl-logo-mark">
                                    <i className="fa-solid fa-plus"></i>
                                </span>
                                Clinika
                            </Link>
                            <p className="cl-footer-desc">
                                Reliable medical appointment scheduling and healthcare
                                practitioner discovery. Connecting you with verified
                                specialists seamlessly.
                            </p>
                        </div>

                        <div className="col-lg-7">
                            <div className="row gy-4">
                                {columns.map((col) => (
                                    <div className="col-6 col-md-4" key={col.title}>
                                        <h6 className="cl-footer-title">{col.title}</h6>
                                        <ul className="cl-footer-links">
                                            {col.links.map((l) => (
                                                <li key={l.label}>
                                                    <Link to={l.to}>{l.label}</Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="cl-footer-bottom d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <span>
                            © {new Date().getFullYear()} Clinika Health, Inc. All rights
                            reserved. Non-diagnostic booking platform.
                        </span>
                        <div className="d-flex gap-4">
                            {bottomLinks.map((l) => (
                                <Link key={l.label} to={l.to}>
                                    {l.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}