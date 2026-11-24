import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import adminApi, { clearSession, getErrorMessage, getToken, isForbidden, isUnauthorized } from '../../api/adminApi';
import { AdminUserContext } from '../../context/AdminUserContext';

const HOME_BY_ROLE = {
  patient: '/patient-dashboard',
  doctor: '/doctor-dashboard',
  admin: '/admin-dashboard',
};

export default function RequireRole({ allowedRoles, children, role }) {
  const roles = allowedRoles || (role ? [role] : []);
  const roleKey = roles.join(',');
  const [state, setState] = useState(() =>
    getToken()
      ? { status: 'checking', user: null, redirect: '', error: '' }
      : { status: 'redirect', user: null, redirect: '/login', error: '' }
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    const allowedRolesForCheck = roleKey ? roleKey.split(',') : [];
    if (!getToken()) return undefined;

    adminApi
      .get('/auth/me')
      .then(({ data }) => {
        if (ignore) return;
        if (allowedRolesForCheck.includes(data?.role)) {
          setState({ status: 'ok', user: data, redirect: '', error: '' });
        } else {
          setState({
            status: 'redirect',
            user: null,
            redirect: HOME_BY_ROLE[data?.role] || '/',
            error: '',
          });
        }
      })
      .catch((err) => {
        if (ignore) return;
        if (isUnauthorized(err) || isForbidden(err)) {
          clearSession();
          setState({ status: 'redirect', user: null, redirect: '/login', error: '' });
        } else {
          setState({ status: 'error', user: null, redirect: '', error: getErrorMessage(err) });
        }
      });

    return () => {
      ignore = true;
    };
  }, [attempt, roleKey]);

  const value = useMemo(
    () => ({
      user: state.user,
      setUser: (user) => setState((prev) => ({ ...prev, user })),
    }),
    [state.user]
  );

  if (state.status === 'redirect') return <Navigate to={state.redirect} replace />;

  if (state.status === 'error') {
    return (
      <div className="cl-pd-gate" role="alert">
        <p>{state.error}</p>
        <button
          type="button"
          className="cl-pd-btn cl-pd-btn--primary"
          onClick={() => {
            setState({ status: 'checking', user: null, redirect: '', error: '' });
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (state.status === 'checking') {
    return (
      <div className="cl-pd-gate" role="status" aria-live="polite">
        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
        <span>Checking your access...</span>
      </div>
    );
  }

  return <AdminUserContext.Provider value={value}>{children}</AdminUserContext.Provider>;
}
