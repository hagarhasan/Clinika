
import React, { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const closeMenu = () => {
    setMenuOpen(false);
  };
const getDashboardPath = () => {
  const role = localStorage.getItem("role");

  if (role === "doctor") return "/doctor-dashboard";
  if (role === "admin") return "/admin-dashboard";

  return "/patient-dashboard";
};
  return (
    <header className={`clinika-navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-container">

        {/* Logo */}
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <span className="navbar-logo-text">Clinika</span>
        </Link>

        {/* Mobile Menu Button */}
        <button
          className={`mobile-menu-btn ${menuOpen ? "active" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Navbar Content */}
        <div className={`navbar-content ${menuOpen ? "open" : ""}`}>

          {/* Navigation Links */}
          <nav className="navbar-links">

            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={closeMenu}
            >
              Home
            </NavLink>

            <NavLink
              to="/doctors"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={closeMenu}
            >
              Doctors
            </NavLink>

            <NavLink
              to="/about"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={closeMenu}
            >
              About
            </NavLink>

            <NavLink
              to="/contact"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={closeMenu}
            >
              Contact
            </NavLink>

          </nav>

          {/* Navbar Actions */}
          <div className="navbar-actions">

            <NavLink
              to="/login"
              className={({ isActive }) =>
                `login-link ${isActive ? "active" : ""}`
              }
              onClick={closeMenu}
            >
              Login
            </NavLink>

            <NavLink
              to="/doctors"
              className={({ isActive }) =>
                `appointment-btn ${isActive ? "active" : ""}`
              }
              onClick={closeMenu}
            >
              Book Appointment
            </NavLink>

            <Link
  to={getDashboardPath()}
  className="profile-btn"
  aria-label="User Profile"
  onClick={closeMenu}
>
              <svg
                className="profile-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
              </svg>

              <span className="profile-text">My Profile</span>
         </Link>

          </div>
        </div>

      </div>
    </header>
  );
};

export default Navbar;
