import { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import adminApi, { clearSession, getToken } from "../../api/adminApi";
import { showToast } from "../Toast/toastService";
import { stripDoctorTitle } from "../../utils/nameUtils";
import "./Navbar.css";

const DASHBOARD_CONFIG = {
  patient: {
    title: "Patient Dashboard",
    badge: "Patient",
    badgeClass: "badge-patient",
    links: [
      {
        label: "Overview",
        to: "/patient-dashboard",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </svg>
        ),
      },
      {
        label: "My Appointments",
        to: "/patient-dashboard/my-appointments",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        ),
      },
      {
        label: "Medical Records",
        to: "/patient-dashboard/medical-records",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
      {
        label: "My Profile",
        to: "/patient-dashboard/my-profile",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
      {
        label: "Notifications",
        to: "/patient-dashboard/notifications",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      },
    ],
  },
  doctor: {
    title: "Doctor Dashboard",
    badge: "Doctor",
    badgeClass: "badge-doctor",
    links: [
      {
        label: "Overview",
        to: "/doctor-dashboard",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </svg>
        ),
      },
      {
        label: "Manage Appointments",
        to: "/doctor-dashboard/manage-appointments",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <polyline points="9 16 11 18 15 14" />
          </svg>
        ),
      },
      {
        label: "Manage Availability",
        to: "/doctor-dashboard/manage-availability",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
      },
      {
        label: "My Profile",
        to: "/doctor-dashboard/my-profile",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
    ],
  },
  admin: {
    title: "Admin Dashboard",
    badge: "Admin",
    badgeClass: "badge-admin",
    links: [
      {
        label: "Overview",
        to: "/admin-dashboard",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </svg>
        ),
      },
      {
        label: "Manage Doctors",
        to: "/admin-dashboard/manage-doctors",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        ),
      },
      {
        label: "Users & Appointments",
        to: "/admin-dashboard/manage-users-and-appointments",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        label: "Messages",
        to: "/admin-dashboard/messages",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
      {
        label: "Catalog",
        to: "/admin-dashboard/catalog",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
      {
        label: "Reports",
        to: "/admin-dashboard/reports",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        ),
      },
      {
        label: "Admin Team",
        to: "/admin-dashboard/team",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
      },
      {
        label: "My Profile",
        to: "/admin-dashboard/my-profile",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
    ],
  },
};

const Navbar = () => {
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const [role, setRole] = useState(() => localStorage.getItem("role") || "");
  const [userName, setUserName] = useState(
    () => localStorage.getItem("userName") || ""
  );
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getToken()));

  useEffect(() => {
    const syncAuth = () => {
      const token = getToken();
      const logged = Boolean(token);
      setIsLoggedIn(logged);

      const savedUser = (() => {
        try {
          const u = localStorage.getItem("user");
          return u ? JSON.parse(u) : null;
        } catch {
          return null;
        }
      })();
      setUser(savedUser);

      const savedRole = localStorage.getItem("role") || savedUser?.role || "";
      setRole(savedRole);

      const rawName =
        localStorage.getItem("userName") ||
        savedUser?.full_name ||
        `${savedUser?.first_name || ""} ${savedUser?.last_name || ""}`.trim();
      const cleanName = stripDoctorTitle(rawName);
      setUserName(cleanName);

      // If token exists but user or role is not cached yet, fetch from /auth/me
      if (logged && (!savedUser || !savedRole)) {
        adminApi
          .get("/auth/me")
          .then(({ data }) => {
            if (data) {
              const full = stripDoctorTitle(
                data.full_name ||
                `${data.first_name || ""} ${data.last_name || ""}`.trim()
              );
              const cleanUser = {
                ...data,
                full_name: full,
                first_name: stripDoctorTitle(data.first_name || ""),
              };
              setUser(cleanUser);
              setRole(data.role || "");
              setUserName(full);
              localStorage.setItem("user", JSON.stringify(cleanUser));
              localStorage.setItem("role", data.role || "");
              localStorage.setItem("userName", full);
            }
          })
          .catch(() => {
            // Token might be invalid or expired
          });
      }
    };

    syncAuth();

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("storage", syncAuth);
    window.addEventListener("authChange", syncAuth);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("authChange", syncAuth);
    };
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowAccountMenu(false);
      }
    };

    if (showAccountMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAccountMenu]);

  const closeMenu = () => {
    setMenuOpen(false);
    setShowAccountMenu(false);
  };

  /**
   * أول حرف من اسم المستخدم وأول حرف من اسم أبوه (أو اسم العائلة)
   * مع إزالة ألقاب مثل DR. أو Dr. أو Doctor حتى لا تؤثر على الحروف الأولى
   */
  const getInitials = () => {
    let first = "";
    let second = "";

    const cleanFirst = stripDoctorTitle(user?.first_name || "");
    const cleanLast = (user?.last_name || "").trim();

    if (cleanFirst) {
      first = cleanFirst[0];
    }
    if (cleanLast) {
      second = cleanLast[0];
    }

    if (!first && userName) {
      const cleanU = stripDoctorTitle(userName);
      const parts = cleanU.trim().split(/\s+/);
      if (parts.length >= 2) {
        first = parts[0][0];
        second = parts[1][0];
      } else if (parts.length === 1 && parts[0]) {
        first = parts[0][0];
      }
    }

    if (!first && user?.email) {
      first = user.email[0];
    }

    const res = `${first || ""}${second || ""}`.toUpperCase();
    return res || "U";
  };

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem("role");
    localStorage.removeItem("userName");

    window.dispatchEvent(new Event("authChange"));

    setIsLoggedIn(false);
    setUser(null);
    setRole("");
    setUserName("");
    setShowLogoutConfirm(false);
    setShowAccountMenu(false);

    closeMenu();

    // Trigger feedback notification via Bootstrap toast
    showToast({
      type: "info",
      title: "Logged Out",
      message: "You have been logged out successfully. Stay safe & healthy!",
    });

    navigate("/", { replace: true });
  };

  const currentRole = role || user?.role || "patient";
  const currentConfig = DASHBOARD_CONFIG[currentRole] || DASHBOARD_CONFIG.patient;
  const displayName = stripDoctorTitle(userName || user?.full_name || "Clinika User");

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
            {!isLoggedIn ? (
              /* إذا لم يكن المستخدم مسجلاً: يظهر زر Login و Register و Book Appointment */
              <>
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
                  to="/register"
                  className={({ isActive }) =>
                    `register-link ${isActive ? "active" : ""}`
                  }
                  onClick={closeMenu}
                >
                  Register
                </NavLink>

                <Link
                  to="/doctors"
                  className="appointment-btn"
                  onClick={closeMenu}
                >
                  Book Appointment
                </Link>
              </>
            ) : (
              /* إذا كان المستخدم مسجلاً */
              <div className="account-menu-wrapper" ref={menuRef}>
                {/* إذا كان مريضاً: يظهر زر Book Appointment */}
                {currentRole === "patient" && (
                  <Link
                    to="/doctors"
                    className="appointment-btn"
                    onClick={closeMenu}
                  >
                    Book Appointment
                  </Link>
                )}

                {/* أيقونة المستخدم (تحمل أول حرف من اسمه واسم أبوه) وتفتح القائمة */}
                <button
                  type="button"
                  className={`profile-btn ${showAccountMenu ? "active" : ""}`}
                  onClick={() => setShowAccountMenu((prev) => !prev)}
                  aria-label="Open User Dashboard Menu"
                  aria-expanded={showAccountMenu}
                >
                  <span className="profile-btn-initials">{getInitials()}</span>
                  <span className="profile-btn-label">
                    {displayName || "My Dashboard"}
                  </span>
                </button>

                {/* القائمة المنسدلة للداشبورد */}
                {showAccountMenu && (
                  <div className="account-dropdown">
                    {/* معلومات المستخدم بالرأس */}
                    <div className="account-dropdown-header">
                      <div className="account-dropdown-avatar">
                        {getInitials()}
                      </div>
                      <div className="account-dropdown-info">
                        <span className="account-dropdown-name">
                          {displayName}
                        </span>
                        <span
                          className={`account-dropdown-role ${currentConfig.badgeClass}`}
                        >
                          {currentConfig.badge}
                        </span>
                      </div>
                    </div>

                    <div className="account-dropdown-divider" />

                    {/* صفحات الداشبورد المتاحة للمستخدم */}
                    <div className="account-dropdown-links">
                      {currentConfig.links.map((link) => (
                        <Link
                          key={link.to}
                          to={link.to}
                          className="account-dropdown-item"
                          onClick={closeMenu}
                        >
                          <span className="account-dropdown-item-icon">
                            {link.icon}
                          </span>
                          <span className="account-dropdown-item-label">
                            {link.label}
                          </span>
                        </Link>
                      ))}
                    </div>

                    <div className="account-dropdown-divider" />

                    {/* زر تسجيل الخروج */}
                    <button
                      type="button"
                      className="account-dropdown-logout"
                      onClick={() => {
                        setShowAccountMenu(false);
                        setShowLogoutConfirm(true);
                      }}
                    >
                      <span className="account-dropdown-item-icon">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                      </span>
                      <span>Log out</span>
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

            <p>Are you sure you want to log out of your Clinika account?</p>

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
