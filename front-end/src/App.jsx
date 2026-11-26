import Layout from './Components/Layout/Layout';
import { lazy, Suspense } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
const Privacy = lazy(() => import('./Pages/Privacy/Privacy'));
const Terms = lazy(() => import('./Pages/Terms/Terms'));
const Accessibility = lazy(() => import('./Pages/Accessibility/Accessibility'));
const Home = lazy(() => import('./Pages/Home/Home'));
const ResetPassword = lazy(() => import('./Pages/ResetPassword/ResetPassword'));
const Login = lazy(() => import('./Pages/Login/Login'));
const Register = lazy(() => import('./Pages/Register/Register'));
const ForgetPassword = lazy(() => import('./Pages/ForgetPassword/ForgetPassword'));
import PatientDashboard from './Pages/PatientDashboard/PatientDashboard';
import DoctorDashboard from './Pages/DoctorDashboard/DoctorDashboard';
import AdminDashboard from './Pages/AdminDashboard/AdminDashboard';
const Contact = lazy(() => import('./Pages/Contact/Contact'));
const About = lazy(() => import('./Pages/About/About'));
const Doctors = lazy(() => import('./Pages/Doctors/Doctors'));
const DoctorProfile = lazy(() => import('./Pages/Doctors/DoctorProfile'));
const BookAppointment = lazy(() => import('./Pages/Doctors/BookAppointment'));
const NotFound = lazy(() => import('./Pages/NotFound/NotFound'));
import RequireRole from './Components/RequireRole/RequireRole';


const PatientOverview = lazy(() => import('./Pages/PatientDashboard/PatientOverview'));
const PatientAppointments = lazy(() => import('./Pages/PatientDashboard/PatientAppointments'));
const PatientMedicalRecords = lazy(() => import('./Pages/PatientDashboard/PatientMedicalRecords'));
const PatientProfile = lazy(() => import('./Pages/PatientDashboard/PatientProfile'));
const NotificationsPage = lazy(() => import('./Pages/Shared/NotificationsPage'));
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
      { index: true, element: <LazyPage component={Home} /> },
      { path: "doctors", element: <LazyPage component={Doctors} /> },
      { path: "doctors/doctor_profile/:id", element: <LazyPage component={DoctorProfile} /> },
      { path: "doctors/doctor_profile/:id/book-appointment", element: <LazyPage component={BookAppointment} /> },
      { path: "contact", element: <LazyPage component={Contact} /> },
      { path: "about", element: <LazyPage component={About} /> },
    ]
  },
  { path: "login", element: <LazyPage component={Login} /> },
  { path: "register", element: <LazyPage component={Register} /> },
  { path: "forget-password", element: <LazyPage component={ForgetPassword} /> },
  { path: "reset-password/:token", element: <LazyPage component={ResetPassword} /> },
  { path: "reset-password", element: <LazyPage component={ResetPassword} /> },
  { path: "privacy", element: <LazyPage component={Privacy} /> },
  { path: "terms", element: <LazyPage component={Terms} /> },
  { path: "accessibility", element: <LazyPage component={Accessibility} /> },
  {
    path: "patient-dashboard", element: <RequireRole role="patient"><PatientDashboard /></RequireRole>, children: [
      { index: true, element: <LazyPage component={PatientOverview} /> },
      { path: "my-appointments", element: <LazyPage component={PatientAppointments} /> },
      { path: "medical-records", element: <LazyPage component={PatientMedicalRecords} /> },
      { path: "my-profile", element: <LazyPage component={PatientProfile} /> },
      { path: "notifications", element: <LazyPage component={NotificationsPage} /> },
    ]
  },
  {
    path: 'doctor-dashboard', element: <RequireRole role="doctor"><DoctorDashboard /></RequireRole>, children: [
      { index: true, element: <LazyPage component={DoctorOverview} /> },
      { path: "manage-appointments", element: <LazyPage component={DoctorAppointments} /> },
      { path: "manage-availability", element: <LazyPage component={DoctorAvailability} /> },
      { path: "my-profile", element: <LazyPage component={DoctorDashboardProfile} /> },
      { path: "notifications", element: <LazyPage component={NotificationsPage} /> },
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
      { path: "notifications", element: <LazyPage component={NotificationsPage} /> },
    ]
  },
  { path: "*", element: <LazyPage component={NotFound} /> }
], { basename })

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}
