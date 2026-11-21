import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const API_BASE_URL = 'https://clinika-backend.vercel.app';

export default function AdminManage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('patients');
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showEmptyDemo, setShowEmptyDemo] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 3;

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

  const getToken = () =>
    localStorage.getItem('token') || localStorage.getItem('access_token');

  const getAuthHeaders = useCallback(() => {
    const token = getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const loadAdminData = useCallback(
    async () => {
      const token = getToken();
      if (!token) {
          setLoading(false);
          navigate('/login', { replace: true });
        return;
      }


        setLoading(true);
        setErrorMsg('');

      const headers = getAuthHeaders();

      try {
        const [usersRes, apptRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/users?role=patient`, { headers }),
          fetch(`${API_BASE_URL}/admin/reports/appointments`, { headers }),
        ]);

        if (usersRes.status === 401 || usersRes.status === 403 || apptRes.status === 401 || apptRes.status === 403) {
          
            setErrorMsg('You are not authorized to view users or appointments.');
            setUsers([]);
            setAppointments([]);
          
          return;
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const uList = Array.isArray(usersData)
            ? usersData
            : usersData?.users || usersData?.items || usersData?.data || [];
          
            setUsers(Array.isArray(uList) ? uList : []);
          
        }

        if (apptRes.ok) {
          const apptData = await apptRes.json();
          const aList = Array.isArray(apptData)
            ? apptData
            : apptData?.appointments || apptData?.items || apptData?.data || [];
      
            setAppointments(Array.isArray(aList) ? aList : []);
          
        }
      } catch (err) {
        console.error('Error loading admin users/appointments:', err);
        
          setErrorMsg('Failed to load users and appointments from server.');
        
      } finally {
      
          setLoading(false);
      }
    },
    [getAuthHeaders, navigate]
  );

 useEffect(() => {
  
  const fetchData = async () => {
  
    await loadAdminData();
  };

  fetchData();

}, [loadAdminData]);

  const handleAddPatientSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setStatusMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/admin/patients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newPatient),
      });

      if (!res.ok) {
        throw new Error('Failed to add patient');
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
      await loadAdminData();
    } catch (err) {
      console.error('Error adding patient:', err);
      setErrorMsg('Could not add patient. Please check admin permissions or inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAppointmentSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setStatusMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/admin/appointments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...newAppointment,
          doctor_id: Number(newAppointment.doctor_id),
          patient_id: Number(newAppointment.patient_id),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create appointment');
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
      await loadAdminData();
    } catch (err) {
      console.error('Error booking appointment:', err);
      setErrorMsg('Could not book appointment. Please check the IDs and permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    if (!userId) return;
    const isCurrentlyActive =
      currentStatus === 'Active' || currentStatus === true || String(currentStatus).toLowerCase() === 'active';
    const nextActiveState = !isCurrentlyActive;

    setErrorMsg('');
    setStatusMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: nextActiveState }),
      });

      if (!res.ok) {
        throw new Error('Failed to update user status');
      }

      setStatusMsg(`User status updated to ${nextActiveState ? 'Active' : 'Inactive'}.`);
      await loadAdminData();
    } catch (err) {
      console.error('Error updating user status:', err);
      setErrorMsg('Could not update user status on server.');
    }
  };

  const getPatientStatusLabel = (pat) => {
    if (pat.status === false || String(pat.status).toLowerCase() === 'inactive' || pat.is_active === false) {
      return 'Inactive';
    }
    return 'Active';
  };

  const filteredPatients = showEmptyDemo
    ? []
    : users.filter((p) => {
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

  const activeCount = users.filter((p) => getPatientStatusLabel(p) === 'Active').length;
  const inactiveCount = users.filter((p) => getPatientStatusLabel(p) === 'Inactive').length;
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

      {/* Top Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '14px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          padding: '14px 20px',
          borderRadius: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '700', color: '#0F172A' }}>
              Clinika Platform Admin Network
            </span>
            <span style={{ color: '#475569', fontSize: '12px' }}>
              <i
                className="fa-solid fa-circle"
                style={{ color: '#16A34A', fontSize: '8px', marginRight: '6px' }}
                aria-hidden="true"
              />
              System Status: <strong style={{ color: '#0F172A' }}>Operational / Online</strong>
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
            Admin Portal &nbsp;&gt;&nbsp;{' '}
            <span style={{ color: '#475569', fontWeight: '500' }}>
              Manage Users &amp; Appointments
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>
                System Admin
              </div>
              <div style={{ fontSize: '10px', color: '#64748B' }}>
                Platform Administrator
              </div>
            </div>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#1B68F6',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
              }}
            >
              <i className="fa-solid fa-user-shield" aria-hidden="true" />
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#64748B', marginTop: '6px' }}>
            <i
              className="fa-solid fa-circle"
              style={{ color: '#16A34A', fontSize: '7px', marginRight: '5px' }}
              aria-hidden="true"
            />
            Registry Database Sync: <strong style={{ color: '#0F172A' }}>Real-time</strong>
          </div>
        </div>
      </div>

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
            onClick={() => setIsPatientModalOpen(true)}
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
                setErrorMsg('No patient available to toggle status.');
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
                {loading ? (
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
                {loading ? (
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
                  placeholder="+201000000000"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsPatientModalOpen(false)}
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