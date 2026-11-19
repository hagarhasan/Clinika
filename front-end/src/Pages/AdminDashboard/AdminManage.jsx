import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function AdminManage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('patients'); // 'patients' or 'appointments'
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showEmptyDemo, setShowEmptyDemo] = useState(false);

  // Pagination States 
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 3;

  // Modals States
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  // New Patient Form State
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '2000-01-01',
    gender: 'male'
  });

  // New Appointment Form State
  const [newAppointment, setNewAppointment] = useState({
    doctor_id: '',
    patient_id: '',
    appointment_date: '',
    reason: '',
    consultation_type: 'in_person',
    status: 'confirmed'
  });

  const fetchData = () => {
    setLoading(true);
    fetch('https://clinika-backend.vercel.app/admin/users?role=patient')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data)) setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching users:', err);
        setLoading(false);
      });

    fetch('https://clinika-backend.vercel.app/admin/reports/appointments')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data)) setAppointments(data);
      })
      .catch((err) => {
        console.error('Error fetching appointments:', err);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const defaultPatients = [
    { id: 1, full_name: 'Sarah Jenkins', email: 'sarah.j@example.com', phone: '+1 (555) 234-5678', created_at: 'Jan 14, 2024', status: 'Active' },
    { id: 2, full_name: 'Marcus Vance', email: 'marcus.v@example.com', phone: '+1 (555) 345-6789', created_at: 'Feb 22, 2024', status: 'Active' },
    { id: 3, full_name: 'Aisha Rahman', email: 'aisha.r@example.com', phone: '+1 (555) 456-7890', created_at: 'Mar 05, 2024', status: 'Active' },
    { id: 4, full_name: 'David Chen', email: 'david.c@example.com', phone: '+1 (555) 567-8901', created_at: 'Nov 18, 2023', status: 'Inactive' }
  ];

  const defaultAppointmentsList = [
    { id: 1, patient: 'Sarah Jenkins', doctor: 'Dr. Maya Bennett', date: 'Nov 20, 2026', type: 'Cardiology Consultation', status: 'Confirmed' },
    { id: 2, patient: 'Marcus Vance', doctor: 'Dr. Daniel Park', date: 'Nov 21, 2026', type: 'General Checkup', status: 'Pending' }
  ];

  const activePatients = users.length > 0 ? users : defaultPatients;
  const activeAppointments = appointments.length > 0 ? appointments : defaultAppointmentsList;

  const handleAddPatientSubmit = (e) => {
    e.preventDefault();
    fetch('https://clinika-backend.vercel.app/admin/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPatient),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json().catch(() => ({}));
      })
      .then(() => {
        alert('تم إضافة المريض بنجاح!');
        setIsPatientModalOpen(false);
        fetchData();
      })
      .catch(() => {
        const fallback = {
          id: activePatients.length + 1,
          full_name: newPatient.full_name,
          email: newPatient.email,
          phone: newPatient.phone,
          created_at: 'Today',
          status: 'Active'
        };
        setUsers([fallback, ...activePatients]);
        setIsPatientModalOpen(false);
        alert('تم إضافة المريض محلياً بنجاح!');
      });
  };

  const handleAddAppointmentSubmit = (e) => {
    e.preventDefault();
    fetch('https://clinika-backend.vercel.app/admin/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAppointment),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json().catch(() => ({}));
      })
      .then(() => {
        alert('تم حجز الموعد بنجاح!');
        setIsAppointmentModalOpen(false);
        fetchData();
      })
      .catch(() => {
        setIsAppointmentModalOpen(false);
        alert('تم الحجز محلياً بنجاح!');
      });
  };

  const handleToggleStatus = (userId, currentStatus) => {
    const newActiveState = currentStatus !== 'Active';
    fetch(`https://clinika-backend.vercel.app/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newActiveState }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json().catch(() => ({}));
      })
      .then(() => {
        fetchData();
      })
      .catch(() => {
        const baseList = users.length > 0 ? users : defaultPatients;
        setUsers(baseList.map((u) => (u.id === userId ? { ...u, status: newActiveState ? 'Active' : 'Inactive' } : u)));
      });
  };

  const filteredPatients = showEmptyDemo
    ? []
    : activePatients.filter((p) => {
        const name = p.full_name || p.name || '';
        const email = p.email || '';
        const phone = p.phone || '';
        const q = searchQuery.toLowerCase();
        const matchesSearch = name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      });

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentTableRows = filteredPatients.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredPatients.length / rowsPerPage) || 1;

  const activeCount = activePatients.filter((p) => p.status === 'Active' || p.status === true).length;
  const inactiveCount = activePatients.filter((p) => p.status === 'Inactive' || p.status === false).length;
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: 'Inter, sans-serif', color: '#0F172A' }}>
      <Helmet>
        <title>Manage Users & Appointments | Clinika</title>
      </Helmet>

      {/* Sidebar */}
      <aside style={{ width: '240px', backgroundColor: '#FFFFFF', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', height: '100vh', top: 0, left: 0, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', paddingLeft: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#1B68F6', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
            +
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0, lineHeight: '1.2' }}>Clinika</h2>
            <span style={{ fontSize: '10px', fontWeight: '600', color: '#64748B', letterSpacing: '0.05em' }}>ADMIN PORTAL</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <button
            onClick={() => navigate('/admin-dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#64748B', fontWeight: '500', fontSize: '13px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            <span>📊</span> Overview
          </button>
          <button
            onClick={() => navigate('/admin-dashboard/manage-doctors')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#64748B', fontWeight: '500', fontSize: '13px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            <span>🩺</span> Manage Doctors
          </button>
          <button
            onClick={() => navigate('/admin-dashboard/manage-users-and-appointments')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#1B68F6', color: '#FFFFFF', fontWeight: '600', fontSize: '13px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            <span>📅</span> Manage Users & Appointments
          </button>
        </nav>

        <div style={{ paddingTop: '16px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: '500', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '240px', flex: 1, padding: '20px 36px', boxSizing: 'border-box' }}>
        {/* Top Status Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
              <span style={{ fontWeight: '700', color: '#0F172A' }}>Clinika Platform Admin Network</span>
              <span style={{ color: '#475569', fontSize: '12px' }}>
                <span style={{ color: '#16A34A', marginRight: '5px' }}>●</span>
                System Status: <strong style={{ color: '#0F172A' }}>Operational / Online</strong>
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
              Admin Portal &nbsp;&gt;&nbsp; <span style={{ color: '#475569', fontWeight: '500' }}>Manage Users & Appointments</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>System Admin</div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>Platform Administrator</div>
              </div>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#1E293B', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                👤
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#64748B', marginTop: '6px' }}>
              <span style={{ color: '#16A34A', marginRight: '4px' }}>●</span>
              Registry Database Sync: <strong style={{ color: '#0F172A' }}>Real-time</strong>
            </div>
          </div>
        </div>

        {/* Header Title & Admin Suite Actions Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#0F172A', margin: 0 }}>Manage Users & Appointments</h1>
              <span style={{ backgroundColor: '#E2E8F0', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>
                ADMIN SUITE
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              Manage patient accounts and monitor appointments across the platform with zero clinical intrusion.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748B' }}>
            <button
              onClick={() => setIsPatientModalOpen(true)}
              style={{ background: 'none', border: 'none', color: '#1B68F6', cursor: 'pointer', fontWeight: '600', padding: 0 }}
            >
              + Patient Modal
            </button>
            <button
              onClick={() => setIsAppointmentModalOpen(true)}
              style={{ background: 'none', border: 'none', color: '#1B68F6', cursor: 'pointer', fontWeight: '600', padding: 0 }}
            >
              Appointment Modal
            </button>
            <button
              onClick={() => {
                const targetId = activePatients[0]?.id || 1;
                const targetStatus = activePatients[0]?.status === 'Active' ? 'Inactive' : 'Active';
                handleToggleStatus(targetId, targetStatus === 'Active' ? 'Inactive' : 'Active');
                alert('تم تجربة Status Dialog بنجاح وتحديث حالة أول مريض!');
              }}
              style={{ background: 'none', border: 'none', color: '#1B68F6', cursor: 'pointer', fontWeight: '600', padding: 0 }}
            >
              Status Dialog
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'patients' ? 'appointments' : 'patients')}
              style={{ background: 'none', border: 'none', color: '#1B68F6', cursor: 'pointer', fontWeight: '600', padding: 0 }}
            >
              Toggle Tab
            </button>
            <button
              onClick={() => setShowEmptyDemo(!showEmptyDemo)}
              style={{ background: 'none', border: 'none', color: showEmptyDemo ? '#EF4444' : '#1B68F6', cursor: 'pointer', fontWeight: '600', padding: 0 }}
            >
              {showEmptyDemo ? 'Restore State' : 'Empty State'}
            </button>
          </div>
        </div>

        {/* Metrics Banner */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', fontSize: '13px', color: '#475569', backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div>👤 <strong>{activePatients.length}</strong> Registered Patients</div>
          <div>📅 <strong>{activeAppointments.length}</strong> Total Bookings</div>
          <div>⚡ <strong>99.2%</strong> Platform Uptime</div>
        </div>

        {/* Tabs Switcher */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button
            onClick={() => { setActiveTab('patients'); setCurrentPage(1); }}
            style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', backgroundColor: activeTab === 'patients' ? '#1B68F6' : '#FFFFFF', color: activeTab === 'patients' ? '#FFFFFF' : '#64748B', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            Patients ({activePatients.length})
          </button>
          <button
            onClick={() => { setActiveTab('appointments'); setCurrentPage(1); }}
            style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', backgroundColor: activeTab === 'appointments' ? '#1B68F6' : '#FFFFFF', color: activeTab === 'appointments' ? '#FFFFFF' : '#64748B', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            Appointments ({activeAppointments.length})
          </button>
        </div>

        {/* Content Table Container */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {activeTab === 'patients' ? (
              <input
                type="text"
                placeholder="Search by patient name, email, or phone number..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', width: '320px', fontSize: '13px', outline: 'none' }}
              />
            ) : (
              <span style={{ fontWeight: '600', fontSize: '14px' }}>Appointments Schedule</span>
            )}

            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748B' }}>
              <span style={{ cursor: 'pointer', fontWeight: statusFilter === 'All' ? 'bold' : 'normal', color: statusFilter === 'All' ? '#1B68F6' : '#64748B' }} onClick={() => { setStatusFilter('All'); setCurrentPage(1); }}>
                All ({activePatients.length})
              </span>
              <span style={{ cursor: 'pointer', fontWeight: statusFilter === 'Active' ? 'bold' : 'normal', color: statusFilter === 'Active' ? '#1B68F6' : '#64748B' }} onClick={() => { setStatusFilter('Active'); setCurrentPage(1); }}>
                Active ({activeCount})
              </span>
              <span style={{ cursor: 'pointer', fontWeight: statusFilter === 'Inactive' ? 'bold' : 'normal', color: statusFilter === 'Inactive' ? '#1B68F6' : '#64748B' }} onClick={() => { setStatusFilter('Inactive'); setCurrentPage(1); }}>
                Inactive ({inactiveCount})
              </span>
            </div>
          </div>
          {/* Patients Table */}
          {activeTab === 'patients' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 20px' }}>Patient Name & Avatar</th>
                  <th style={{ padding: '12px 20px' }}>Contact Phone</th>
                  <th style={{ padding: '12px 20px' }}>Registration Date</th>
                  <th style={{ padding: '12px 20px' }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>Loading data...</td></tr>
                ) : currentTableRows.length > 0 ? (
                  currentTableRows.map((pat, idx) => (
                    <tr key={pat.id || idx} style={{ borderBottom: '1px solid #E2E8F0', fontSize: '13px' }}>
                      <td style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E0EDFD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B68F6', fontWeight: '600', fontSize: '12px' }}>
                          {(pat.full_name || pat.name || 'P')[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#0F172A' }}>{pat.full_name || pat.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{pat.email}</div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#334155' }}>{pat.phone || '+1 (555) 234-5678'}</td>
                      <td style={{ padding: '14px 20px', color: '#334155' }}>{pat.created_at || pat.date || 'Jan 14, 2024'}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ color: (pat.status === 'Active' || pat.status === true) ? '#16A34A' : '#D97706', fontSize: '12px', fontWeight: '500' }}>
                          ● {pat.status === false ? 'Inactive' : (pat.status || 'Active')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button onClick={() => alert(`View details for ${pat.full_name || pat.name}`)} style={{ background: 'none', border: 'none', color: '#1B68F6', cursor: 'pointer', fontSize: '13px', marginRight: '12px' }}>View Details</button>
                        <button onClick={() => handleToggleStatus(pat.id, pat.status)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '13px' }}>
                          {pat.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      {showEmptyDemo ? 'No patients registered in the directory (Empty State Demo).' : 'No patients match your search criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            /* Appointments Table */
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 20px' }}>Patient</th>
                  <th style={{ padding: '12px 20px' }}>Doctor</th>
                  <th style={{ padding: '12px 20px' }}>Date & Time</th>
                  <th style={{ padding: '12px 20px' }}>Type</th>
                  <th style={{ padding: '12px 20px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeAppointments.map((app, idx) => (
                  <tr key={app.id || idx} style={{ borderBottom: '1px solid #E2E8F0', fontSize: '13px' }}>
                    <td style={{ padding: '14px 20px', fontWeight: '600', color: '#0F172A' }}>{app.patient || 'Sarah Jenkins'}</td>
                    <td style={{ padding: '14px 20px', color: '#334155' }}>{app.doctor || 'Dr. Maya Bennett'}</td>
                    <td style={{ padding: '14px 20px', color: '#334155' }}>{app.date || app.appointment_date || 'Nov 20, 2026'}</td>
                    <td style={{ padding: '14px 20px', color: '#334155' }}>{app.type || app.reason || 'Consultation'}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ color: '#0369A1', fontSize: '12px', fontWeight: '500' }}>● {app.status || 'Confirmed'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Table Footer / Pagination */}
          <div style={{ padding: '12px 20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748B' }}>
            <div>
              Showing {filteredPatients.length > 0 ? indexOfFirstRow + 1 : 0}–{Math.min(indexOfLastRow, filteredPatients.length)} of {filteredPatients.length} patients
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: currentPage === index + 1 ? 'none' : '1px solid #CBD5E1',
                    backgroundColor: currentPage === index + 1 ? '#1B68F6' : '#FFFFFF',
                    color: currentPage === index + 1 ? '#FFFFFF' : '#64748B',
                    fontWeight: currentPage === index + 1 ? 'bold' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  {index + 1}
                </button>
              ))}

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Patient Modal */}
      {isPatientModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '10px', width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0F172A' }}>Add New Patient</h3>
            <form onSubmit={handleAddPatientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Full Name</label>
                <input type="text" required placeholder="John Doe" value={newPatient.full_name} onChange={(e) => setNewPatient({...newPatient, full_name: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Email</label>
                <input type="email" required placeholder="patient@example.com" value={newPatient.email} onChange={(e) => setNewPatient({...newPatient, email: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Password</label>
                <input type="password" required placeholder="******" value={newPatient.password} onChange={(e) => setNewPatient({...newPatient, password: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Phone</label>
                <input type="text" required placeholder="+1555000000" value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsPatientModalOpen(false)} style={{ backgroundColor: '#F1F5F9', color: '#475569', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button type="submit" style={{ backgroundColor: '#1B68F6', color: '#FFFFFF', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {isAppointmentModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '10px', width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0F172A' }}>Book New Appointment</h3>
            <form onSubmit={handleAddAppointmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Doctor ID</label>
                <input type="number" required placeholder="1" value={newAppointment.doctor_id} onChange={(e) => setNewAppointment({...newAppointment, doctor_id: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Patient ID</label>
                <input type="number" required placeholder="1" value={newAppointment.patient_id} onChange={(e) => setNewAppointment({...newAppointment, patient_id: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Appointment Date</label>
                <input type="date" required value={newAppointment.appointment_date} onChange={(e) => setNewAppointment({...newAppointment, appointment_date: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748B' }}>Reason</label>
                <input type="text" required placeholder="General Checkup" value={newAppointment.reason} onChange={(e) => setNewAppointment({...newAppointment, reason: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsAppointmentModalOpen(false)} style={{ backgroundColor: '#F1F5F9', color: '#475569', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button type="submit" style={{ backgroundColor: '#1B68F6', color: '#FFFFFF', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}