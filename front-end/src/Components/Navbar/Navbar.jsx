import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import logoImg from "../../assets/clinika-logo.png";
import "./clinika-components.css";

const navLinks = [
    { label: "Home", to: "/" },
    { label: "Doctors", to: "/doctors" },
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
];

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="cl-header">
            <div className="cl-header-container">
                {/* Brand Logo matching Stitch */}
                <Link className="cl-brand" to="/" onClick={() => setMobileOpen(false)}>
                    <img src={logoImg} alt="Clinika" className="cl-brand-logo" />
                </Link>

                {/* Desktop Navigation Links */}
                <nav className="cl-nav-desktop" aria-label="Main Navigation">
                    {navLinks.map(({ label, to }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === "/"}
                            className={({ isActive }) =>
                                `cl-nav-link ${isActive ? "active" : ""}`
                            }
                        >
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Desktop Actions */}
                <div className="cl-header-actions">
                    <Link className="cl-login-btn" to="/login">
                        Login
                    </Link>
                    <Link className="cl-book-btn" to="/doctors">
                        Book Appointment
                    </Link>
                    <Link
                        className="cl-avatar-link"
                        to="/patient-dashboard"
                        aria-label="Patient Dashboard"
                        title="Patient Dashboard"
                    >
                        <span className="material-symbols-outlined cl-avatar-icon">person</span>
                    </Link>

                    {/* Mobile Hamburger Toggle */}
                    <button
                        className="cl-mobile-toggle"
                        type="button"
                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                        aria-expanded={mobileOpen}
                        onClick={() => setMobileOpen((prev) => !prev)}
                    >
                        <i className={`fa-solid ${mobileOpen ? "fa-xmark" : "fa-bars"}`}></i>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileOpen && (
                <div className="cl-mobile-menu">
                    <nav className="cl-mobile-nav">
                        {navLinks.map(({ label, to }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === "/"}
                                className={({ isActive }) =>
                                    `cl-mobile-nav-link ${isActive ? "active" : ""}`
                                }
                                onClick={() => setMobileOpen(false)}
                            >
                                {label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="cl-mobile-actions">
                        <Link
                            className="cl-mobile-login"
                            to="/login"
                            onClick={() => setMobileOpen(false)}
                        >
                            <i className="fa-solid fa-arrow-right-to-bracket"></i>
                            Login
                        </Link>
                        <Link
                            className="cl-book-btn w-100 text-center"
                            to="/doctors"
                            onClick={() => setMobileOpen(false)}
                        >
                            Book Appointment
                        </Link>
                        <Link
                            className="cl-mobile-profile"
                            to="/patient-dashboard"
                            onClick={() => setMobileOpen(false)}
                        >
                            <span className="cl-avatar-link">
                                <span className="material-symbols-outlined cl-avatar-icon">person</span>
                            </span>
                            <span>My Profile & Appointments</span>
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}