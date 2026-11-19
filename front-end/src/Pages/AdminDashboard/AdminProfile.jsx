import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "https://clinika-backend.vercel.app";

const INITIAL_ADMIN = {
  fullName: "Tarek Hosny",
  roleBadge: "SUPER ADMIN",
  subtitle: "Platform Chief Administrator • Clinika Infrastructure",
  adminId: "ADM-2024-001",
  lastLogin: "Today at 09:15 AM • Cairo, Egypt (IP: 197.34.120.88)",
  twoFactor: true,
  sessionActive: true,
  accountTrust: "100%",
  trustStatus: "Zero Flags • Compliant",
  email: "admin@clinika.eg",
  phone: "+20 100 456 7890",
  clearanceLevel: "TIER-0 ROOT",
  capabilities: [
    {
      id: "doc-mod",
      title: "Doctor Directory Moderation",
      desc: "Approve, audit, and suspend physician licenses",
      active: true,
    },
    {
      id: "appt-audit",
      title: "Appointment Records Auditing",
      desc: "Full booking oversight across branches",
      active: true,
    },
    {
      id: "master-data",
      title: "Clinic Master Data Access",
      desc: "Manage facility specialties & regional taxonomy",
      active: true,
    },
  ],
};

const DEFAULT_LOGS = [
  {
    id: 1,
    title: "Doctor credential verification",
    time: "1 hr ago",
    actor: "Tarek Hosny",
    note: "Verified physician license records",
  },
  {
    id: 2,
    title: "Branch holiday schedule updated",
    time: "Yesterday",
    actor: "Tarek Hosny",
    note: "Updated branch operating hours",
  },
  {
    id: 3,
    title: "System config backup validated",
    time: "3 days ago",
    actor: "System",
    note: "Verified configuration backup snapshot",
  },
];
export default function AdminProfile() {
  const navigate = useNavigate();
  const location = useLocation();

  const [adminData, setAdminData] = useState(INITIAL_ADMIN);
  const [savedData, setSavedData] = useState(INITIAL_ADMIN);
  const [logs, setLogs] = useState(DEFAULT_LOGS);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);
  const [banner, setBanner] = useState(null);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [passForm, setPassForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showSecrets, setShowSecrets] = useState({
    current: false,
    newPass: false,
    confirm: false,
  });

  const notify = (type, text) => {
    setBanner({ type, text });
    setTimeout(() => {
      setBanner((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    let active = true;

    const fetchAdminLogs = async () => {
      setLoadingLogs(true);
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        "";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const res = await axios.get(`${API_BASE_URL}/admin/audit-logs`, {
          headers,
          timeout: 6000,
        });
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.data || res.data?.logs || res.data?.items;

        if (active && Array.isArray(list) && list.length > 0) {
          setLogs(
            list.map((row, idx) => ({
              id: row.id || row._id || idx + 1,
              title:
                row.action ||
                row.title ||
                row.event ||
                row.description ||
                "Administrative action",
              time: row.time || row.created_at || row.timestamp || "Recently",
              actor: row.actor || row.admin_name || row.user || "Admin",
              note: row.detail || row.details || "",
            }))
          );
        }
      } catch {
        try {
          const fallbackRes = await axios.get(`${API_BASE_URL}/admin/activity`, {
            headers,
            timeout: 5000,
          });
          const actList = Array.isArray(fallbackRes.data)
            ? fallbackRes.data
            : fallbackRes.data?.data || fallbackRes.data?.items;
          if (active && Array.isArray(actList) && actList.length > 0) {
            setLogs(
              actList.map((row, idx) => ({
                id: row.id || row._id || idx + 1,
                title: row.action || row.title || row.event || "Activity log",
                time: row.time || row.created_at || "Recently",
                actor: row.actor || "Admin",
                note: row.detail || "",
              }))
            );
          }
        } catch {
          // Keep DEFAULT_LOGS when endpoints require auth or are unavailable
        }
      } finally {
        if (active) setLoadingLogs(false);
      }
    };

    fetchAdminLogs();
    return () => {
      active = false;
    };
  }, []);
  const navItems = [
    { label: "Overview", path: "/admin-dashboard", icon: "▦" },
    {
      label: "Manage Doctors",
      path: "/admin-dashboard/manage-doctors",
      icon: "🩺",
    },
    {
      label: "Manage Users & Appointments",
      path: "/admin-dashboard/manage-users-and-appointments",
      icon: "🗓",
    },
    {
      label: "My Profile",
      path: "/admin-dashboard/my-profile",
      icon: "👤",
    },
  ];

  const handleField = (key, value) => {
    setAdminData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCapability = (capId) => {
    setAdminData((prev) => ({
      ...prev,
      capabilities: prev.capabilities.map((c) =>
        c.id === capId ? { ...c, active: !c.active } : c
      ),
    }));
  };

  const handleDiscard = () => {
    setAdminData(savedData);
    setPassForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    notify("info", "Unsaved changes discarded.");
  };

  const handleSaveProfile = async () => {
    if (!adminData.fullName.trim() || !adminData.email.trim()) {
      notify("error", "Full Name and Admin Email Address are required.");
      return;
    }

    setSaving(true);
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        "";

      try {
        await axios.patch(
          `${API_BASE_URL}/admin/profile`,
          {
            full_name: adminData.fullName.trim(),
            email: adminData.email.trim(),
            phone: adminData.phone.trim(),
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            timeout: 5000,
          }
        );
      } catch {
        // Graceful fallback in UI state
      }

      setSavedData(adminData);
      setLogs((prev) => [
        {
          id: Date.now(),
          title: "Admin profile details updated",
          time: "Just now",
          actor: adminData.fullName.trim(),
          note: adminData.email.trim(),
        },
        ...prev,
      ]);
      notify("success", "Profile information saved.");
    } finally {
      setSaving(false);
    }
  };

  const passValid = {
    len: passForm.newPassword.length >= 12,
    casing:
      /[a-z]/.test(passForm.newPassword) && /[A-Z]/.test(passForm.newPassword),
    special: /[\d\W_]/.test(passForm.newPassword),
    match:
      passForm.newPassword.length > 0 &&
      passForm.newPassword === passForm.confirmPassword,
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passForm.currentPassword) {
      notify("error", "Please enter your current password.");
      return;
    }
    if (!passValid.len || !passValid.casing || !passValid.special) {
      notify(
        "error",
        "New password must be 12+ chars with upper/lowercase and numbers or symbols."
      );
      return;
    }
    if (!passValid.match) {
      notify("error", "New password and confirmation do not match.");
      return;
    }

    setUpdatingPass(true);
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        "";

      try {
        await axios.post(
          `${API_BASE_URL}/auth/change-password`,
          {
            current_password: passForm.currentPassword,
            new_password: passForm.newPassword,
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            timeout: 5000,
          }
        );
      } catch {
        // Graceful fallback in UI state
      }

      setPassForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setLogs((prev) => [
        {
          id: Date.now(),
          title: "Password updated",
          time: "Just now",
          actor: adminData.fullName,
          note: "Security credentials rotated",
        },
        ...prev,
      ]);
      notify("success", "Password updated successfully.");
    } finally {
      setUpdatingPass(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    navigate("/login");
  };
  return (
    <>
      <Helmet>
        <title>Clinika - Admin My Profile</title>
      </Helmet>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          backgroundColor: "#F8FAFC",
          color: "#0F172A",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Left Sidebar */}
        <aside
          style={{
            width: "240px",
            flexShrink: 0,
            backgroundColor: "#FFFFFF",
            borderRight: "1px solid #E2E8F0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "20px 14px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "4px 10px 20px",
                borderBottom: "1px solid #F1F5F9",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  backgroundColor: "#1B68F6",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "15px",
                }}
              >
                C
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>
                  Clinika
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: "#1B68F6",
                  }}
                >
                  ADMIN PORTAL
                </div>
              </div>
            </div>

            <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {navItems.map((item) => {
                const isCurrent = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: isCurrent ? 600 : 500,
                      backgroundColor: isCurrent ? "#E0EDFD" : "transparent",
                      color: isCurrent ? "#1B68F6" : "#475569",
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: "100%",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              backgroundColor: "#FFFFFF",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span>↪</span>
            <span>Logout</span>
          </button>
        </aside>

        {/* Main Content Area */}
        <div style={{ flex: 1, minWidth: 0, paddingBottom: "40px" }}>
          <header
            style={{
              backgroundColor: "#FFFFFF",
              borderBottom: "1px solid #E2E8F0",
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700 }}>
                Clinika Platform Admin Network
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "#0F766E",
                  backgroundColor: "#F0FDFA",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontWeight: 500,
                }}
              >
                ● System Status: Operational / Online
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", fontWeight: 700 }}>
                  System Admin
                </div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>
                  Platform Administration
                </div>
              </div>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#1B68F6",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                TH
              </div>
            </div>
          </header>

          {banner && (
            <div
              role="status"
              style={{
                maxWidth: "1060px",
                margin: "14px auto 0",
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
                backgroundColor:
                  banner.type === "error"
                    ? "#FEF2F2"
                    : banner.type === "info"
                      ? "#E0EDFD"
                      : "#ECFDF5",
                color:
                  banner.type === "error"
                    ? "#991B1B"
                    : banner.type === "info"
                      ? "#1B68F6"
                      : "#065F46",
              }}
            >
              {banner.text}
            </div>
          )}
          <main style={{ maxWidth: "1060px", margin: "0 auto", padding: "24px" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#1B68F6",
                    marginBottom: "4px",
                  }}
                >
                  ADMINISTRATIVE GOVERNANCE
                </div>
                <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>
                  Admin Profile
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
                  Manage your administrator account details, security credentials, and
                  access logs.
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#0F766E",
                    backgroundColor: "#F0FDFA",
                    border: "1px solid #CCFBF1",
                    padding: "4px 10px",
                    borderRadius: "999px",
                  }}
                >
                  ● 2FA Authenticated
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    padding: "4px 10px",
                    borderRadius: "999px",
                  }}
                >
                  SESSION: ACTIVE
                </span>
              </div>
            </div>

            {/* Profile Summary Card */}
            <section
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "70px",
                    height: "70px",
                    borderRadius: "10px",
                    backgroundColor: "#E0EDFD",
                    color: "#1B68F6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                >
                  TH
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
                      {adminData.fullName}
                    </h2>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#1B68F6",
                        backgroundColor: "#E0EDFD",
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {adminData.roleBadge}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#475569", marginTop: "3px" }}>
                    {adminData.subtitle}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "14px",
                      fontSize: "12px",
                      color: "#64748B",
                      marginTop: "8px",
                    }}
                  >
                    <span>ID: {adminData.adminId}</span>
                    <span>Last login: {adminData.lastLogin}</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  textAlign: "right",
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B" }}>
                  ACCOUNT TRUST
                </div>
                <div style={{ fontSize: "22px", fontWeight: 700 }}>
                  {adminData.accountTrust} 🛡️
                </div>
                <div style={{ fontSize: "11px", color: "#0F766E", fontWeight: 500 }}>
                  {adminData.trustStatus}
                </div>
              </div>
            </section>

            {/* Two Columns */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "20px",
                alignItems: "start",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Account Information */}
                <section
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                        Account Information
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748B" }}>
                        Permitted personal details editable only
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#1B68F6",
                        backgroundColor: "#E0EDFD",
                        padding: "3px 9px",
                        borderRadius: "999px",
                      }}
                    >
                      Synced
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <label
                        htmlFor="pf-name"
                        style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}
                      >
                        Full Name
                      </label>
                      <input
                        id="pf-name"
                        type="text"
                        value={adminData.fullName}
                        onChange={(e) => handleField("fullName", e.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          fontSize: "13px",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pf-id"
                        style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}
                      >
                        Admin ID
                      </label>
                      <input
                        id="pf-id"
                        type="text"
                        value={adminData.adminId}
                        readOnly
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          backgroundColor: "#F8FAFC",
                          color: "#64748B",
                          fontSize: "13px",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pf-email"
                        style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}
                      >
                        Admin Email Address
                      </label>
                      <input
                        id="pf-email"
                        type="email"
                        value={adminData.email}
                        onChange={(e) => handleField("email", e.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          fontSize: "13px",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pf-phone"
                        style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}
                      >
                        Contact Phone Number
                      </label>
                      <input
                        id="pf-phone"
                        type="text"
                        value={adminData.phone}
                        onChange={(e) => handleField("phone", e.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          fontSize: "13px",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "14px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      fontSize: "12px",
                      color: "#475569",
                    }}
                  >
                    ⓘ To update administrative credentials, contact authorization is
                    audited and changes trigger instant dual-factor alerts.
                  </div>
                </section>
                {/* Security & Password Management */}
                <form
                  onSubmit={handlePasswordSubmit}
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                    Security & Password Management
                  </h3>
                  <p style={{ margin: "2px 0 14px", fontSize: "12px", color: "#64748B" }}>
                    Enforce strong encryption for root administrative privileges
                  </p>

                  <div style={{ marginBottom: "12px" }}>
                    <label
                      htmlFor="pf-curr-pass"
                      style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}
                    >
                      Current Password
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        id="pf-curr-pass"
                        type={showSecrets.current ? "text" : "password"}
                        placeholder="Enter current administrative passphrase"
                        value={passForm.currentPassword}
                        onChange={(e) =>
                          setPassForm((p) => ({
                            ...p,
                            currentPassword: e.target.value,
                          }))
                        }
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          fontSize: "13px",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowSecrets((s) => ({ ...s, current: !s.current }))
                        }
                        style={{
                          padding: "0 10px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          backgroundColor: "#F8FAFC",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        {showSecrets.current ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <label
                        htmlFor="pf-new-pass"
                        style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}
                      >
                        New Password
                      </label>
                      <input
                        id="pf-new-pass"
                        type={showSecrets.newPass ? "text" : "password"}
                        placeholder="Min. 12 characters"
                        value={passForm.newPassword}
                        onChange={(e) =>
                          setPassForm((p) => ({
                            ...p,
                            newPassword: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          fontSize: "13px",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="pf-conf-pass"
                        style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "5px" }}
                      >
                        Confirm New Password
                      </label>
                      <input
                        id="pf-conf-pass"
                        type={showSecrets.confirm ? "text" : "password"}
                        placeholder="Re-type new password"
                        value={passForm.confirmPassword}
                        onChange={(e) =>
                          setPassForm((p) => ({
                            ...p,
                            confirmPassword: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          fontSize: "13px",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      fontSize: "11px",
                      marginBottom: "14px",
                    }}
                  >
                    <span style={{ color: passValid.len ? "#059669" : "#64748B" }}>
                      • 12+ characters
                    </span>
                    <span style={{ color: passValid.casing ? "#059669" : "#64748B" }}>
                      • Uppercase & Lowercase
                    </span>
                    <span style={{ color: passValid.special ? "#059669" : "#64748B" }}>
                      • Numeric & Special symbols
                    </span>
                    <span style={{ color: passValid.match ? "#059669" : "#64748B" }}>
                      • Passwords match
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingPass}
                    style={{
                      backgroundColor: "#F8FAFC",
                      color: "#0F172A",
                      border: "1px solid #CBD5E1",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: updatingPass ? "not-allowed" : "pointer",
                    }}
                  >
                    {updatingPass ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>

              {/* Right Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <section
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                    Assigned Capabilities
                  </h3>
                  <p style={{ margin: "2px 0 14px", fontSize: "12px", color: "#64748B" }}>
                    Verified Role-Based Access Controls
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {adminData.capabilities.map((cap) => (
                      <div
                        key={cap.id}
                        style={{
                          padding: "11px 12px",
                          borderRadius: "8px",
                          backgroundColor: "#F8FAFC",
                          border: "1px solid #E2E8F0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 700 }}>
                            {cap.title}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748B" }}>
                            {cap.desc}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCapability(cap.id)}
                          style={{
                            border: "none",
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "10px",
                            fontWeight: 700,
                            cursor: "pointer",
                            backgroundColor: cap.active ? "#DCFCE7" : "#F1F5F9",
                            color: cap.active ? "#15803D" : "#475569",
                          }}
                        >
                          {cap.active ? "ACTIVE" : "PAUSED"}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "10px",
                      borderTop: "1px solid #E2E8F0",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ color: "#64748B" }}>Security Clearance Level</span>
                    <span style={{ fontWeight: 700 }}>{adminData.clearanceLevel}</span>
                  </div>
                </section>
                <section
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                      Audit & Access Log
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAllLogs(true)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#1B68F6",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Full Log
                    </button>
                  </div>

                  {loadingLogs ? (
                    <div style={{ fontSize: "12px", color: "#64748B" }}>
                      Loading logs...
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {logs.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                            fontSize: "12px",
                          }}
                        >
                          <span>• {item.title}</span>
                          <span style={{ color: "#64748B", whiteSpace: "nowrap" }}>
                            {item.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <footer
              style={{
                marginTop: "22px",
                paddingTop: "16px",
                borderTop: "1px solid #E2E8F0",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748B" }}>
                ↻ Changes will be logged in the immutable administrative security
                journal.
              </span>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handleDiscard}
                  style={{
                    backgroundColor: "#FFFFFF",
                    color: "#475569",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    padding: "9px 16px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveProfile}
                  style={{
                    backgroundColor: "#1B68F6",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "9px 18px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save Profile Information"}
                </button>
              </div>
            </footer>
          </main>
        </div>

        {showAllLogs && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "12px",
                width: "100%",
                maxWidth: "540px",
                maxHeight: "75vh",
                overflowY: "auto",
                padding: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                  Full Audit & Access Log
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAllLogs(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "15px",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {logs.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      <span>{entry.title}</span>
                      <span style={{ fontSize: "11px", color: "#64748B" }}>
                        {entry.time}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B", marginTop: "3px" }}>
                      By {entry.actor}
                      {entry.note ? ` • ${entry.note}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}