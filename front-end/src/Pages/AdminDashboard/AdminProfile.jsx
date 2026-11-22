import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "https://clinika-backend.vercel.app";

const INITIAL_ADMIN = {
  fullName: "",
  roleBadge: "ADMIN",
  subtitle: "Clinika Platform Admin Network",
  adminId: "",
  lastLogin: "",
  twoFactor: true,
  sessionActive: true,
  accountTrust: "100%",
  trustStatus: "Verified Session",
  email: "",
  phone: "",
  clearanceLevel: "ADMIN",
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

export default function AdminProfile() {
  const navigate = useNavigate();

  const [adminData, setAdminData] = useState(INITIAL_ADMIN);
  const [savedData, setSavedData] = useState(INITIAL_ADMIN);
  const [logs, setLogs] = useState([]);
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

  const getToken = () =>
    localStorage.getItem("token") || localStorage.getItem("access_token") || "";

  const notify = useCallback((type, text) => {
    setBanner({ type, text });
    setTimeout(() => {
      setBanner((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const fetchAdminLogs = useCallback(
    async () => {
      const token = getToken();
      if (!token) {
      
          setLoadingLogs(false);
          navigate("/login", { replace: true });
        
        return;
      }

      
        setLoadingLogs(true);
      

      const headers = { Authorization: `Bearer ${token}` };

      try {
        const res = await axios.get(`${API_BASE_URL}/admin/audit-logs`, {
          headers,
          timeout: 6000,
        });
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.data || res.data?.logs || res.data?.items || [];

       
          setLogs(
            Array.isArray(list)
              ? list.map((row, idx) => ({
                  id: row.id ?? row._id ?? idx + 1,
                  title:
                    row.action ||
                    row.title ||
                    row.event ||
                    row.description ||
                    "Administrative action",
                  time: row.time || row.created_at || row.timestamp || "",
                  actor: row.actor || row.admin_name || row.user || "",
                  note: row.detail || row.details || "",
                }))
              : []
          );
        
      } catch (err) {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          
            setLogs([]);
            notify("error", "You are not authorized to view admin audit logs.");
          
          return;
        }

        try {
          const fallbackRes = await axios.get(`${API_BASE_URL}/admin/activity`, {
            headers,
            timeout: 5000,
          });
          const actList = Array.isArray(fallbackRes.data)
            ? fallbackRes.data
            : fallbackRes.data?.data || fallbackRes.data?.items || [];

          
            setLogs(
              Array.isArray(actList)
                ? actList.map((row, idx) => ({
                    id: row.id ?? row._id ?? idx + 1,
                    title: row.action || row.title || row.event || "Activity log",
                    time: row.time || row.created_at || "",
                    actor: row.actor || "",
                    note: row.detail || "",
                  }))
                : []
            );
          
        } catch {
          
            setLogs([]);
          
        }
      } finally {
        
          setLoadingLogs(false);
        
      }
    },
    [navigate, notify]
  );

  useEffect(() => {
    let isActive = true;

    const loadProfileAndLogs = async () => {
      const token = getToken();
      if (token) {
        try {
          const endpoints = [
            `${API_BASE_URL}/admin/profile`,
            `${API_BASE_URL}/auth/me`,
            `${API_BASE_URL}/admin/me`,
          ];
          let profile = null;

          for (const url of endpoints) {
            const res = await axios.get(url, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 6000,
              validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
            });
            if (res.status === 404) continue;
            const candidate = res?.data?.data || res?.data?.user || res?.data?.admin || res?.data;
            if (candidate && typeof candidate === "object") {
              profile = candidate;
              break;
            }
          }

          if (isActive && profile && typeof profile === "object") {
            const nextProfile = {
              fullName: profile.full_name ?? profile.fullName ?? profile.name ?? "",
              email: profile.email ?? "",
              phone: profile.phone ?? "",
            };
            setAdminData((prev) => ({ ...prev, ...nextProfile }));
            setSavedData((prev) => ({ ...prev, ...nextProfile }));
          }
        } catch (err) {
          if (err?.response?.status !== 404) {
            console.error("Error fetching admin profile:", err);
          }
        }
      }

      if (isActive) {
        await fetchAdminLogs();
      }
    };

    loadProfileAndLogs();

    return () => {
      isActive = false;
    };
  }, [fetchAdminLogs]);
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

    const token = getToken();
    if (!token) {
      notify("error", "Authentication required to save profile changes.");
      return;
    }

    setSaving(true);
    try {
      await axios.patch(
        `${API_BASE_URL}/admin/profile`,
        {
          full_name: adminData.fullName.trim(),
          email: adminData.email.trim(),
          phone: adminData.phone.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 6000,
        }
      );

      setSavedData(adminData);
      notify("success", "Profile information saved.");
      await fetchAdminLogs();
    } catch (err) {
      console.error("Error saving profile:", err);
      notify("error", "Failed to save profile information on server.");
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

    const token = getToken();
    if (!token) {
      notify("error", "Authentication required to update password.");
      return;
    }

    setUpdatingPass(true);
    try {
      await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        {
          current_password: passForm.currentPassword,
          new_password: passForm.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 6000,
        }
      );

      setPassForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      notify("success", "Password updated successfully.");
      await fetchAdminLogs();
    } catch (err) {
      console.error("Error updating password:", err);
      notify("error", "Failed to update password on server.");
    } finally {
      setUpdatingPass(false);
    }
  };
  return (
    <div
      style={{
        backgroundColor: "#F8FAFC",
        color: "#0F172A",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "24px",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <Helmet>
        <title>Admin Profile | Clinika</title>
      </Helmet>

      {/* Top Status Strip */}
      <header
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "12px",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "14px", fontWeight: 700 }}>
            Clinika Platform Admin Network
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "#16A34A",
              backgroundColor: "#F0FDF4",
              padding: "3px 10px",
              borderRadius: "999px",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <i className="fa-solid fa-circle" style={{ fontSize: "7px" }} aria-hidden="true" />
            <span>System Status: Operational / Online</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", fontWeight: 700 }}>System Admin</div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>Platform Administration</div>
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
              fontSize: "13px",
            }}
          >
            <i className="fa-solid fa-user-shield" aria-hidden="true" />
          </div>
        </div>
      </header>

      {banner && (
        <div
          role="status"
          style={{
            marginBottom: "16px",
            padding: "11px 16px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 500,
            backgroundColor:
              banner.type === "error"
                ? "#FEF2F2"
                : banner.type === "info"
                  ? "#EFF6FF"
                  : "#F0FDF4",
            color:
              banner.type === "error"
                ? "#B91C1C"
                : banner.type === "info"
                  ? "#1B68F6"
                  : "#15803D",
            border:
              banner.type === "error"
                ? "1px solid #FECACA"
                : banner.type === "info"
                  ? "1px solid #BFDBFE"
                  : "1px solid #BBF7D0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <i
            className={
              banner.type === "error"
                ? "fa-solid fa-circle-exclamation"
                : banner.type === "info"
                  ? "fa-solid fa-circle-info"
                  : "fa-solid fa-circle-check"
            }
            aria-hidden="true"
          />
          <span>{banner.text}</span>
        </div>
      )}

      {/* Page Title & Badges */}
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
            Manage your administrator account details, security credentials, and access logs.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#16A34A",
              backgroundColor: "#F0FDF4",
              border: "1px solid #BBF7D0",
              padding: "4px 10px",
              borderRadius: "999px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <i className="fa-solid fa-circle" style={{ fontSize: "7px" }} aria-hidden="true" />
            <span>2FA Authenticated</span>
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
              width: "68px",
              height: "68px",
              borderRadius: "10px",
              backgroundColor: "#EFF6FF",
              color: "#1B68F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              flexShrink: 0,
            }}
          >
            <i className="fa-solid fa-user-tie" aria-hidden="true" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
                {adminData.fullName || "System Admin"}
              </h2>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#1B68F6",
                  backgroundColor: "#EFF6FF",
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
              {adminData.adminId && <span>ID: {adminData.adminId}</span>}
              {adminData.lastLogin && <span>Last login: {adminData.lastLogin}</span>}
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
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "8px",
            }}
          >
            <span>{adminData.accountTrust}</span>
            <i className="fa-solid fa-shield-halved" style={{ color: "#1B68F6", fontSize: "18px" }} aria-hidden="true" />
          </div>
          <div style={{ fontSize: "11px", color: "#16A34A", fontWeight: 500 }}>
            {adminData.trustStatus}
          </div>
        </div>
      </section>

      {/* Two Columns Wrapper */}
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
                <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                  Account Information
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748B" }}>
                  Permitted personal details editable only
                </p>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#1B68F6",
                  backgroundColor: "#EFF6FF",
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
                  placeholder="Administrator Name"
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
                  placeholder="admin@clinika.com"
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
                  placeholder="+20 100 000 0000"
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
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i className="fa-solid fa-circle-info" style={{ color: "#1B68F6" }} aria-hidden="true" />
              <span>
                To update administrative credentials, contact authorization is audited and changes trigger instant dual-factor alerts.
              </span>
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
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
              Security &amp; Password Management
            </h2>
            <p style={{ margin: "2px 0 14px", fontSize: "12px", color: "#64748B" }}>
              Enforce strong encryption for administrative privileges
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
                  placeholder="Enter current passphrase"
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
                    padding: "0 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#F8FAFC",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <i
                    className={showSecrets.current ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}
                    aria-hidden="true"
                  />
                  <span>{showSecrets.current ? "Hide" : "Show"}</span>
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
                gap: "12px",
                fontSize: "11px",
                marginBottom: "14px",
              }}
            >
              <span style={{ color: passValid.len ? "#16A34A" : "#64748B" }}>
                <i className="fa-solid fa-check" style={{ marginRight: "5px" }} aria-hidden="true" />
                12+ characters
              </span>
              <span style={{ color: passValid.casing ? "#16A34A" : "#64748B" }}>
                <i className="fa-solid fa-check" style={{ marginRight: "5px" }} aria-hidden="true" />
                Uppercase &amp; Lowercase
              </span>
              <span style={{ color: passValid.special ? "#16A34A" : "#64748B" }}>
                <i className="fa-solid fa-check" style={{ marginRight: "5px" }} aria-hidden="true" />
                Numeric &amp; Special symbols
              </span>
              <span style={{ color: passValid.match ? "#16A34A" : "#64748B" }}>
                <i className="fa-solid fa-check" style={{ marginRight: "5px" }} aria-hidden="true" />
                Passwords match
              </span>
            </div>

            <button
              type="submit"
              disabled={updatingPass}
              style={{
                backgroundColor: "#1B68F6",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                padding: "9px 16px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: updatingPass ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i className="fa-solid fa-key" aria-hidden="true" />
              <span>{updatingPass ? "Updating..." : "Update Password"}</span>
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
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
              Assigned Capabilities
            </h2>
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
                      padding: "4px 9px",
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
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                Audit &amp; Access Log
              </h2>
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
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "6px" }} aria-hidden="true" />
                Loading logs...
              </div>
            ) : logs.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#64748B" }}>
                No audit logs available.
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
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                      <i className="fa-solid fa-circle" style={{ fontSize: "6px", color: "#1B68F6" }} aria-hidden="true" />
                      <span>{item.title}</span>
                    </span>
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
        <span style={{ fontSize: "12px", color: "#64748B", display: "inline-flex", alignItems: "center", gap: "7px" }}>
          <i className="fa-solid fa-rotate" style={{ color: "#1B68F6" }} aria-hidden="true" />
          <span>Changes will be logged in the administrative security journal.</span>
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
                Full Audit &amp; Access Log
              </h3>
              <button
                type="button"
                onClick={() => setShowAllLogs(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "16px",
                  cursor: "pointer",
                  color: "#475569",
                }}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            {logs.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
                No audit logs available.
              </p>
            ) : (
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
                    {(entry.actor || entry.note) && (
                      <div style={{ fontSize: "11px", color: "#64748B", marginTop: "3px" }}>
                        {entry.actor ? `By ${entry.actor}` : ""}
                        {entry.actor && entry.note ? " • " : ""}
                        {entry.note || ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}