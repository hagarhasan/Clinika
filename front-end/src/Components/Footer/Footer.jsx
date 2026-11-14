import { Link } from "react-router-dom";
import logoImg from "../../assets/clinika-logo.png";
import "./clinika-components.css";

const footerColumns = [
    {
        title: "Specialties",
        links: [
            { label: "Cardiology", to: "/doctors" },
            { label: "Neurology", to: "/doctors" },
            { label: "Pediatrics", to: "/doctors" },
            { label: "Orthopedics", to: "/doctors" },
        ],
    },
    {
        title: "For Patients",
        links: [
            { label: "Search Doctors", to: "/doctors" },
            { label: "Schedule Visit", to: "/doctors" },
            { label: "Clinic Locations", to: "/about" },
            { label: "Patient Support", to: "/contact" },
        ],
    },
    {
        title: "Legal & Info",
        links: [
            { label: "For Doctors", to: "/about" },
            { label: "Privacy Policy", to: "/privacy" },
            { label: "Terms of Service", to: "/terms" },
            { label: "HIPAA Notice", to: "/terms" },
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
        <footer className="cl-footer-wrapper">
            {/* 24/7 Emergency Helpline Banner */}
            <div className="cl-emergency-banner">
                <div className="cl-emergency-inner">
                    <span className="material-symbols-outlined cl-emergency-icon">emergency</span>
                    <span className="cl-emergency-text">
                        24/7 Emergency Medical Helpline:
                    </span>
                    <a className="cl-emergency-phone" href="tel:18002546452">
                        1-800-CLINIKA (254-6452)
                    </a>
                </div>
            </div>

            {/* Main Footer Container */}
            <div className="cl-footer-main">
                <div className="cl-footer-container">
                    <div className="cl-footer-grid">
                        {/* Brand Column */}
                        <div className="cl-footer-brand-col">
                            <Link className="cl-brand" to="/">
                                <img src={logoImg} alt="Clinika" className="cl-brand-logo" />
                            </Link>
                            <p className="cl-footer-bio">
                                Reliable medical appointment scheduling and healthcare
                                practitioner discovery. Connecting you with verified
                                specialists seamlessly.
                            </p>
                        </div>

                        {/* Navigation Columns */}
                        <div className="cl-footer-links-grid">
                            {footerColumns.map((col) => (
                                <div className="cl-footer-col" key={col.title}>
                                    <h4 className="cl-footer-heading">{col.title}</h4>
                                    <ul className="cl-footer-list">
                                        {col.links.map((link) => (
                                            <li key={link.label}>
                                                <Link className="cl-footer-link" to={link.to}>
                                                    {link.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Copyright & Legal Links */}
                    <div className="cl-footer-bottom">
                        <p className="cl-footer-copy">
                            © {new Date().getFullYear()} Clinika Health, Inc. All rights
                            reserved. Non-diagnostic booking platform.
                        </p>
                        <div className="cl-footer-bottom-links">
                            {bottomLinks.map((item) => (
                                <Link
                                    key={item.label}
                                    className="cl-footer-legal-link"
                                    to={item.to}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}