import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DashboardProvider } from '../../context/DashboardContext';
export default function AdminDashboard() {
  const navigate = useNavigate();
const location = useLocation();
const getCurrentPageTitle = () => {
  const path = location.pathname;
  if (path.includes('manage-doctors')) return 'Manage Doctors';
  if (path.includes('manage-users-and-appointments')) return 'Manage Users & Appointments';
  if (path.includes('my-profile')) return 'Admin Profile';
  return 'Overview';
};
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
    <DashboardProvider>
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
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              flexShrink: 0,
            }}
          >
            <i className="fa-solid fa-plus" aria-hidden="true" />
          </span>
          <div>
            <h2
              style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#0F172A',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Clinika
            </h2>
            <span
              style={{
                fontSize: '10px',
                fontWeight: '700',
                color: '#1B68F6',
                letterSpacing: '0.08em',
                display: 'block',
                marginTop: '2px',
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
          <div style={{ marginTop: '8px' }}>
              <NavLink
                to="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#475569',
                  backgroundColor: '#F8FAFC',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                <span>Back to site</span>
              </NavLink>
            </div>
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
       {/* Unified Top Header */}
<header
  style={{
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    padding: '12px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  }}
>
 <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div
          style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#0F172A',
            letterSpacing: '-0.015em',
            lineHeight: '1.25',
          }}
        >
          Clinika Platform Admin Network
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#64748B',
            fontWeight: '500',
            lineHeight: '1.3',
          }}
        >
          <span>Admin Portal</span>
          <span style={{ color: '#94A3B8' }}>&gt;</span>
          <span style={{ color: '#475569', fontWeight: '600' }}>
            {getCurrentPageTitle()}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '22px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#15803D',
              lineHeight: '1.3',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#16A34A',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span>System Status: Operational / Online</span>
          </div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '500',
              color: '#64748B',
              lineHeight: '1.3',
            }}
          >
            Registry Database Sync: Real-time
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingLeft: '18px',
            borderLeft: '1px solid #E2E8F0',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#0F172A',
                lineHeight: '1.25',
              }}
            >
              System Admin
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '500',
                color: '#64748B',
                lineHeight: '1.25',
              }}
            >
              Platform Administrator
            </div>
          </div>
          <span
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              color: '#1B68F6',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
            }}
          >
            <i className="fa-solid fa-user" aria-hidden="true" />
          </span>
        </div>
      </div>
</header>

        <Outlet />
      </main>
    </div>
    </DashboardProvider>
  );
}

