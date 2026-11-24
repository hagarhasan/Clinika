import Layout from './Components/Layout/Layout';
import { lazy, Suspense } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import Privacy from './Pages/Privacy/Privacy';
import Terms from './Pages/Terms/Terms';
import Accessibility from './Pages/Accessibility/Accessibility';
import Home from './Pages/Home/Home';
import ResetPassword from './Pages/ResetPassword/ResetPassword';
import Login from './Pages/Login/Login';
import Register from './Pages/Register/Register';
import ForgetPassword from './Pages/ForgetPassword/ForgetPassword';
import PatientDashboard from './Pages/PatientDashboard/PatientDashboard';
import DoctorDashboard from './Pages/DoctorDashboard/DoctorDashboard';
import AdminDashboard from './Pages/AdminDashboard/AdminDashboard';
import Contact from './Pages/Contact/Contact';
import About from './Pages/About/About';
import Doctors from './Pages/Doctors/Doctors';
import DoctorProfile from './Pages/Doctors/DoctorProfile';
import BookAppointment from './Pages/Doctors/BookAppointment';
import NotFound from './Pages/NotFound/NotFound';
import RequireRole from './Components/RequireRole/RequireRole';

import ToastNotification from './Components/Toast/ToastNotification';

const PatientOverview = lazy(() => import('./Pages/PatientDashboard/PatientOverview'));
const PatientAppointments = lazy(() => import('./Pages/PatientDashboard/PatientAppointments'));
const PatientMedicalRecords = lazy(() => import('./Pages/PatientDashboard/PatientMedicalRecords'));
const PatientProfile = lazy(() => import('./Pages/PatientDashboard/PatientProfile'));
const PatientNotifications = lazy(() => import('./Pages/PatientDashboard/PatientNotifications'));
const DoctorOverview = lazy(() => import('./Pages/DoctorDashboard/DoctorOverview'));
const DoctorAppointments = lazy(() => import('./Pages/DoctorDashboard/DoctorAppointments'));
const DoctorAvailability = lazy(() => import('./Pages/DoctorDashboard/DoctorAvailability'));
const DoctorDashboardProfile = lazy(() => import('./Pages/DoctorDashboard/DashDoctProfile'));
const AdminOverview = lazy(() => import('./Pages/AdminDashboard/AdminOverview'));
const ManageDoctors = lazy(() => import('./Pages/AdminDashboard/ManageDoctors'));
const AdminManage = lazy(() => import('./Pages/AdminDashboard/AdminManage'));
const AdminProfile = lazy(() => import('./Pages/AdminDashboard/AdminProfile'));
const ContactMessages = lazy(() => import('./Pages/AdminDashboard/ContactMessages'));
const CatalogManage = lazy(() => import('./Pages/AdminDashboard/CatalogManage'));
const Reports = lazy(() => import('./Pages/AdminDashboard/Reports'));
const AdminTeam = lazy(() => import('./Pages/AdminDashboard/AdminTeam'));

const LazyPage = ({ component: Component }) => (
  <Suspense fallback={<div className="cl-pd-loading" aria-label="Loading">Loading...</div>}>
    <Component />
  </Suspense>
);

const basename = import.meta.env.BASE_URL === './'
  ? '/'
  : import.meta.env.BASE_URL.replace(/\$/, '') || '/';
const router = createBrowserRouter([
  {
    path: "", element: <Layout />, children: [
      { index: true, element: <Home /> },
      { path: "doctors", element: <Doctors /> },
      { path: "doctors/doctor_profile/:id", element: <DoctorProfile /> },
      { path: "doctors/doctor_profile/:id/book-appointment", element: <BookAppointment /> },
      { path: "contact", element: <Contact /> },
      { path: "about", element: <About /> },
    ]
  },
  { path: "login", element: <Login /> },
  { path: "register", element: <Register /> },
  { path: "forget-password", element: <ForgetPassword /> },
  { path: "reset-password/:token", element: <ResetPassword /> },
  { path: "reset-password", element: <ResetPassword /> },
  { path: "privacy", element: <Privacy /> },
  { path: "terms", element: <Terms /> },
  { path: "accessibility", element: <Accessibility /> },
  {
    path: "patient-dashboard", element: <RequireRole role="patient"><PatientDashboard /></RequireRole>, children: [
      { index: true, element: <LazyPage component={PatientOverview} /> },
      { path: "my-appointments", element: <LazyPage component={PatientAppointments} /> },
      { path: "medical-records", element: <LazyPage component={PatientMedicalRecords} /> },
      { path: "my-profile", element: <LazyPage component={PatientProfile} /> },
      { path: "notifications", element: <LazyPage component={PatientNotifications} /> },
    ]
  },
  {
    path: 'doctor-dashboard', element: <RequireRole role="doctor"><DoctorDashboard /></RequireRole>, children: [
      { index: true, element: <LazyPage component={DoctorOverview} /> },
      { path: "manage-appointments", element: <LazyPage component={DoctorAppointments} /> },
      { path: "manage-availability", element: <LazyPage component={DoctorAvailability} /> },
      { path: "my-profile", element: <LazyPage component={DoctorDashboardProfile} /> },
    ]
  },
  {
    path: 'admin-dashboard', element: <RequireRole role="admin"><AdminDashboard /></RequireRole>, children: [
      { index: true, element: <LazyPage component={AdminOverview} /> },
      { path: "manage-doctors", element: <LazyPage component={ManageDoctors} /> },
      { path: "manage-users-and-appointments", element: <LazyPage component={AdminManage} /> },
      { path: "messages", element: <LazyPage component={ContactMessages} /> },
      { path: "catalog", element: <LazyPage component={CatalogManage} /> },
      { path: "reports", element: <LazyPage component={Reports} /> },
      { path: "team", element: <LazyPage component={AdminTeam} /> },
      { path: "my-profile", element: <LazyPage component={AdminProfile} /> },
    ]
  },
  { path: "*", element: <NotFound /> }
], { basename })

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastNotification />
    </>
  );
}
