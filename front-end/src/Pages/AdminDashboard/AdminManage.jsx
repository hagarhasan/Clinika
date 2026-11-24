import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import adminApi, { getErrorMessage } from '../../api/adminApi';
import { formatDate, formatTime } from '../../Components/Patient/dateFormat';
import { useDashboard } from '../../context/DashboardContext';
import { Avatar, Banner, formatShortDate, Modal, Pager, showingRange, useDebounced } from './adminUi';
import useServerList from './useServerList';

const PAGE_SIZE = 8;
const APPT_STATUS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'Missed',
};
const EMPTY_PATIENT = { first_name: '', last_name: '', email: '', phone: '', password: '' };
const EMPTY_BOOKING = { patient_id: '', doctor_id: '', date: '', slot: null, consultation_type: 'in_person', reason: '' };

function TableState({ loading, error, empty, icon, title }) {
  if (loading) {
    return (
      <div className="cl-ad-loading" role="status">
        <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading…
      </div>
    );
  }
  if (error) return <div className="cl-ad-banner cl-ad-banner--error" style={{ margin: '1rem' }} role="alert">{error}</div>;
  if (empty) {
    return (
      <div className="cl-ad-empty">
        <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
        <h3>{title}</h3>
        <p className="cl-pd-muted">Try a different search or filter.</p>
      </div>
    );
  }
  return null;
}

export default function AdminManage() {
  const { stats, refreshDashboard } = useDashboard();

  const [tab, setTab] = useState('patients');
  const [banner, setBanner] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [patientCounts, setPatientCounts] = useState({ all: 0, active: 0, inactive: 0 });

  // Patients list state
  const [pSearch, setPSearch] = useState('');
  const pQuery = useDebounced(pSearch.trim());
  const [pFilter, setPFilter] = useState('all');
  const [pPage, setPPage] = useState(1);

  // Appointments list state
  const [aSearch, setASearch] = useState('');
  const aQuery = useDebounced(aSearch.trim());
  const [aStatus, setAStatus] = useState('');
  const [aPage, setAPage] = useState(1);

  const [modal, setModal] = useState(null); // { type, ...data }
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT);
  const [cancelReason, setCancelReason] = useState('');

  // Booking modal data
  const [booking, setBooking] = useState(EMPTY_BOOKING);
  const [options, setOptions] = useState({ patients: [], doctors: [] });
  const [slots, setSlots] = useState({ key: '', list: [] });

  const patients = useServerList(
    '/admin/patients',
    {
      limit: PAGE_SIZE,
      offset: (pPage - 1) * PAGE_SIZE,
      ...(pFilter !== 'all' && { is_active: pFilter === 'active' }),
      ...(pQuery && { q: pQuery }),
    },
    reloadKey
  );

  const appointments = useServerList(
    '/appointments',
    {
      limit: PAGE_SIZE,
      offset: (aPage - 1) * PAGE_SIZE,
      ...(aStatus && { status: aStatus }),
      ...(aQuery && { q: aQuery }),
    },
    reloadKey
  );

  useEffect(() => {
    let ignore = false;
    adminApi
      .get('/admin/patients/counts')
      .then((res) => !ignore && setPatientCounts(res.data))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const notify = (type, text) => setBanner({ type, text });
  const closeModal = useCallback(() => {
    setModal(null);
    setFormError('');
    setCancelReason('');
  }, []);

  async function run(action, message) {
    setBusy(true);
    setFormError('');
    try {
      await action();
      notify('ok', message);
      closeModal();
      setReloadKey((n) => n + 1);
      refreshDashboard();
      return true;
    } catch (err) {
      setFormError(getErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  // ---- Patients ----
  const setPatientActive = (patient, isActive) =>
    run(
      () => adminApi.patch(`/admin/users/${patient.user_id}/status`, { is_active: isActive }),
      `${patient.full_name} was ${isActive ? 'activated' : 'deactivated'}.`
    );

  const addPatient = (event) => {
    event.preventDefault();
    const password = patientForm.password.trim();
    run(
      () =>
        adminApi.post('/admin/patients', {
          first_name: patientForm.first_name.trim(),
          last_name: patientForm.last_name.trim(),
          email: patientForm.email.trim(),
          phone: patientForm.phone.trim() || null,
          // No password = the patient gets an invitation email to set their own.
          ...(password && { password }),
        }),
      password ? 'Patient added.' : 'Patient added. An invitation email was sent so they can set a password.'
    ).then((ok) => ok && setPatientForm(EMPTY_PATIENT));
  };

  // ---- Appointments ----
  const changeStatus = (appt, status) =>
    run(() => adminApi.patch(`/appointments/${appt.id}/status`, { status }), `Appointment marked as ${APPT_STATUS[status].toLowerCase()}.`);

  const cancelAppointment = (appt) =>
    run(
      () => adminApi.patch(`/appointments/${appt.id}/cancel`, cancelReason.trim() ? { reason: cancelReason.trim() } : {}),
      'Appointment cancelled. The patient was notified.'
    );

  // ---- Book on behalf of a patient ----
  async function openBooking() {
    setBooking(EMPTY_BOOKING);
    setSlots({ key: '', list: [] });
    setModal({ type: 'book' });
    try {
      const [p, d] = await Promise.all([
        adminApi.get('/admin/patients', { params: { limit: 100 } }),
        adminApi.get('/admin/doctors', { params: { status: 'active', limit: 100 } }),
      ]);
      setOptions({ patients: p.data, doctors: d.data });
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  const slotKey = `${booking.doctor_id}|${booking.date}`;
  const slotsLoading = Boolean(booking.doctor_id && booking.date) && slots.key !== slotKey;

  useEffect(() => {
    if (modal?.type !== 'book' || !booking.doctor_id || !booking.date) return undefined;
    let ignore = false;
    adminApi
      .get(`/doctors/${booking.doctor_id}/slots`, { params: { date: booking.date } })
      .then((res) => !ignore && setSlots({ key: slotKey, list: res.data }))
      .catch(() => !ignore && setSlots({ key: slotKey, list: [] }));
    return () => {
      ignore = true;
    };
  }, [modal?.type, booking.doctor_id, booking.date, slotKey]);

  const submitBooking = (event) => {
    event.preventDefault();
    if (!booking.slot) {
      setFormError('Pick a time slot first.');
      return;
    }
    run(
      () =>
        adminApi.post('/admin/appointments', {
          patient_id: Number(booking.patient_id),
          doctor_id: Number(booking.doctor_id),
          appointment_date: booking.date,
          start_time: booking.slot.start_time,
          clinic_id: booking.slot.clinic_id ?? null,
          consultation_type: booking.consultation_type,
          reason: booking.reason.trim() || null,
          status: 'confirmed',
        }),
      'Appointment booked and confirmed.'
    );
  };

  const [pFrom, pTo] = showingRange(pPage, PAGE_SIZE, patients.total, patients.items.length);
  const [aFrom, aTo] = showingRange(aPage, PAGE_SIZE, appointments.total, appointments.items.length);

  return (
    <>
      <Helmet>
        <title>Manage Users &amp; Appointments | Clinika</title>
      </Helmet>

      <section className="cl-pd-card cl-ad-head" style={{ padding: '1.5rem' }}>
        <div>
          <h1>
            Manage Users &amp; Appointments <span className="cl-ad-tag">Admin Suite</span>
          </h1>
          <p>Manage patient accounts and monitor appointments across the platform.</p>
          <div className="cl-ad-meta">
            <span><b>{patientCounts.all}</b> Registered Patients</span>
            <span><b>{stats.totalAppointments}</b> Total Bookings</span>
            <span><b>{stats.todayAppointments}</b> Booked for Today</span>
          </div>
        </div>
        <div className="cl-ad-actions">
          <button type="button" className="cl-pd-btn cl-ad-btn-icon" onClick={() => setModal({ type: 'addPatient' })}>
            <span className="material-symbols-outlined" aria-hidden="true">person_add</span> Add Patient
          </button>
          <button type="button" className="cl-pd-btn cl-pd-btn--primary cl-ad-btn-icon" onClick={openBooking}>
            <span className="material-symbols-outlined" aria-hidden="true">event_available</span> Book Appointment
          </button>
        </div>
      </section>

      <Banner banner={banner} onClose={() => setBanner(null)} />

      <div className="cl-ad-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'patients'} className={`cl-ad-tab ${tab === 'patients' ? 'is-active' : ''}`} onClick={() => setTab('patients')}>
          <span className="material-symbols-outlined" aria-hidden="true">groups</span> Patients ({patientCounts.all})
        </button>
        <button type="button" role="tab" aria-selected={tab === 'appointments'} className={`cl-ad-tab ${tab === 'appointments' ? 'is-active' : ''}`} onClick={() => setTab('appointments')}>
          <span className="material-symbols-outlined" aria-hidden="true">event_note</span> Appointments ({stats.totalAppointments})
        </button>
      </div>

      {tab === 'patients' && (
        <>
          <section className="cl-pd-card cl-ad-toolbar">
            <label className="cl-ad-search">
              <span className="material-symbols-outlined" aria-hidden="true">search</span>
              <input
                type="search"
                placeholder="Search by patient name, email, or phone number…"
                value={pSearch}
                aria-label="Search patients"
                onChange={(e) => {
                  setPSearch(e.target.value);
                  setPPage(1);
                }}
              />
            </label>
            <div className="cl-ad-filters">
              {[['all', `All (${patientCounts.all})`], ['active', `Active (${patientCounts.active})`], ['inactive', `Inactive (${patientCounts.inactive})`]].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`cl-ad-filter ${pFilter === value ? 'is-active' : ''}`}
                  onClick={() => {
                    setPFilter(value);
                    setPPage(1);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="cl-pd-card cl-ad-table-card" aria-label="Patients">
            <div className="cl-ad-table-scroll">
              <table className="cl-ad-table">
                <thead>
                  <tr>
                    <th>Patient Name &amp; Avatar</th>
                    <th>Contact Phone</th>
                    <th>Registration Date</th>
                    <th>Status</th>
                    <th className="is-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.items.map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <div className="cl-ad-person">
                          <Avatar name={patient.full_name} src={patient.avatar_url} />
                          <div>
                            <strong>{patient.full_name}</strong>
                            <small>{patient.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{patient.phone || '—'}</td>
                      <td>{formatShortDate(patient.created_at)}</td>
                      <td>
                        <span className={`cl-ad-pill cl-ad-pill--${patient.is_active ? 'active' : 'inactive'}`}>
                          {patient.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="cl-ad-row-actions">
                          <button type="button" className="cl-ad-link-btn" onClick={() => setModal({ type: 'patient', patient })}>View Details</button>
                          {patient.is_active ? (
                            <button type="button" className="cl-ad-link-btn cl-ad-link-btn--plain" onClick={() => setModal({ type: 'deactivate', patient })}>Deactivate</button>
                          ) : (
                            <button type="button" className="cl-ad-link-btn cl-ad-link-btn--green" disabled={busy} onClick={() => setPatientActive(patient, true)}>Activate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TableState loading={patients.loading} error={patients.error} empty={!patients.items.length} icon="person_search" title="No patients found" />
            <div className="cl-ad-foot">
              <span>Showing <b>{pFrom} - {pTo}</b> of <b>{patients.total}</b> patients</span>
              <Pager page={pPage} pageSize={PAGE_SIZE} total={patients.total} onChange={setPPage} />
            </div>
          </section>
        </>
      )}

      {tab === 'appointments' && (
        <>
          <section className="cl-pd-card cl-ad-toolbar">
            <label className="cl-ad-search">
              <span className="material-symbols-outlined" aria-hidden="true">search</span>
              <input
                type="search"
                placeholder="Search by reference, patient, or doctor…"
                value={aSearch}
                aria-label="Search appointments"
                onChange={(e) => {
                  setASearch(e.target.value);
                  setAPage(1);
                }}
              />
            </label>
            <div className="cl-ad-filters">
              {[['', 'All'], ...Object.entries(APPT_STATUS)].map(([value, label]) => (
                <button
                  key={value || 'all'}
                  type="button"
                  className={`cl-ad-filter ${aStatus === value ? 'is-active' : ''}`}
                  onClick={() => {
                    setAStatus(value);
                    setAPage(1);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="cl-pd-card cl-ad-table-card" aria-label="Appointments">
            <div className="cl-ad-table-scroll">
              <table className="cl-ad-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date &amp; Time</th>
                    <th>Status</th>
                    <th className="is-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.items.map((appt) => (
                    <tr key={appt.id}>
                      <td>
                        <span className="cl-ad-cell-title">{appt.reference_number || `#${appt.id}`}</span>
                        <span className="cl-ad-cell-sub">{appt.consultation_type === 'online' ? 'Online visit' : 'In-person visit'}</span>
                      </td>
                      <td>
                        <div className="cl-ad-person">
                          <Avatar name={appt.patient.full_name} src={appt.patient.avatar_url} />
                          <div><strong>{appt.patient.full_name}</strong><small>{appt.patient.phone || ''}</small></div>
                        </div>
                      </td>
                      <td>
                        <span className="cl-ad-cell-title">Dr. {appt.doctor.full_name}</span>
                        <span className="cl-ad-cell-sub">{appt.doctor.specialty_name || ''}</span>
                      </td>
                      <td>
                        <span className="cl-ad-cell-title">{formatDate(appt.appointment_date)}</span>
                        <span className="cl-ad-cell-sub">{formatTime(appt.start_time)}</span>
                      </td>
                      <td><span className={`cl-ad-pill cl-ad-pill--${appt.status}`}>{APPT_STATUS[appt.status] ?? appt.status}</span></td>
                      <td>
                        <div className="cl-ad-row-actions">
                          {appt.status === 'pending' && (
                            <button type="button" className="cl-ad-link-btn cl-ad-link-btn--green" disabled={busy} onClick={() => changeStatus(appt, 'confirmed')}>Confirm</button>
                          )}
                          {appt.status === 'confirmed' && (
                            <>
                              <button type="button" className="cl-ad-link-btn" disabled={busy} onClick={() => changeStatus(appt, 'completed')}>Complete</button>
                              <button type="button" className="cl-ad-link-btn cl-ad-link-btn--plain" disabled={busy} onClick={() => changeStatus(appt, 'no_show')}>No-show</button>
                            </>
                          )}
                          {['pending', 'confirmed'].includes(appt.status) && (
                            <button type="button" className="cl-ad-link-btn cl-ad-link-btn--red" onClick={() => setModal({ type: 'cancel', appt })}>Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TableState loading={appointments.loading} error={appointments.error} empty={!appointments.items.length} icon="event_busy" title="No appointments found" />
            <div className="cl-ad-foot">
              <span>Showing <b>{aFrom} - {aTo}</b> of <b>{appointments.total}</b> appointments</span>
              <Pager page={aPage} pageSize={PAGE_SIZE} total={appointments.total} onChange={setAPage} />
            </div>
          </section>
        </>
      )}

      {/* ---------- Modals ---------- */}
      {modal?.type === 'patient' && (
        <Modal title={modal.patient.full_name} subtitle={modal.patient.email} onClose={closeModal}>
          <dl className="cl-ad-detail">
            <div><dt>Phone</dt><dd>{modal.patient.phone || '—'}</dd></div>
            <div><dt>Registered</dt><dd>{formatShortDate(modal.patient.created_at)}</dd></div>
            <div><dt>Date of birth</dt><dd>{modal.patient.date_of_birth ? formatDate(modal.patient.date_of_birth) : '—'}</dd></div>
            <div><dt>Gender</dt><dd style={{ textTransform: 'capitalize' }}>{modal.patient.gender || '—'}</dd></div>
            <div><dt>Blood type</dt><dd>{modal.patient.blood_type || '—'}</dd></div>
            <div><dt>Status</dt><dd>{modal.patient.is_active ? 'Active' : 'Inactive'}</dd></div>
            <div className="is-wide"><dt>Address</dt><dd>{modal.patient.address || '—'}</dd></div>
            <div><dt>Emergency contact</dt><dd>{modal.patient.emergency_contact_name || '—'}</dd></div>
            <div><dt>Emergency phone</dt><dd>{modal.patient.emergency_contact_phone || '—'}</dd></div>
            <div className="is-wide"><dt>Allergies</dt><dd>{modal.patient.allergies || '—'}</dd></div>
            <div className="is-wide"><dt>Chronic conditions</dt><dd>{modal.patient.chronic_conditions || '—'}</dd></div>
          </dl>
          <div className="cl-ad-modal__actions"><button type="button" className="cl-pd-btn" onClick={closeModal}>Close</button></div>
        </Modal>
      )}

      {modal?.type === 'deactivate' && (
        <Modal title="Deactivate patient?" subtitle={`${modal.patient.full_name} will not be able to sign in until you activate the account again.`} onClose={closeModal}>
          {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
          <div className="cl-ad-modal__actions">
            <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Keep active</button>
            <button type="button" className="cl-pd-btn cl-pd-btn--danger" disabled={busy} onClick={() => setPatientActive(modal.patient, false)}>Deactivate</button>
          </div>
        </Modal>
      )}

      {modal?.type === 'cancel' && (
        <Modal title="Cancel appointment?" subtitle={`${modal.appt.patient.full_name} with Dr. ${modal.appt.doctor.full_name} on ${formatDate(modal.appt.appointment_date)} at ${formatTime(modal.appt.start_time)}. The patient is notified.`} onClose={closeModal}>
          <div className="cl-pd-field">
            <label htmlFor="ad-cancel">Reason (optional)</label>
            <textarea id="ad-cancel" rows={2} maxLength={500} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
          <div className="cl-ad-modal__actions">
            <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Keep it</button>
            <button type="button" className="cl-pd-btn cl-pd-btn--danger" disabled={busy} onClick={() => cancelAppointment(modal.appt)}>Cancel appointment</button>
          </div>
        </Modal>
      )}

      {modal?.type === 'addPatient' && (
        <Modal title="Add Patient" subtitle="Leave the password empty to send the patient an email invitation." onClose={closeModal}>
          <form className="cl-pd-form" onSubmit={addPatient}>
            <div className="cl-pd-field"><label htmlFor="np-fn">First name</label><input id="np-fn" required value={patientForm.first_name} onChange={(e) => setPatientForm({ ...patientForm, first_name: e.target.value })} /></div>
            <div className="cl-pd-field"><label htmlFor="np-ln">Last name</label><input id="np-ln" required value={patientForm.last_name} onChange={(e) => setPatientForm({ ...patientForm, last_name: e.target.value })} /></div>
            <div className="cl-pd-field"><label htmlFor="np-email">Email</label><input id="np-email" type="email" required value={patientForm.email} onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })} /></div>
            <div className="cl-pd-field"><label htmlFor="np-phone">Phone</label><input id="np-phone" type="tel" value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} /></div>
            <div className="cl-pd-field cl-pd-field--wide"><label htmlFor="np-pass">Password (optional)</label><input id="np-pass" type="password" minLength={8} maxLength={72} autoComplete="new-password" value={patientForm.password} onChange={(e) => setPatientForm({ ...patientForm, password: e.target.value })} /></div>
            {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
            <div className="cl-ad-modal__actions">
              <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Cancel</button>
              <button type="submit" className="cl-pd-btn cl-pd-btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Add patient'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'book' && (
        <Modal title="Book Appointment" subtitle="Books a confirmed visit on behalf of a patient." onClose={closeModal}>
          <form className="cl-pd-form" onSubmit={submitBooking}>
            <div className="cl-pd-field cl-pd-field--wide">
              <label htmlFor="bk-patient">Patient</label>
              <select id="bk-patient" required value={booking.patient_id} onChange={(e) => setBooking({ ...booking, patient_id: e.target.value })}>
                <option value="">Select a patient…</option>
                {options.patients.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.full_name} — {p.email}</option>)}
              </select>
            </div>
            <div className="cl-pd-field">
              <label htmlFor="bk-doctor">Doctor</label>
              <select id="bk-doctor" required value={booking.doctor_id} onChange={(e) => setBooking({ ...booking, doctor_id: e.target.value, slot: null })}>
                <option value="">Select a doctor…</option>
                {options.doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.full_name}{d.specialty?.name ? ` (${d.specialty.name})` : ''}</option>)}
              </select>
            </div>
            <div className="cl-pd-field">
              <label htmlFor="bk-date">Date</label>
              <input id="bk-date" type="date" required value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value, slot: null })} />
            </div>
            <div className="cl-pd-field cl-pd-field--wide">
              <label>Time slot</label>
              {!booking.doctor_id || !booking.date ? (
                <p className="cl-pd-muted">Choose a doctor and a date to see free slots.</p>
              ) : slotsLoading ? (
                <p className="cl-pd-muted">Loading slots…</p>
              ) : slots.list.length === 0 ? (
                <p className="cl-pd-muted">No slots on this date.</p>
              ) : (
                <div className="cl-ad-slots">
                  {slots.list.map((slot) => (
                    <button
                      key={`${slot.start_time}-${slot.clinic_id}`}
                      type="button"
                      disabled={!slot.is_available}
                      className={`cl-ad-slot ${booking.slot?.start_time === slot.start_time ? 'is-active' : ''}`}
                      onClick={() => setBooking({ ...booking, slot })}
                    >
                      {formatTime(slot.start_time)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="cl-pd-field">
              <label htmlFor="bk-type">Visit type</label>
              <select id="bk-type" value={booking.consultation_type} onChange={(e) => setBooking({ ...booking, consultation_type: e.target.value })}>
                <option value="in_person">In person</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="cl-pd-field">
              <label htmlFor="bk-reason">Reason (optional)</label>
              <input id="bk-reason" maxLength={1000} value={booking.reason} onChange={(e) => setBooking({ ...booking, reason: e.target.value })} />
            </div>
            {formError && <p className="cl-ad-error" role="alert">{formError}</p>}
            <div className="cl-ad-modal__actions">
              <button type="button" className="cl-pd-btn" onClick={closeModal} disabled={busy}>Cancel</button>
              <button type="submit" className="cl-pd-btn cl-pd-btn--primary" disabled={busy}>{busy ? 'Booking…' : 'Book appointment'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
