import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useDashboard } from '../../context/DashboardContext';

const API_BASE_URL = 'https://clinika-backend.vercel.app';
const EGYPTIAN_PHONE_REGEX = /^(010|011|012|015)\d{8}$/;

const normalizePhoneDigits = (rawPhone) => {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (digits.startsWith('20') && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  return digits;
};

const validateEgyptianPhone = (rawPhone) => {
  const normalized = normalizePhoneDigits(rawPhone);
  if (!EGYPTIAN_PHONE_REGEX.test(normalized)) {
    return 'Phone number must be 11 digits and start with 010, 011, 012, or 015.';
  }
  return '';
};

export default function AdminManage() {
  const navigate = useNavigate();
  const {
    users = [],
    setUsers,
    appointments = [],
    setAppointments,
    loading,
    errorMsg: contextErrorMsg,
    getToken,
    refreshDashboard,
  } = useDashboard();

  const [activeTab, setActiveTab] = useState('patients');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [statusMsg, setStatusMsg] = useState('');
  const [localErrorMsg, setLocalErrorMsg] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showEmptyDemo, setShowEmptyDemo] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  const [newPatient, setNewPatient] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '2000-01-01',
    gender: 'male',
  });

  const [newAppointment, setNewAppointment] = useState({
    doctor_id: '',
    patient_id: '',
    appointment_date: '',
    reason: '',
    consultation_type: 'in_person',
    status: 'confirmed',
  });

  const getAuthHeaders = useCallback(() => {
    const token = getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [getToken]);

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true });
    }
  }, [getToken, navigate]);
  const handleAddPatientSubmit = async (e) => {
    e.preventDefault();
    setLocalErrorMsg('');
    setStatusMsg('');
    setPhoneError('');

    const phoneValidationMsg = validateEgyptianPhone(newPatient.phone);
    if (phoneValidationMsg) {
      setPhoneError(phoneValidationMsg);
      return;
    }

    const cleanPhone = normalizePhoneDigits(newPatient.phone);
    setSubmitting(true);

    try {
      const payload = {
        ...newPatient,
        full_name: newPatient.full_name.trim(),
        email: newPatient.email.trim(),
        phone: cleanPhone,
      };

      const res = await fetch(`${API_BASE_URL}/admin/patients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const backendDetail =
          typeof data?.detail === 'string'
            ? data.detail
            : Array.isArray(data?.detail)
            ? data.detail.map((d) => d?.msg || '').filter(Boolean).join(', ')
            : data?.message || 'Failed to add patient';
        throw new Error(backendDetail);
      }

      const createdPatient =
        data && typeof data === 'object'
          ? data.patient || data.user || data.data || payload
          : payload;

      if (typeof setUsers === 'function') {
        setUsers((prev) => (Array.isArray(prev) ? [createdPatient, ...prev] : [createdPatient]));
      }

      setIsPatientModalOpen(false);
      setNewPatient({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        date_of_birth: '2000-01-01',
        gender: 'male',
      });
      setStatusMsg('Patient added successfully.');
      if (typeof refreshDashboard === 'function') {
        refreshDashboard({ silent: true });
      }
    } catch (err) {
      console.error('Error adding patient:', err);
      setLocalErrorMsg(
        err?.message || 'Could not add patient. Please check admin permissions or inputs.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAppointmentSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLocalErrorMsg('');
    setStatusMsg('');

    try {
      const payload = {
        ...newAppointment,
        doctor_id: Number(newAppointment.doctor_id),
        patient_id: Number(newAppointment.patient_id),
        reason: newAppointment.reason.trim(),
      };

      const res = await fetch(`${API_BASE_URL}/admin/appointments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const backendDetail =
          typeof data?.detail === 'string'
            ? data.detail
            : Array.isArray(data?.detail)
            ? data.detail.map((d) => d?.msg || '').filter(Boolean).join(', ')
            : data?.message || 'Failed to create appointment';
        throw new Error(backendDetail);
      }

      const createdAppointment =
        data && typeof data === 'object'
          ? data.appointment || data.data || payload
          : payload;

      if (typeof setAppointments === 'function') {
        setAppointments((prev) =>
          Array.isArray(prev) ? [createdAppointment, ...prev] : [createdAppointment]
        );
      }

      setIsAppointmentModalOpen(false);
      setNewAppointment({
        doctor_id: '',
        patient_id: '',
        appointment_date: '',
        reason: '',
        consultation_type: 'in_person',
        status: 'confirmed',
      });
      setStatusMsg('Appointment booked successfully.');
      if (typeof refreshDashboard === 'function') {
        refreshDashboard({ silent: true });
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      setLocalErrorMsg(
        err?.message || 'Could not book appointment. Please check the IDs and permissions.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    if (!userId) return;
    const isCurrentlyActive =
      currentStatus === 'Active' ||
      currentStatus === true ||
      String(currentStatus).toLowerCase() === 'active';
    const nextActiveState = !isCurrentlyActive;

    setLocalErrorMsg('');
    setStatusMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: nextActiveState }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const backendDetail =
          typeof data?.detail === 'string'
            ? data.detail
            : data?.message || 'Failed to update user status';
        throw new Error(backendDetail);
      }

      if (typeof setUsers === 'function') {
        setUsers((prev) =>
          Array.isArray(prev)
            ? prev.map((u) => {
                const id = u.id ?? u._id;
                if (String(id) !== String(userId)) return u;
                return {
                  ...u,
                  is_active: nextActiveState,
                  status: nextActiveState ? 'Active' : 'Inactive',
                };
              })
            : prev
        );
      }

      setStatusMsg(`User status updated to ${nextActiveState ? 'Active' : 'Inactive'}.`);
      if (typeof refreshDashboard === 'function') {
        refreshDashboard({ silent: true });
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      setLocalErrorMsg(err?.message || 'Could not update user status on server.');
    }
  };

  const getPatientStatusLabel = (pat) => {
    if (
      pat.status === false ||
      String(pat.status).toLowerCase() === 'inactive' ||
      pat.is_active === false
    ) {
      return 'Inactive';
    }
    return 'Active';
  };

  const errorMsg = localErrorMsg || contextErrorMsg;
  const safeUsers = Array.isArray(users) ? users : [];
  const filteredPatients = showEmptyDemo
    ? []
    : safeUsers.filter((p) => {
        const name = (p.full_name || p.name || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const phone = String(p.phone || '').toLowerCase();
        const q = searchQuery.trim().toLowerCase();
        const statusLabel = getPatientStatusLabel(p);

        const matchesSearch =
          !q || name.includes(q) || email.includes(q) || phone.includes(q);
        const matchesStatus = statusFilter === 'All' || statusLabel === statusFilter;

        return matchesSearch && matchesStatus;
      });

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentTableRows = filteredPatients.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / rowsPerPage));

  const activeCount = safeUsers.filter((p) => getPatientStatusLabel(p) === 'Active').length;
  const inactiveCount = safeUsers.filter((p) => getPatientStatusLabel(p) === 'Inactive').length;
  return (
    <div
      style={{
        backgroundColor: '#F8FAFC',
        padding: '24px',
        boxSizing: 'border-box',
        fontFamily: 'Inter, sans-serif',
        color: '#0F172A',
        width: '100%',
      }}
    >
      <Helmet>
        <title>Manage Users &amp; Appointments | Clinika</title>
      </Helmet>

      {/* Header Title & Admin Suite Actions Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '25px', fontWeight: 'bold', color: '#0F172A', margin: 0 }}>
              Manage Users &amp; Appointments
            </h1>
            <span
              style={{
                backgroundColor: '#EFF6FF',
                color: '#1B68F6',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.05em',
              }}
            >
              ADMIN SUITE
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', marginBottom: 0 }}>
            Manage patient accounts and monitor appointments across the platform with zero clinical intrusion.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setPhoneError('');
              setIsPatientModalOpen(true);
            }}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              color: '#1B68F6',
              cursor: 'pointer',
              fontWeight: '600',
              padding: '7px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-user-plus" aria-hidden="true" />
            <span>+ Patient Modal</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAppointmentModalOpen(true)}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              color: '#1B68F6',
              cursor: 'pointer',
              fontWeight: '600',
              padding: '7px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-calendar-plus" aria-hidden="true" />
            <span>Appointment Modal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const firstUser = users[0];
              if (!firstUser) {
                setLocalErrorMsg('No patient available to toggle status.');
                return;
              }
              handleToggleStatus(firstUser.id ?? firstUser._id, getPatientStatusLabel(firstUser));
            }}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              color: '#0F172A',
              cursor: 'pointer',
              fontWeight: '600',
              padding: '7px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-sliders" aria-hidden="true" />
            <span>Status Dialog</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab(activeTab === 'patients' ? 'appointments' : 'patients');
              setCurrentPage(1);
            }}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              color: '#0F172A',
              cursor: 'pointer',
              fontWeight: '600',
              padding: '7px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-repeat" aria-hidden="true" />
            <span>Toggle Tab</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEmptyDemo(!showEmptyDemo)}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              color: showEmptyDemo ? '#EF4444' : '#475569',
              cursor: 'pointer',
              fontWeight: '600',
              padding: '7px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-folder-open" aria-hidden="true" />
            <span>{showEmptyDemo ? 'Restore State' : 'Empty State'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {statusMsg && (
        <div
          style={{
            backgroundColor: '#F0FDF4',
            color: '#15803D',
            border: '1px solid #BBF7D0',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#475569',
          backgroundColor: '#FFFFFF',
          padding: '14px 20px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-users" style={{ color: '#1B68F6' }} aria-hidden="true" />
          <strong>{users.length}</strong> Registered Patients
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-calendar-check" style={{ color: '#1B68F6' }} aria-hidden="true" />
          <strong>{appointments.length}</strong> Total Bookings
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-circle-check" style={{ color: '#16A34A' }} aria-hidden="true" />
          <span>Live Backend Sync</span>
        </div>
      </div>
      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('patients');
            setCurrentPage(1);
          }}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            backgroundColor: activeTab === 'patients' ? '#1B68F6' : '#FFFFFF',
            color: activeTab === 'patients' ? '#FFFFFF' : '#64748B',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className="fa-solid fa-user-injured" aria-hidden="true" />
          <span>Patients ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('appointments');
            setCurrentPage(1);
          }}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            backgroundColor: activeTab === 'appointments' ? '#1B68F6' : '#FFFFFF',
            color: activeTab === 'appointments' ? '#FFFFFF' : '#64748B',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className="fa-solid fa-calendar-days" aria-hidden="true" />
          <span>Appointments ({appointments.length})</span>
        </button>
      </div>

      {/* Content Table Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {activeTab === 'patients' ? (
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <i
                className="fa-solid fa-magnifying-glass"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                  fontSize: '13px',
                }}
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search by patient name, email, or phone number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  width: '100%',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ) : (
            <span style={{ fontWeight: '600', fontSize: '14px' }}>Appointments Schedule</span>
          )}

          {activeTab === 'patients' && (
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748B' }}>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('All');
                  setCurrentPage(1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: statusFilter === 'All' ? '700' : '400',
                  color: statusFilter === 'All' ? '#1B68F6' : '#64748B',
                  padding: 0,
                }}
              >
                All ({users.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('Active');
                  setCurrentPage(1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: statusFilter === 'Active' ? '700' : '400',
                  color: statusFilter === 'Active' ? '#1B68F6' : '#64748B',
                  padding: 0,
                }}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('Inactive');
                  setCurrentPage(1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: statusFilter === 'Inactive' ? '700' : '400',
                  color: statusFilter === 'Inactive' ? '#1B68F6' : '#64748B',
                  padding: 0,
                }}
              >
                Inactive ({inactiveCount})
              </button>
            </div>
          )}
        </div>

        {activeTab === 'patients' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    color: '#64748B',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '12px 20px' }}>Patient Name &amp; Avatar</th>
                  <th style={{ padding: '12px 20px' }}>Contact Phone</th>
                  <th style={{ padding: '12px 20px' }}>Registration Date</th>
                  <th style={{ padding: '12px 20px' }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && currentTableRows.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }} aria-hidden="true" />
                      Loading data...
                    </td>
                  </tr>
                ) : currentTableRows.length > 0 ? (
                  currentTableRows.map((pat, idx) => {
                    const displayName = pat.full_name || pat.name || 'Patient';
                    const statusLabel = getPatientStatusLabel(pat);
                    const isActive = statusLabel === 'Active';
                    const userId = pat.id ?? pat._id;

                    return (
                      <tr key={userId ?? idx} style={{ borderBottom: '1px solid #E2E8F0', fontSize: '13px' }}>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: '#EFF6FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#1B68F6',
                                fontWeight: '600',
                                fontSize: '12px',
                                flexShrink: 0,
                              }}
                            >
                              {displayName[0]?.toUpperCase() || 'P'}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: '#0F172A' }}>{displayName}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>{pat.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#334155' }}>{pat.phone || '—'}</td>
                        <td style={{ padding: '14px 20px', color: '#334155' }}>
                          {pat.created_at || pat.date || '—'}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span
                            style={{
                              color: isActive ? '#16A34A' : '#D97706',
                              fontSize: '12px',
                              fontWeight: '500',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <i className="fa-solid fa-circle" style={{ fontSize: '7px' }} aria-hidden="true" />
                            <span>{statusLabel}</span>
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(userId, statusLabel)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isActive ? '#475569' : '#1B68F6',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '500',
                            }}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      {showEmptyDemo
                        ? 'No patients displayed (Empty State preview).'
                        : 'No patients found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    color: '#64748B',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '12px 20px' }}>Patient</th>
                  <th style={{ padding: '12px 20px' }}>Doctor</th>
                  <th style={{ padding: '12px 20px' }}>Date &amp; Time</th>
                  <th style={{ padding: '12px 20px' }}>Type</th>
                  <th style={{ padding: '12px 20px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && appointments.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }} aria-hidden="true" />
                      Loading appointments...
                    </td>
                  </tr>
                ) : appointments.length > 0 ? (
                  appointments.map((app, idx) => (
                    <tr key={app.id ?? app._id ?? idx} style={{ borderBottom: '1px solid #E2E8F0', fontSize: '13px' }}>
                      <td style={{ padding: '14px 20px', fontWeight: '600', color: '#0F172A' }}>
                        {app.patient_name || app.patient || '—'}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#334155' }}>
                        {app.doctor_name || app.doctor || '—'}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#334155' }}>
                        {app.date || app.appointment_date || '—'}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#334155' }}>
                        {app.type || app.consultation_type || app.reason || '—'}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            color: '#1B68F6',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <i className="fa-solid fa-circle" style={{ fontSize: '7px' }} aria-hidden="true" />
                          <span>{app.status || 'Scheduled'}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      No appointments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer / Pagination */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#64748B',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            Showing {filteredPatients.length > 0 ? indexOfFirstRow + 1 : 0}–
            {Math.min(indexOfLastRow, filteredPatients.length)} of {filteredPatients.length} patients
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index + 1}
                type="button"
                onClick={() => setCurrentPage(index + 1)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: currentPage === index + 1 ? 'none' : '1px solid #CBD5E1',
                  backgroundColor: currentPage === index + 1 ? '#1B68F6' : '#FFFFFF',
                  color: currentPage === index + 1 ? '#FFFFFF' : '#64748B',
                  fontWeight: currentPage === index + 1 ? 'bold' : 'normal',
                  cursor: 'pointer',
                }}
              >
                {index + 1}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {/* Patient Modal */}
      {isPatientModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: '24px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '410px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0F172A' }}>
              Add New Patient
            </h3>
            <form onSubmit={handleAddPatientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Patient Name"
                  value={newPatient.full_name}
                  onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Email</label>
                <input
                  type="email"
                  required
                  placeholder="patient@clinika.com"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Password</label>
                <input
                  type="password"
                  required
                  placeholder="******"
                  value={newPatient.password}
                  onChange={(e) => setNewPatient({ ...newPatient, password: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Phone</label>
                <input
                  type="text"
                  required
                  placeholder="01012345678"
                  value={newPatient.phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewPatient({ ...newPatient, phone: val });
                    if (phoneError) setPhoneError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: phoneError ? '1px solid #DC2626' : '1px solid #CBD5E1',
                    marginTop: '4px',
                    boxSizing: 'border-box',
                    fontSize: '13px',
                  }}
                />
                {phoneError && (
                  <p style={{ color: '#DC2626', fontSize: '11px', margin: '4px 0 0' }}>
                    {phoneError}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setPhoneError('');
                    setIsPatientModalOpen(false);
                  }}
                  style={{ backgroundColor: '#F1F5F9', color: '#475569', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: '#1B68F6', color: '#FFFFFF', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {isAppointmentModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: '24px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '410px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0F172A' }}>
              Book New Appointment
            </h3>
            <form onSubmit={handleAddAppointmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Doctor ID</label>
                <input
                  type="number"
                  required
                  placeholder="1"
                  value={newAppointment.doctor_id}
                  onChange={(e) => setNewAppointment({ ...newAppointment, doctor_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Patient ID</label>
                <input
                  type="number"
                  required
                  placeholder="1"
                  value={newAppointment.patient_id}
                  onChange={(e) => setNewAppointment({ ...newAppointment, patient_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Appointment Date</label>
                <input
                  type="date"
                  required
                  value={newAppointment.appointment_date}
                  onChange={(e) => setNewAppointment({ ...newAppointment, appointment_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Reason</label>
                <input
                  type="text"
                  required
                  placeholder="Consultation"
                  value={newAppointment.reason}
                  onChange={(e) => setNewAppointment({ ...newAppointment, reason: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsAppointmentModalOpen(false)}
                  style={{ backgroundColor: '#F1F5F9', color: '#475569', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: '#1B68F6', color: '#FFFFFF', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  {submitting ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}