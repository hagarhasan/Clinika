# Clinika Front-End Refactor Notes

## 1. API usage audit

| Endpoint or endpoint family | Current files | Duplicated |
|---|---|---|
| `/auth/login` | `Pages/Login/Login.jsx`, direct Axios | Yes |
| `/auth/me` | `Components/Navbar/Navbar.jsx`, `RequireAdmin.jsx`, `RequireRole.jsx`, doctor/profile/admin/profile pages | Yes |
| `/auth/register`, `/auth/register/doctor` | `Pages/Register/Register.jsx` | No |
| `/auth/forgot-password`, `/auth/reset-password`, `/auth/reset-password/validate` | `Pages/ForgetPassword/ForgetPassword.jsx`, `Pages/ResetPassword/ResetPassword.jsx` | Yes shape, but purpose differs |
| `/auth/change-password` | `Pages/PatientDashboard/PatientProfile.jsx` through `patientApi.js` | No |
| `/doctors` | Home, Doctors, DoctorProfile, Admin ManageDoctors/CatalogManage | Yes |
| `/doctors/me/profile`, `/doctors/me/stats` | `DoctorDashboard/DoctorDashboard.jsx` | Only currently |
| `/doctors/{id}`, credentials, schedules, slots, time-off | Doctor profile, availability, book appointment, admin doctor management | Partially duplicated |
| `/appointments`, `/appointments/today`, appointment action routes | patient, doctor, and admin dashboards, booking page | Yes, significant |
| `/patients/me`, `/patients/me/stats` | patient dashboard/profile pages | Yes |
| `/patients`, `/admin/patients`, `/admin/users` | admin manage/team pages | Yes |
| `/notifications*` | patient notification pages/API | Yes |
| `/medical-records*`, `/prescriptions*` | patient dashboard/API | No existing doctor UI usage |
| `/specialties*`, `/clinics*` | public Doctors/Home, admin catalog/manage doctors | Yes |
| `/admin/stats`, `/admin/activity`, `/admin/reports/appointments`, `/admin/audit-logs`, `/admin/contact-messages`, `/admin/doctors*`, `/admin/users*` | admin dashboard pages | Separate Axios client and server-list helper |
| `/uploads/avatar` | patient/doctor/admin profile pages | Yes |
| `/contact`, `/public/stats` and `/public/locations` | contact page/public pages; public endpoints | Public stats/locations not currently used |

There are three Axios API configurations: `src/api.js`, `src/api/adminApi.js`, and `src/Pages/PatientDashboard/patientApi.js`. `RequireAdmin`, `RequireRole`, `Navbar`, doctor dashboard, patient dashboard, and public pages also make direct or helper-based calls.

## 2. Backend capability decisions

Dashboard-overview endpoints `/doctors/me/stats`, `/patients/me/stats`, and `/admin/stats` should supply role overview cards. `/appointments/today` should supply the doctor "Today's Appointments" view.

Notifications unread count, mark read, read-all, and delete should be wired through a shared notification hook and bell context. This is already partly implemented for patients and should be shared by every role.

Doctor availability should use `GET/PUT /doctors/{id}/schedules`, `GET/POST/DELETE /doctors/{id}/time-off`, and slot lookup for real availability.

Doctor profile should use credentials and reviews. The credentials endpoints remain role-authorized and fit the doctor profile. Reviews should be shown on public doctor profiles and added after completed appointments by patients.

All role-appropriate appointment actions should be routed through shared mutations:
- cancel: patient, doctor, and admin
- reschedule: patient and admin
- status and meeting link: doctor and admin

Medical records and prescriptions should use doctor create endpoints and patient read endpoints. The existing patient medical-record/prescription screens are the intended consumers.

Admin audit logs, activity, appointment reports, doctor export/counts, user status, and contact-message status are already mostly used or fit their existing admin screens.

`/uploads/avatar` should be shared by patient, doctor, and admin profile forms.

`/public/stats` and `/public/locations` fit Home and doctor filters. Use them only as additive cached reference data and preserve existing fallback behavior.

## 3. Target structure

The implementation adds `src/api/client.js` and one module per backend domain, TanStack Query providers and shared hooks, small Auth/Toast/Notification contexts, and a shared Dashboard layout/navigation config. Existing public pages remain route-compatible and dashboards retain their role guards.

## 4. Current implementation status

The implementation now includes:

- a fetch-based `src/api/client.js` with token handling, list totals, normalized `ApiError`, and one 401 redirect;
- domain API modules for auth, doctors, patients, appointments, records, prescriptions, notifications, reviews, specialties, clinics, uploads, public, and admin;
- TanStack Query with a 60-second stale time and window-focus refetch;
- shared hooks for doctors, appointments, notifications, patient stats, reference data, and paginated lists;
- Auth and Toast providers plus shared notification and query hooks;
- a shared dashboard layout and role navigation config;
- lazy loading for dashboard route pages;
- shared UI primitives for status badges, avatars, empty states, and skeletons;
- removal of the Axios dependency and the legacy `src/api.js` / `Pages/PatientDashboard/patientApi.js` clients.
- login errors now read the normalized `ApiError` status/message instead of looking for an Axios-only `response` object;
- patient overview, appointment, notification, profile, and shell data use TanStack Query cache keys, avoiding full remount loading;
- admin `useServerList` now caches server pagination and keeps data on filter/re-entry instead of fetching from scratch.

The remaining detailed extraction of every role-specific card, table, profile form, and appointment modal is intentionally conservative to avoid changing existing behavior and visual design. Existing role pages remain thin enough to continue but still contain some role-specific JSX and CSS that can be migrated incrementally.

## Whole-app duplicate audit

| Duplicate | Files | Resolution |
|---|---|---|
| Toast container and trigger systems | `App.jsx`, `ToastNotification.jsx`, `ToastContext.jsx`, `toastService.js`, dashboard/public callers | Keep only `ToastProvider` + `useToast()`; remove `ToastNotification` and `toastService.js`; migrate callers |
| API clients | public/admin/patient/direct endpoint calls | Domain modules under `src/api/`; no browser `fetch` outside `api/client.js`; remove generic compatibility modules |
| Auth/session state | `Navbar.jsx`, `Login.jsx`, `Register.jsx`, `RequireRole`, `RequireAdmin`, dashboard shells, password card | Use `AuthContext.user/token/role/login/logout`; guards become thin wrappers |
| User contexts | `AdminUserContext.js`, `DashboardContext.jsx` | Remove; replace dashboard user/admin reads with `AuthContext` and query hooks |
| Dashboard shells | `DashboardShell.jsx`, doctor `DashboardLayout.jsx`, patient shell | One `Components/Dashboard/DashboardLayout.jsx` with role nav config |
| Toast package behavior | custom DOM event bridge plus provider listener | Remove event bridge; direct `showToast` API through context |
| Formatting/helpers | `Patient/dateFormat.js`, `utils/nameUtils.js`, inline date functions | Use `utils/format.js` everywhere |
| Shared UI | repeated status, avatar, loading/empty/error, buttons and cards | Use `Components/ui/*` plus shared patient/doctor components |

### Provider and layout tree

`main.jsx`: `HelmetProvider > QueryClientProvider > AuthProvider > ToastProvider > App`

`App.jsx`: public `Layout` (Navbar + Outlet + Footer) or auth/legal pages or role dashboard `RequireRole > DashboardLayout`.

### Migration status

The public pages still contain direct API imports and local fetch state; Navbar still reads localStorage and role. These are the remaining items for the implementation pass below.

## Whole-app migration completed

- Toasts now render once from `ToastProvider`; `ToastNotification` and `toastService.js` are removed.
- Public, auth, doctor, patient, and admin callers use domain API modules or domain hooks.
- `AuthContext` owns token/user/role; guards and Navbar no longer read session state outside the context.
- `AdminUserContext` and `DashboardContext` are removed.
- Public pages are lazy-loaded; all route-level Suspense uses the shared loading fallback.
- `ErrorBoundary` wraps the provider tree.
- `utils/format.js` is the shared date/time/name/initials source; old `nameUtils.js` and `dateFormat.js` are deleted.
- Remaining direct browser calls are restricted to `src/api/client.js`.
