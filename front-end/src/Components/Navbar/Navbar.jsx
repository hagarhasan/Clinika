
import { useState, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const [userName, setUserName] = useState(
    localStorage.getItem("userName") || ""
  );

  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    const handleAuthChange = () => {
      setIsLoggedIn(Boolean(localStorage.getItem("token")));
      setUserName(localStorage.getItem("userName") || "");
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("authChange", handleAuthChange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("authChange", handleAuthChange);
    };
  }, []);

  const closeMenu = () => {
    setMenuOpen(false);
    setShowAccountMenu(false);
  };

  const getDashboardPath = () => {
    const role = localStorage.getItem("role");

    if (role === "doctor") return "/doctor-dashboard";
    if (role === "admin") return "/admin-dashboard";

    return "/patient-dashboard";
  };

  const getInitials = (name) => {
    if (!name || !name.trim()) return "U";

    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    return parts[0].slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");

    window.dispatchEvent(new Event("authChange"));

    setIsLoggedIn(false);
    setUserName("");
    setShowLogoutConfirm(false);
    setShowAccountMenu(false);

    closeMenu();

    navigate("/", { replace: true });
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
            {!isLoggedIn && (
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `login-link ${isActive ? "active" : ""}`
                }
                onClick={closeMenu}
              >
                Login
              </NavLink>
            )}

            {isLoggedIn && (
              <div className="account-menu-wrapper">

                {/* My Account */}
                <button
                  type="button"
                  className={`account-menu-btn ${
                    showAccountMenu ? "active" : ""
                  }`}
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                  aria-label="My Account"
                  aria-expanded={showAccountMenu}
                >
                  My Account
                </button>

                {/* My Profile */}
                <Link
                  to={getDashboardPath()}
                  className="profile-btn"
                  aria-label="My Profile"
                  onClick={closeMenu}
                >
                  {getInitials(userName)}
                </Link>

                {/* Account Dropdown */}
                {showAccountMenu && (
                  <div className="account-dropdown">
                    <Link to={getDashboardPath()} onClick={closeMenu}>
                      My Dashboard
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountMenu(false);
                        setShowLogoutConfirm(true);
                      }}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="logout-modal-overlay"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="logout-modal-icon">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>
            </div>

            <h3 id="logout-modal-title">Log out?</h3>

            <p>
              Are you sure you want to log out of your Clinika account?
            </p>

            <div className="logout-modal-actions">
              <button
                type="button"
                className="logout-cancel-btn"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="logout-confirm-btn"
                onClick={handleLogout}
              >
                Yes, Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
