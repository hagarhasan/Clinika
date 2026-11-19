import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const [newDoctor, setNewDoctor] = useState({
    name: '',
    npi: '',
    specialty: '',
    email: '',
    experience: '',
    status: 'Active'
  });

  const fetchDoctors = () => {
    setLoading(true);
    fetch('https://clinika-backend.vercel.app/admin/doctors')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data)) {
          setDoctors(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching doctors:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const defaultDoctors = [
    { id: 1, name: 'Dr. Maya Bennett', npi: '94819204', specialty: 'Family Medicine', email: 'maya.bennett@clinika.com', experience: '12 years', status: 'Active' },
    { id: 2, name: 'Dr. Daniel Park', npi: '78491023', specialty: 'Cardiology', email: 'daniel.park@clinika.com', experience: '15 years', status: 'Active' },
    { id: 3, name: 'Dr. Sarah Al-Mansoor', npi: '38291048', specialty: 'Cardiology & Care', email: 'sarah.mansoor@clinika.com', experience: '7 years', status: 'Pending Approval' },
    { id: 4, name: 'Dr. Elena Rossi', npi: '58491032', specialty: 'Dermatology', email: 'elena.rossi@clinika.com', experience: '9 years', status: 'Inactive' }
  ];

  const activeList = doctors.length > 0 ? doctors : defaultDoctors;

  const filteredDoctors = activeList.filter((doc) => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.npi.includes(searchQuery);
    
    const matchesFilter = filterStatus === 'All' || doc.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleAddDoctorSubmit = (e) => {
    e.preventDefault();
    
    fetch('https://clinika-backend.vercel.app/admin/doctors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newDoctor),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to add doctor on backend");
        return res.json().catch(() => ({}));
      })
      .then(() => {
        alert("تم إضافة الدكتور بنجاح على السيرفر!");
        setIsAddModalOpen(false);
        setNewDoctor({ name: '', npi: '', specialty: '', email: '', experience: '', status: 'Active' });
        fetchDoctors();
      })
      .catch((err) => {
        console.error("Error adding doctor:", err);
        const fallbackObj = { id: activeList.length + 1, ...newDoctor };
        setDoctors([fallbackObj, ...activeList]);
        setIsAddModalOpen(false);
        setNewDoctor({ name: '', npi: '', specialty: '', email: '', experience: '', status: 'Active' });
        alert("تم إضافة الدكتور محلياً (Local Fallback) بنجاح!");
      });
  };

  const handleExportRoster = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Name,NPI,Specialty,Email,Experience,Status",
         ...filteredDoctors.map(d => `"${d.name}","${d.npi}","${d.specialty}","${d.email}","${d.experience}","${d.status}"`)
        ].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "clinika_doctors_roster.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenEdit = (doc) => {
    setSelectedDoctor(doc);
    setIsEditModalOpen(true);
  };

  const isManageDoctorsPage = location.pathname.includes('manage-doctors');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: 'Inter, sans-serif', color: '#0F172A' }}>
      <Helmet>
        <title>Admin Dashboard | Clinika</title>
      </Helmet>

      {/* Sidebar الثابت */}
      <aside style={{ width: '260px', backgroundColor: '#FFFFFF', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', height: '100vh', top: 0, left: 0 }}>
        <div style={{ marginBottom: '32px', paddingLeft: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1B68F6', margin: 0 }}>Clinika Admin</h2>
          <span style={{ fontSize: '12px', color: '#64748B' }}>Platform Admin Network</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button 
            onClick={() => navigate('/admin-dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', border: 'none',
              backgroundColor: location.pathname === '/admin-dashboard' || location.pathname === '/admin-dashboard/' ? '#E0EDFD' : 'transparent',
              color: location.pathname === '/admin-dashboard' || location.pathname === '/admin-dashboard/' ? '#1B68F6' : '#64748B',
              fontWeight: '600', fontSize: '14px', cursor: 'pointer', textAlign: 'left', width: '100%'
            }}
          >
            📊 Overview
          </button>

          <button 
            onClick={() => navigate('/admin-dashboard/manage-doctors')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', border: 'none',
              backgroundColor: location.pathname.includes('manage-doctors') ? '#1B68F6' : 'transparent',
              color: location.pathname.includes('manage-doctors') ? '#FFFFFF' : '#64748B',
              fontWeight: '600', fontSize: '14px', cursor: 'pointer', textAlign: 'left', width: '100%'
            }}
          >
            👨‍⚕️ Manage Doctors
          </button>

          <button 
            onClick={() => navigate('/admin-dashboard/manage-users-and-appointments')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', border: 'none',
              backgroundColor: location.pathname.includes('manage-users') ? '#E0EDFD' : 'transparent',
              color: location.pathname.includes('manage-users') ? '#1B68F6' : '#64748B',
              fontWeight: '500', fontSize: '14px', cursor: 'pointer', textAlign: 'left', width: '100%'
            }}
          >
            📅 Manage Users & Appointments
          </button>
        </nav>

        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: '500', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '260px', flex: 1, padding: '32px', boxSizing: 'border-box' }}>
        {isManageDoctorsPage ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0F172A', margin: 0 }}>Manage Doctors</h1>
                <p style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
                  View, verify, and orchestrate licensed medical practitioner credentials across Clinika networks.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={handleExportRoster}
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}
                >
                  Export Roster
                </button>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  style={{ backgroundColor: '#1B68F6', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}
                >
                  + Add Doctor
                </button>
              </div>
            </div>

            {/* Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>All Doctors</span>
                <h3 style={{ fontSize: '24px', margin: '8px 0 0', color: '#0F172A' }}>{activeList.length}</h3>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Active</span>
                <h3 style={{ fontSize: '24px', margin: '8px 0 0', color: '#1B68F6' }}>{activeList.filter(d => d.status === 'Active').length}</h3>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Pending Approval</span>
                <h3 style={{ fontSize: '24px', margin: '8px 0 0', color: '#D97706' }}>{activeList.filter(d => d.status === 'Pending Approval').length}</h3>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Inactive</span>
                <h3 style={{ fontSize: '24px', margin: '8px 0 0', color: '#64748B' }}>{activeList.filter(d => d.status === 'Inactive').length}</h3>
              </div>
            </div>
            {/* Directory Table */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '32px' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '16px' }}>Directory</span>
                <input 
                  type="text" 
                  placeholder="Search by doctor name, specialty, NPI..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', width: '350px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '24px', padding: '0 24px', borderBottom: '1px solid #F1F5F9' }}>
                {['All', 'Active', 'Pending Approval', 'Inactive'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    style={{
                      background: 'none', border: 'none', padding: '12px 0', cursor: 'pointer',
                      fontWeight: filterStatus === status ? '600' : '400',
                      color: filterStatus === status ? '#1B68F6' : '#64748B',
                      borderBottom: filterStatus === status ? '2px solid #1B68F6' : '2px solid transparent',
                      fontSize: '14px'
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 24px' }}>Doctor & Credentials</th>
                    <th style={{ padding: '14px 24px' }}>Specialty</th>
                    <th style={{ padding: '14px 24px' }}>Contact Email</th>
                    <th style={{ padding: '14px 24px' }}>Experience</th>
                    <th style={{ padding: '14px 24px' }}>System Status</th>
                    <th style={{ padding: '14px 24px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>Loading network data...</td></tr>
                  ) : filteredDoctors.length > 0 ? (
                    filteredDoctors.map((doc, index) => (
                      <tr key={doc.id || index} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#E0EDFD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B68F6', fontWeight: '600' }}>
                            {doc.name ? doc.name.replace('Dr. ', '')[0] : 'D'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: '#0F172A', fontSize: '14px' }}>{doc.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>NPI: {doc.npi} | Verified</div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>{doc.specialty}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>{doc.email}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>{doc.experience}</td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ 
                            backgroundColor: doc.status === 'Active' ? '#E0F2FE' : '#FEF3C7', 
                            color: doc.status === 'Active' ? '#0369A1' : '#D97706', 
                            padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' 
                          }}>
                            {doc.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <button 
                            onClick={() => handleOpenEdit(doc)}
                            style={{ background: 'none', border: 'none', color: '#1B68F6', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}
                          >
                            {doc.status === 'Pending Approval' ? 'Review' : 'Edit'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>No doctors found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Analytics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '15px' }}>Regulatory Review</h4>
                <span style={{ fontSize: '12px', color: '#64748B' }}>NPI & State Licenses</span>
                <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '12px 0 8px' }}>97.8%</div>
                <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: '500' }}>+1.25% vs. prior quarter</span>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '15px' }}>Specialty Breakdown</h4>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Network Capacity</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', fontSize: '13px' }}>
                  <div>● Primary Care: <strong>42%</strong></div>
                  <div>● Cardiology: <strong>33%</strong></div>
                  <div>● Other Specialties: <strong>25%</strong></div>
                </div>
              </div>
              <div style={{ backgroundColor: '#1B68F6', color: '#FFFFFF', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '16px' }}>Fast Onboarding</h4>
                  <h3 style={{ margin: '0 0 12px', fontSize: '18px' }}>Hospital EHR Integration</h3>
                </div>
                <button 
                  onClick={() => alert("Provider sync configuration launched successfully!")}
                  style={{ backgroundColor: '#FFFFFF', color: '#1B68F6', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                >
                  Configure Provider Sync
                </button>
              </div>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* مودال إضافة دكتور جديد */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '12px', width: '450px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '20px', color: '#0F172A' }}>Add New Doctor</h3>
            <form onSubmit={handleAddDoctorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>Doctor Name</label>
                <input type="text" required placeholder="Dr. John Doe" value={newDoctor.name} onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>NPI Number</label>
                <input type="text" required placeholder="12345678" value={newDoctor.npi} onChange={(e) => setNewDoctor({...newDoctor, npi: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>Specialty</label>
                <input type="text" required placeholder="Cardiology" value={newDoctor.specialty} onChange={(e) => setNewDoctor({...newDoctor, specialty: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>Contact Email</label>
                <input type="email" required placeholder="doctor@clinika.com" value={newDoctor.email} onChange={(e) => setNewDoctor({...newDoctor, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>Experience</label>
                <input type="text" required placeholder="5 years" value={newDoctor.experience} onChange={(e) => setNewDoctor({...newDoctor, experience: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ backgroundColor: '#F1F5F9', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                <button type="submit" style={{ backgroundColor: '#1B68F6', color: '#FFFFFF', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Save Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال تعديل / مراجعة دكتور */}
      {isEditModalOpen && selectedDoctor && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '12px', width: '450px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '20px', color: '#0F172A' }}>Review / Edit: {selectedDoctor.name}</h3>
            <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '16px' }}>Current Status: <strong style={{ color: '#1B68F6' }}>{selectedDoctor.status}</strong></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => { alert(`Approved credentials for ${selectedDoctor.name}`); setIsEditModalOpen(false); }} style={{ backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Approve Doctor</button>
              <button onClick={() => { alert(`Updated details for ${selectedDoctor.name}`); setIsEditModalOpen(false); }} style={{ backgroundColor: '#1B68F6', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Save Changes</button>
              <button onClick={() => setIsEditModalOpen(false)} style={{ backgroundColor: '#F1F5F9', color: '#475569', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}