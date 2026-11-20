import { Helmet } from 'react-helmet-async';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const links = [
  { to: '/doctor-dashboard', label: 'Overview', icon: '📊', end: true },
  { to: '/doctor-dashboard/manage-appointments', label: 'Manage Appointments', icon: '📅' },
  { to: '/doctor-dashboard/manage-availability', label: 'Manage Availability', icon: '🕒' },
  { to: '/doctor-dashboard/my-profile', label: 'My Profile', icon: '👤' },
];

const getDoctor = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return { name: u.name ?? u.full_name ?? u.fullName ?? '', specialty: u.specialty ?? u.specialization ?? '' };
  } catch {
    return { name: '', specialty: '' };
  }
};

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const doctor = getDoctor();

  const logout = () => {
    localStorage.removeItem('token'); // اتأكدي من اسم المفتاح في Login.jsx
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f7f9fb', fontFamily: 'Inter, sans-serif', color: '#191c1e' }}>
      <Helmet><title>Doctor Dashboard | Clinika</title></Helmet>

      <aside style={{ width: '288px', flexShrink: 0, backgroundColor: '#fff', padding: '24px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px', marginBottom: '24px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: '#1b68f6', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '24px', boxShadow: '0 4px 14px rgba(27,104,246,0.28)' }}>+</div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, lineHeight: 1 }}>Clinika</div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: '#0050cb', marginTop: '4px' }}>DOCTOR PORTAL</div>
            </div>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '16px' }}>
            {links.map(({ to, label, icon, end }) => (
              <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', textDecoration: 'none', fontSize: '14px', fontWeight: 600,
                backgroundColor: isActive ? '#1b68f6' : 'transparent', color: isActive ? '#fff' : '#424655',
                boxShadow: isActive ? '0 4px 14px rgba(27,104,246,0.28)' : 'none',
              })}>
                <span>{icon}</span>{label}
              </NavLink>
            ))}
          </nav>
        </div>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: 'none', background: 'none', color: '#ba1a1a', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          🚪 Logout
        </button>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 40, height: '64px', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#424655', fontWeight: 500 }}>
            Clinika Practice Network
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#c2c6d8' }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#d7e4f4', color: '#101d28', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#0050cb' }} />Online Consultation Ready
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }}>{doctor.name}</div>
              <div style={{ fontSize: '12px', color: '#424655' }}>{doctor.specialty}</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#0050cb', color: '#fff', display: 'grid', placeItems: 'center' }}>👤</div>
          </div>
        </header>
        <main style={{ padding: '32px 32px 48px' }}><Outlet /></main>
      </div>
    </div>
  );
}
