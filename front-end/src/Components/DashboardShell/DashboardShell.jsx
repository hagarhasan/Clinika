import { Link, NavLink, Outlet } from 'react-router-dom';
import logoIcon from '../../assets/Logo.svg';

export default function DashboardShell({
  portalLabel,
  pageTitle,
  navItems,
  userName,
  userSubtitle,
  onLogout,
  badge,
  brandIcon,
  children,
}) {
  return (
    <div className="cl-pd-shell">
      <aside className="cl-pd-sidebar">
        <Link to="/" className="cl-pd-sidebar__brand" aria-label="Clinika home">
          <img className="cl-pd-sidebar__brand-icon" src={brandIcon || logoIcon} alt="" />
          <span>
            <strong>Clinika</strong>
            <small>{portalLabel}</small>
          </span>
        </Link>

        <nav className="cl-pd-nav" aria-label={`${portalLabel} navigation`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `cl-pd-nav__link ${isActive ? 'is-active' : ''}`}
            >
              {item.icon && (
                item.iconClass
                  ? <i className={item.iconClass} aria-hidden="true" />
                  : <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              )}
              <span>{item.label}</span>
              {item.badge && badge > 0 && (
                <span className="cl-pd-nav__badge" aria-label={`${badge} unread or new items`}>{badge > 99 ? '99+' : badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="cl-pd-sidebar__back">
          <Link to="/" className="cl-pd-nav__link">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            <span>Back to site</span>
          </Link>
          <button type="button" className="cl-pd-nav__link cl-pd-logout" onClick={onLogout}>
            <span className="material-symbols-outlined" aria-hidden="true">logout</span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="cl-pd-main">
        <header className="cl-pd-topbar">
          <p className="cl-pd-topbar__title">{pageTitle || portalLabel}</p>
          {(userName || userSubtitle) && (
            <div className="cl-pd-topbar__actions">
              <div className="cl-pd-user__text">
                {userName && <span className="cl-pd-user__name">{userName}</span>}
                {userSubtitle && <span className="cl-pd-user__role">{userSubtitle}</span>}
              </div>
            </div>
          )}
        </header>
        <main className="cl-pd-content">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
