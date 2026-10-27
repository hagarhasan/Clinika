import { Helmet } from 'react-helmet-async';
import { Outlet } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Clinika</title>
      </Helmet>
      <div>
        <h2>AdminDashboard</h2>
        <Outlet />
      </div>
    </>
  );
}
