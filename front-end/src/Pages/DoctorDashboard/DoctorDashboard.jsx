import { Helmet } from 'react-helmet-async';
import { Outlet } from 'react-router-dom';

export default function DoctorDashboard() {
  return (
    <>
      <Helmet>
        <title>Doctor Dashboard | Clinika</title>
      </Helmet>
      <div>
        <h2>DoctorDashboard</h2>
        <Outlet />
      </div>
    </>
  );
}
