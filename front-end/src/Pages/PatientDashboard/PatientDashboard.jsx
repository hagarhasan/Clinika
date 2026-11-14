import { Helmet } from 'react-helmet-async';
import { Outlet } from 'react-router-dom';

export default function PatientDashboard() {
  return (
    <>
      <Helmet>
        <title>Patient Dashboard | Clinika</title>
      </Helmet>
      <div>
        <h2>PatientDashboard</h2>
        <Outlet />
      </div>
    </>
  );
}
