import { Link, NavLink, Outlet } from 'react-router-dom';
import logoIcon from '../../assets/Logo.svg';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';

export default function DashboardLayout({
  portalLabel,
  pageTitle,
  navItems = [],
  userName,
  userSubtitle,
  onLogout,
  badge = 0,
  badges = {},
  unread,
  children,
  role = 'patient',
}) {
  const { user: authUser } = useAuth();
  const avatarSrc = authUser?.avatar_url || '';
  const avatarName = userName || authUser?.full_name || '';
  const notificationPath = `/${role}-dashboard/notifications`;
  const bellCount = unread ?? badge;
  const countFor = (item) => (item.badge === true ? badge : typeof item.badge === 'string' ? (badges[item.badge] || 0) : 0);

  const navLinks = (mobile = false) => navItems.map((item) => (
    <NavLink
      key={`${mobile ? 'mobile-' : ''}${item.to}`}
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
      {countFor(item) > 0 && (
        <span className="cl-pd-nav__badge" aria-label={`${countFor(item)} unread or new items`}>
          {countFor(item) > 99 ? '99+' : countFor(item)}
        </span>
      )}
    </NavLink>
  ));

  return (
    <div className="cl-pd-shell">
      <aside className="cl-pd-sidebar">
        <Link to="/" className="cl-pd-sidebar__brand" aria-label="Clinika home">
          <img className="cl-pd-sidebar__brand-icon" src={logoIcon} alt="" />
          <span>
            <strong>Clinika</strong>
            <small>{portalLabel}</small>
          </span>
        </Link>

        <nav className="cl-pd-nav" aria-label={`${portalLabel} navigation`}>
          {navLinks()}
        </nav>

        <div className="cl-pd-sidebar__back">
          {(userName || userSubtitle) && (
            <div className="cl-pd-sidebar__user">
              <Avatar src={avatarSrc} name={avatarName} />
              <span className="cl-pd-sidebar__user-text">
                {userName && <strong>{userName}</strong>}
                {userSubtitle && <small>{userSubtitle}</small>}
              </span>
            </div>
          )}
          <Link to="/" className="cl-pd-nav__link">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            <span>Back to site</span>
          </Link>
          {onLogout && (
            <button type="button" className="cl-pd-nav__link cl-pd-logout" onClick={onLogout}>
              <span className="material-symbols-outlined" aria-hidden="true">logout</span>
              <span>Log out</span>
            </button>
          )}
        </div>
      </aside>

      <div className="offcanvas offcanvas-start cl-pd-offcanvas d-lg-none" tabIndex="-1" id="dashboardNavigation" aria-labelledby="dashboardNavigationLabel">
        <div className="offcanvas-header">
          <Link to="/" className="cl-pd-sidebar__brand" aria-label="Clinika home">
            <img className="cl-pd-sidebar__brand-icon" src={logoIcon} alt="" />
            <span>
              <strong id="dashboardNavigationLabel">Clinika</strong>
              <small>{portalLabel}</small>
            </span>
          </Link>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close navigation" />
        </div>
        <div className="offcanvas-body d-flex flex-column">
          <nav className="cl-pd-nav" aria-label={`${portalLabel} mobile navigation`}>
            {navLinks(true)}
          </nav>
          <div className="cl-pd-sidebar__back mt-auto">
            <Link to="/" className="cl-pd-nav__link">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              <span>Back to site</span>
            </Link>
            {onLogout && (
              <button type="button" className="cl-pd-nav__link cl-pd-logout" onClick={onLogout}>
                <span className="material-symbols-outlined" aria-hidden="true">logout</span>
                <span>Log out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="cl-pd-main">
        <header className="cl-pd-topbar">
          <div className="cl-pd-topbar__left">
            <button
              type="button"
              className="cl-pd-mobile-menu d-lg-none"
              data-bs-toggle="offcanvas"
              data-bs-target="#dashboardNavigation"
              aria-controls="dashboardNavigation"
              aria-label="Open navigation"
            >
              <span className="material-symbols-outlined" aria-hidden="true">menu</span>
            </button>
            <p className="cl-pd-topbar__title">{pageTitle || portalLabel}</p>
          </div>
          <div className="cl-pd-topbar__actions">
            <Link className="cl-pd-topbar__bell" to={notificationPath} aria-label="Notifications">
              <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
              {bellCount > 0 && <span className="cl-pd-topbar__dot" aria-label={`${bellCount} unread notifications`} />}
            </Link>
            {(userName || userSubtitle) && (
              <div className="dropdown">
                <button className="cl-pd-user dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <Avatar size="sm" src={avatarSrc} name={avatarName} />
                  <span className="cl-pd-user__text">
                    {userName && <span className="cl-pd-user__name">{userName}</span>}
                    {userSubtitle && <span className="cl-pd-user__role">{userSubtitle}</span>}
                  </span>
                  <span className="material-symbols-outlined cl-pd-user__chevron" aria-hidden="true">expand_more</span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end cl-pd-user-menu">
                  <li><Link className="dropdown-item" to={role === 'admin' ? '/admin-dashboard/my-profile' : role === 'doctor' ? '/doctor-dashboard/my-profile' : '/patient-dashboard/my-profile'}>My profile</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><button type="button" className="dropdown-item text-danger" onClick={onLogout}>Log out</button></li>
                </ul>
              </div>
            )}
          </div>
        </header>
        <main className="cl-pd-content">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
