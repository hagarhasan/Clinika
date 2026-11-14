import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

export default function ManagedDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 48,
    active: 38,
    pending: 7,
    inactive: 3
  });

  // جلب بيانات الأطباء من الـ API
  useEffect(() => {
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
  }, []);

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, sans-serif', color: '#0F172A' }}>
      <Helmet>
        <title>Manage Doctors | Clinika</title>
      </Helmet>

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F172A', margin: 0 }}>Manage Doctors</h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
            View, verify, and orchestrate licensed medical practitioner credentials across Clinika networks.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ backgroundColor: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
            Export Roster
          </button>
          <button style={{ backgroundColor: '#1B68F6', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
            + Add Doctor
          </button>
        </div>
      </div>

      {/* Stats / Filters Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 24px', borderRadius: '12px', border: '1px solid #E2E8F0', flex: 1, minWidth: '150px' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>All Doctors</span>
          <h3 style={{ fontSize: '20px', margin: '4px 0 0', color: '#0F172A' }}>{stats.total}</h3>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 24px', borderRadius: '12px', border: '1px solid #E2E8F0', flex: 1, minWidth: '150px' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>Active</span>
          <h3 style={{ fontSize: '20px', margin: '4px 0 0', color: '#1B68F6' }}>{stats.active}</h3>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 24px', borderRadius: '12px', border: '1px solid #E2E8F0', flex: 1, minWidth: '150px' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>Pending Approval</span>
          <h3 style={{ fontSize: '20px', margin: '4px 0 0', color: '#D97706' }}>{stats.pending}</h3>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 24px', borderRadius: '12px', border: '1px solid #E2E8F0', flex: 1, minWidth: '150px' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>Inactive</span>
          <h3 style={{ fontSize: '20px', margin: '4px 0 0', color: '#64748B' }}>{stats.inactive}</h3>
        </div>
      </div>

      {/* Doctors Table Section */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '600', fontSize: '16px' }}>Directory</span>
          <input 
            type="text" 
            placeholder="Search by doctor name, specialty, NPI, or clinic..." 
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', width: '300px', fontSize: '14px' }}
          />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 24px' }}>Doctor & Credentials</th>
              <th style={{ padding: '12px 24px' }}>Specialty</th>
              <th style={{ padding: '12px 24px' }}>Contact Email</th>
              <th style={{ padding: '12px 24px' }}>Experience</th>
              <th style={{ padding: '12px 24px' }}>System Status</th>
              <th style={{ padding: '12px 24px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>Loading doctors data...</td>
              </tr>
            ) : doctors.length > 0 ? (
              doctors.map((doc, index) => (
                <tr key={doc.id || index} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#E0EDFD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B68F6', fontWeight: 'bold' }}>
                      {doc.name ? doc.name[0] : 'D'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0F172A' }}>{doc.name || 'Dr. Doctor'}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>NPI: {doc.npi || '98321049'}</div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>{doc.specialty || 'General Medicine'}</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>{doc.email || 'doctor@clinika.com'}</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>{doc.experience || '8 years'}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      backgroundColor: doc.status === 'Active' ? '#E0F2FE' : '#FEF3C7', 
                      color: doc.status === 'Active' ? '#0369A1' : '#D97706', 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      fontSize: '12px', 
                      fontWeight: '500' 
                    }}>
                      {doc.status || 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: '#1B68F6', cursor: 'pointer', fontWeight: '500' }}>Edit</button>
                  </td>
                </tr>
              ))
            ) : (
              // بيانات تجريبية مطابقة للتصميم في حال لم ترجع بيانات من الـ API بعد
              <>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#E0EDFD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B68F6', fontWeight: 'bold' }}>M</div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0F172A' }}>Dr. Maya Bennett</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>NPI: 94819204 | Active License</div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>Family Medicine</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>maya.bennett@clinika.com</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>12 years</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ backgroundColor: '#E0F2FE', color: '#0369A1', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>Active</span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: '#1B68F6', cursor: 'pointer', fontWeight: '500' }}>Edit</button>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#E0EDFD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B68F6', fontWeight: 'bold' }}>D</div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0F172A' }}>Dr. Daniel Park</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>NPI: 78491023 | Verified</div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>Cardiology</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>daniel.park@clinika.com</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>15 years</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ backgroundColor: '#E0F2FE', color: '#0369A1', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>Active</span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: '#1B68F6', cursor: 'pointer', fontWeight: '500' }}>Edit</button>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', fontWeight: 'bold' }}>S</div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0F172A' }}>Dr. Sarah Al-Mansoor</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>NPI: 38291048 | Pending Review</div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>Cardiology & Care</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>sarah.mansoor@clinika.com</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>7 years</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>Pending Approval</span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: '#1B68F6', cursor: 'pointer', fontWeight: '500' }}>Review</button>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
