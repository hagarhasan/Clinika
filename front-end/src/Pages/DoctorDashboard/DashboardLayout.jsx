import { NavLink, Outlet } from 'react-router-dom';
import { C, pill } from './DoctorDashboard';

export default function DashboardLayout({
  portalLabel = 'DOCTOR PORTAL',
  userName = 'Doctor',
  subtitle = '',
  links = [],
  onLogout,
  children,
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f7f9fc', color: C.text }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 248,
          backgroundColor: C.white,
          borderRight: `1px solid ${C.container}`,
          padding: '22px 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30, height: 30, borderRadius: 8, backgroundColor: C.primary,
                color: C.white, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18,
              }}
            >
              +
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1, color: C.text }}>Clinika</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.primary, marginTop: 2 }}>
                {portalLabel}
              </div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 14px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  backgroundColor: isActive ? C.primary : 'transparent',
                  color: isActive ? C.white : C.muted,
                })}
              >
                <i className={`fa-solid ${item.icon}`} style={{ width: 16, textAlign: 'center' }} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 10, border: 'none', background: 'none', color: C.muted,
              fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
            }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket" />
            <span>Logout</span>
          </button>
        )}
      </aside>

      {/* Main Area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar matching image */}
        <header
          style={{
            height: 68,
            backgroundColor: C.white,
            borderBottom: `1px solid ${C.container}`,
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>Clinika Practice Network</span>
            <span style={{ color: C.border }}>•</span>
            <span style={pill(C.primaryFixed, C.primary)}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: C.primary }} />
              Online Consultation Ready
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{userName}</div>
              {subtitle && <div style={{ fontSize: 11, color: C.muted }}>{subtitle}</div>}
            </div>
            <div
              style={{
                width: 36, height: 36, borderRadius: '50%', backgroundColor: C.primary,
                color: C.white, display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0,
              }}
            >
              <i className="fa-regular fa-user" />
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px 28px' }}>
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}