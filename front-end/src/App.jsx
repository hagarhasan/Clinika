import Layout from './Components/Layout/Layout';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import Privacy from './Pages/Privacy/Privacy';
import Terms from './Pages/Terms/Terms';
import Accessibility from './Pages/Accessibility/Accessibility';
import Home from './Pages/Home/Home';
import ResetPassword from './Pages/ResetPassword/ResetPassword';
import Login from './Pages/Login/Login';
import Register from './Pages/Register/Register';
import ForgetPassword from './Pages/ForgetPassword/ForgetPassword';
import PatientDashboard from './Pages/PatientDashboard/PatientDashboard';
import PatientOverview from './Pages/PatientDashboard/PatientOverview';
import PatientAppointments from './Pages/PatientDashboard/PatientAppointments';
import PatientMedicalRecords from './Pages/PatientDashboard/PatientMedicalRecords';
import PatientProfile from './Pages/PatientDashboard/PatientProfile';
import PatientNotifications from './Pages/PatientDashboard/PatientNotifications';
import DoctorDashboard from './Pages/DoctorDashboard/DoctorDashboard';
import DoctorOverview from './Pages/DoctorDashboard/DoctorOverview';
import DoctorAppointments from './Pages/DoctorDashboard/DoctorAppointments';
import DoctorAvailability from './Pages/DoctorDashboard/DoctorAvailability';
import DoctorDashboardProfile from './Pages/DoctorDashboard/DoctorProfile';
import AdminDashboard from './Pages/AdminDashboard/AdminDashboard';
import AdminOverview from './Pages/AdminDashboard/AdminOverview';
import ManageDoctors from './Pages/AdminDashboard/ManageDoctors';
import AdminManage from './Pages/AdminDashboard/AdminManage';
import AdminProfile from './Pages/AdminDashboard/AdminProfile';
import Contact from './Pages/Contact/Contact';
import About from './Pages/About/About';
import Doctors from './Pages/Doctors/Doctors';
import DoctorProfile from './Pages/Doctors/DoctorProfile';
import BookAppointment from './Pages/Doctors/BookAppointment';
import NotFound from './Pages/NotFound/NotFound';

const router = createHashRouter([
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
    path: "patient-dashboard", element: <PatientDashboard />, children: [
      { index: true, element: <PatientOverview /> },
      { path: "my-appointments", element: <PatientAppointments /> },
      { path: "medical-records", element: <PatientMedicalRecords /> },
      { path: "my-profile", element: <PatientProfile /> },
      { path: "notifications", element: <PatientNotifications /> },
    ]
  },
  {
    path: 'doctor-dashboard', element: <DoctorDashboard />, children: [
      { index: true, element: <DoctorOverview /> },
      { path: "manage-appointments", element: <DoctorAppointments /> },
      { path: "manage-availability", element: <DoctorAvailability /> },
      { path: "my-profile", element: <DoctorDashboardProfile /> },
    ]
  },
  {
    path: 'admin-dashboard', element: <AdminDashboard />, children: [
      { index: true, element: <AdminOverview /> },
      { path: "manage-doctors", element: <ManageDoctors /> },
      { path: "manage-users-and-appointments", element: <AdminManage /> },
      { path: "my-profile", element: <AdminProfile /> },
    ]
  },
  { path: "*", element: <NotFound /> }
])

export default function App() {
  return (
    <RouterProvider router={router} />
  )
}
