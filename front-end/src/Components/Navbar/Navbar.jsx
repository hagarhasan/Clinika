import { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useQueryClient } from "@tanstack/react-query";
import { listDoctors } from "../../api/doctorsApi";
import { useUnreadCount } from "../../hooks/useNotifications";
import { formatName } from "../../utils/format";
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
  const { user, role: authRole, token, logout } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isLoggedIn = Boolean(token);
  const unreadQuery = useUnreadCount({ enabled: isLoggedIn });
  const unreadCount = typeof unreadQuery.data === "number"
    ? unreadQuery.data
    : Number(unreadQuery.data?.unread || 0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const role = authRole || user?.role || "";
  const userName = formatName(
    user?.full_name ||
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Listen for unread badge changes across the application
  useEffect(() => {
    const onUnreadChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    };
    window.addEventListener("cl-pd-unread-changed", onUnreadChanged);
    return () => {
      window.removeEventListener("cl-pd-unread-changed", onUnreadChanged);
    };
  }, [queryClient]);

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

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    setShowAccountMenu(false);

    closeMenu();

    showToast({
      type: "info",
      title: "Logged Out",
      message: "You have been logged out successfully. Stay safe & healthy!",
    });

    navigate("/", { replace: true });
  };

  const currentRole = role || user?.role || "patient";
  const currentConfig = DASHBOARD_CONFIG[currentRole] || DASHBOARD_CONFIG.patient;
  const displayName = formatName(userName || user?.full_name || "Clinika User");

  return (
    <header className={`clinika-header sticky-top bg-white border-bottom ${scrolled ? "scrolled" : ""}`}>
      <nav className="navbar navbar-expand-lg navbar-light py-2 py-lg-3" aria-label="Main Navigation">
        <div className="container">
          {/* Logo */}
          <Link to="/" className="navbar-brand d-flex align-items-center text-decoration-none" onClick={closeMenu}>
            <span className="navbar-logo-text">Clinika</span>
          </Link>

          {/* Bootstrap Toggler */}
          <button
            className={`navbar-toggler border-0 shadow-none p-2 ${menuOpen ? "" : "collapsed"}`}
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-controls="clinikaNavbarContent"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Collapsible Content */}
          <div className={`collapse navbar-collapse ${menuOpen ? "show" : ""}`} id="clinikaNavbarContent">
            {/* Center Navigation Links */}
            <ul className="navbar-nav mx-auto mb-3 mb-lg-0 align-items-lg-center gap-1 gap-lg-2">
              <li className="nav-item">
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
              </li>

              <li className="nav-item">
                <NavLink
                  to="/doctors"
                  onMouseEnter={() => {
                    queryClient.prefetchQuery({
                      queryKey: ["doctors", "list", { limit: 20, offset: 0, sort: "recommended" }],
                      queryFn: ({ signal }) => listDoctors({ limit: 20, offset: 0, sort: "recommended" }, signal),
                    });
                  }}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""}`
                  }
                  onClick={closeMenu}
                >
                  Doctors
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""}`
                  }
                  onClick={closeMenu}
                >
                  About
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink
                  to="/contact"
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""}`
                  }
                  onClick={closeMenu}
                >
                  Contact
                </NavLink>
              </li>
            </ul>

            {/* Right Side Actions */}
            <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2 gap-lg-3 pt-3 pt-lg-0">
              {!isLoggedIn ? (
                /* زائر غير مسجل: يظهر زر Login و Register و Book Appointment */
                <>
                  <NavLink
                    to="/login"
                    className={({ isActive }) =>
                      `btn btn-clinika-text ${isActive ? "active" : ""}`
                    }
                    onClick={closeMenu}
                  >
                    Login
                  </NavLink>

                  <NavLink
                    to="/register"
                    className={({ isActive }) =>
                      `btn btn-clinika-secondary ${isActive ? "active" : ""}`
                    }
                    onClick={closeMenu}
                  >
                    Register
                  </NavLink>

                  <Link
                    to="/doctors"
                    className="btn btn-clinika-primary"
                    onClick={closeMenu}
                  >
                    Book Appointment
                  </Link>
                </>
              ) : (
                /* مستخدم مسجل */
                <div className="d-flex align-items-center gap-2" ref={menuRef}>
                  {/* زر حجز موعد للمريض فقط */}
                  {currentRole === "patient" && (
                    <Link
                      to="/doctors"
                      className="btn btn-clinika-primary me-lg-1"
                      onClick={closeMenu}
                    >
                      Book Appointment
                    </Link>
                  )}

                  {/* زر الأيقونة الدائرية والقائمة المنسدلة */}
                  <div className="dropdown position-relative">
                    <button
                      type="button"
                      className={`btn profile-avatar-btn ${showAccountMenu ? "active" : ""}`}
                      onClick={() => setShowAccountMenu((prev) => !prev)}
                      aria-expanded={showAccountMenu}
                      aria-label={`User Account Menu${unreadCount > 0 ? `, ${unreadCount} unread notifications` : ""}`}
                    >
                      {/* أيقونة المستخدم (شخص) بدون أي حروف */}
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      {/* شارة الإشعارات الحقيقية في حال وجود إشعارات غير مقروءة */}
                      {unreadCount > 0 && (
                        <span
                          className="profile-btn-badge"
                          aria-label={`${unreadCount} unread notifications`}
                          title={`${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`}
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                      <span className="profile-avatar-name d-lg-none ms-2">{displayName}</span>
                    </button>

                    {/* القائمة المنسدلة للداشبورد */}
                    {showAccountMenu && (
                      <div className="dropdown-menu dropdown-menu-end show account-dropdown p-2 shadow-lg border">
                        {/* رأس القائمة */}
                        <div className="account-dropdown-header d-flex align-items-center gap-2 p-2 rounded mb-2">
                          <div className="account-dropdown-avatar d-flex align-items-center justify-content-center text-white rounded-circle flex-shrink-0">
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <div className="account-dropdown-info min-w-0 flex-grow-1">
                            <div className="account-dropdown-name fw-bold text-truncate">
                              {displayName}
                            </div>
                            <span className={`badge account-dropdown-badge ${currentConfig.badgeClass}`}>
                              {currentConfig.badge}
                            </span>
                          </div>
                        </div>

                        {/* تنبيه الإشعارات الحقيقية داخل القائمة المنسدلة */}
                        {unreadCount > 0 && (
                          <Link
                            to={currentRole === "patient" ? "/patient-dashboard/notifications" : "#"}
                            className="d-flex align-items-center justify-content-between p-2 mb-2 rounded text-decoration-none"
                            style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}
                            onClick={closeMenu}
                          >
                            <span className="d-flex align-items-center gap-2" style={{ fontSize: "12px", fontWeight: "600" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                              </svg>
                              {unreadCount} Unread Notification{unreadCount > 1 ? "s" : ""}
                            </span>
                            <span className="badge bg-danger rounded-pill" style={{ fontSize: "10.5px" }}>{unreadCount}</span>
                          </Link>
                        )}

                        <div className="dropdown-divider my-1"></div>

                        {/* روابط الداشبورد المتاحة للرتبة */}
                        <div className="account-dropdown-links d-flex flex-column gap-1">
                          {currentConfig.links.map((link) => (
                            <Link
                              key={link.to}
                              to={link.to}
                              className="dropdown-item d-flex align-items-center gap-2 rounded px-2 py-2"
                              onClick={closeMenu}
                            >
                              <span className="dropdown-item-icon text-muted d-flex align-items-center">
                                {link.icon}
                              </span>
                              <span className="dropdown-item-label fw-medium flex-grow-1">
                                {link.label}
                              </span>
                              {link.label === "Notifications" && unreadCount > 0 && (
                                <span className="badge bg-danger rounded-pill ms-auto" style={{ fontSize: "10.5px" }}>
                                  {unreadCount}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>

                        <div className="dropdown-divider my-1"></div>

                        {/* زر تسجيل الخروج */}
                        <button
                          type="button"
                          className="dropdown-item d-flex align-items-center gap-2 rounded px-2 py-2 text-danger fw-bold"
                          onClick={() => {
                            setShowAccountMenu(false);
                            setShowLogoutConfirm(true);
                          }}
                        >
                          <span className="dropdown-item-icon text-danger d-flex align-items-center">
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
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)", zIndex: 10500 }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: "420px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 rounded-4 shadow-lg p-3">
              <div className="modal-body text-center p-4">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{
                    width: "56px",
                    height: "56px",
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                  }}
                >
                  <svg
                    width="28"
                    height="28"
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
                </div>
                <h4 className="fw-bold text-dark mb-2">Log out?</h4>
                <p className="text-muted mb-4 fs-6">
                  Are you sure you want to log out of your Clinika account?
                </p>
                <div className="d-flex justify-content-center gap-3">
                  <button
                    type="button"
                    className="btn btn-clinika-secondary px-4 py-2"
                    onClick={() => setShowLogoutConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-4 py-2 fw-semibold"
                    style={{ borderRadius: "10px" }}
                    onClick={handleLogout}
                  >
                    Yes, Log out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
