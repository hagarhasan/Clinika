import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const HOME_BY_ROLE = {
  patient: '/patient-dashboard',
  doctor: '/doctor-dashboard',
  admin: '/admin-dashboard',
};

export default function RequireRole({ allowedRoles, children, role }) {
  const roles = allowedRoles || (role ? [role] : []);
  const { token, role: authRole, loading } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (loading) {
    return (
      <div className="cl-pd-gate" role="status" aria-live="polite">
        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
        <span>Checking your access...</span>
      </div>
    );
  }

  if (!roles.includes(authRole)) {
    return <Navigate to={HOME_BY_ROLE[authRole] || '/'} replace />;
  }

  return children;
}
