import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const token =
    localStorage.getItem('token') || localStorage.getItem('access_token');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    navigate('/login', { replace: true });
  };

  if (!token) {
    return null;
  }

  const navItems = [
    {
      to: '/admin-dashboard',
      end: true,
      label: 'Overview',
      icon: 'fa-chart-line',
    },
    {
      to: 'manage-doctors',
      end: false,
      label: 'Manage Doctors',
      icon: 'fa-user-doctor',
    },
    {
      to: 'manage-users-and-appointments',
      end: false,
      label: 'Manage Users & Appointments',
      icon: 'fa-calendar-check',
    },
    {
      to: 'my-profile',
      end: false,
      label: 'Profile',
      icon: 'fa-user',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        fontFamily: 'sans-serif',
        width: '100%',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
      }}
    >
      <Helmet>
        <title>Admin Dashboard | Clinika</title>
      </Helmet>

      {/* Sidebar الموحد */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          flexShrink: 0,
          minHeight: '100vh',
        }}
      >
        <div>
          {/* Logo & Portal Label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '32px',
              paddingLeft: '8px',
            }}
          >
            <span
              style={{
                backgroundColor: '#1B68F6',
                color: '#FFFFFF',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
              }}
            >
              <i className="fa-solid fa-hospital" aria-hidden="true" />
            </span>
            <div>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#0F172A',
                  margin: 0,
                }}
              >
                Clinika
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  color: '#64748B',
                  letterSpacing: '0.04em',
                }}
              >
                ADMIN PORTAL
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? '600' : '500',
                  backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                  color: isActive ? '#1B68F6' : '#64748B',
                  transition: 'all 0.15s ease',
                })}
              >
                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Logout Action */}
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 16px',
              color: '#EF4444',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              textAlign: 'left',
            }}
          >
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area via Outlet */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#F8FAFC',
          boxSizing: 'border-box',
          minWidth: 0,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

