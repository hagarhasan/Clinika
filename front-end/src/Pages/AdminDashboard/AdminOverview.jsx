import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';

export default function AdminOverview() {
  const location = useLocation();
  const isActive = (path) => location.pathname.includes(path);

  // States لتخزين البيانات القادمة من الباك إند
  const [stats, setStats] = useState({
    totalDoctors: 48,
    totalPatients: 1240,
    totalAppointments: 3892,
    pendingRequests: 5
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // جلب الإحصائيات من الـ Backend API
    fetch('https://clinika-backend.vercel.app/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setStats({
            totalDoctors: data.totalDoctors ?? 48,
            totalPatients: data.totalPatients ?? 1240,
            totalAppointments: data.totalAppointments ?? 3892,
            pendingRequests: data.pendingRequests ?? 5
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching stats:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: 'sans-serif', width: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
      <Helmet>
        <title>Admin Dashboard | Clinika</title>
      </Helmet>

      {/* Sidebar جانبي الثابت */}
      <aside style={{ width: '260px', backgroundColor: '#ffffff', borderRight: '1px solid #E2E8F0', padding: '24px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', flexShrink: 0, minHeight: '100vh' }}>
        <div>
          {/* Logo / Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', paddingLeft: '8px' }}>
            <span style={{ backgroundColor: '#1B68F6', color: '#fff', padding: '8px', borderRadius: '8px', fontWeight: 'bold' }}>🏥</span>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0F172A', margin: 0 }}>Clinika</h2>
              <span style={{ fontSize: '11px', color: '#64748B' }}>ADMIN PORTAL</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link 
              to="/admin-dashboard" 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500',
                backgroundColor: '#EFF6FF',
                color: '#1B68F6'
              }}
            >
              📊 Overview
            </Link>

            <Link 
              to="manage-doctors" 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500',
                backgroundColor: 'transparent',
                color: '#64748B'
              }}
            >
              🩺 Manage Doctors
            </Link>

            <Link 
              to="manage-users-and-appointments" 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500',
                backgroundColor: 'transparent',
                color: '#64748B'
              }}
            >
              📅 Manage Users & Appointments
            </Link>

            <Link 
              to="my-profile" 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500',
                backgroundColor: 'transparent',
                color: '#64748B'
              }}
            >
              👤 Profile
            </Link>
          </nav>
        </div>

        {/* Logout */}
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', color: '#EF4444', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>
            🚪 Logout
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#F8FAFC', padding: '24px', boxSizing: 'border-box' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0F172A', margin: 0 }}>Clinika - Admin Overview Dashboard</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>Clinika Platform Admin Network • Operational: Online</p>
          </div>
          <div style={{ fontSize: '12px', backgroundColor: '#EFF6FF', color: '#1B68F6', padding: '6px 12px', borderRadius: '20px', fontWeight: '500', border: '1px solid #BFDBFE' }}>
            System Admin Portal
          </div>
        </div>

        {/* Welcome Banner */}
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F1F5F9', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A', margin: 0 }}>Welcome back, Admin</h2>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>Here is an overview of your Clinika platform.</p>
        </div>

        {/* Stats Grid - 4 Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Doctors</span>
              <span style={{ color: '#1B68F6', backgroundColor: '#EFF6FF', padding: '8px', borderRadius: '8px' }}>🩺</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#0F172A', margin: '12px 0 4px 0' }}>
              {loading ? '...' : stats.totalDoctors}
            </p>
            <span style={{ fontSize: '12px', color: '#16A34A' }}>Verified medical practitioners</span>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Patients</span>
              <span style={{ color: '#1B68F6', backgroundColor: '#EFF6FF', padding: '8px', borderRadius: '8px' }}>👥</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#0F172A', margin: '12px 0 4px 0' }}>
              {loading ? '...' : stats.totalPatients}
            </p>
            <span style={{ fontSize: '12px', color: '#16A34A' }}>Registered patient accounts</span>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Appointments</span>
              <span style={{ color: '#1B68F6', backgroundColor: '#EFF6FF', padding: '8px', borderRadius: '8px' }}>📅</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#0F172A', margin: '12px 0 4px 0' }}>
              {loading ? '...' : stats.totalAppointments}
            </p>
            <span style={{ fontSize: '12px', color: '#16A34A' }}>Total bookings</span>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Pending Requests</span>
              <span style={{ color: '#EA580C', backgroundColor: '#FFEDD5', padding: '8px', borderRadius: '8px' }}>⏳</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#0F172A', margin: '12px 0 4px 0' }}>
              {loading ? '...' : stats.pendingRequests}
            </p>
            <span style={{ fontSize: '12px', color: '#EA580C' }}>Requires verification</span>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 8px 0' }}>Manage Doctors</h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px 0' }}>View, verify, and orchestrate licensed medical practitioner credentials across Clinika network.</p>
            </div>
            <Link to="manage-doctors" style={{ backgroundColor: '#1B68F6', color: '#ffffff', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', textDecoration: 'none', width: 'fit-content' }}>
              Access Directory &rarr;
            </Link>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 8px 0' }}>Manage Users & Appointments</h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px 0' }}>Oversee patient registrations, monitor bookings, and manage schedule logs.</p>
            </div>
            <Link to="manage-users-and-appointments" style={{ backgroundColor: '#1B68F6', color: '#ffffff', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', textDecoration: 'none', width: 'fit-content' }}>
              Open Bookings &rarr;
            </Link>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #F1F5F9' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0F172A', margin: '0 0 4px 0' }}>Recent Activity</h3>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px 0' }}>Latest operations and lifecycle events across the platform.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ backgroundColor: '#EFF6FF', color: '#1B68F6', padding: '8px', borderRadius: '8px', fontSize: '14px' }}>🩺</span>
                <div>
                  <p style={{ fontWeight: '600', color: '#0F172A', margin: 0 }}>A new doctor registered.</p>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Dr. Sarah Al-Mansoor submitted verification credentials for Cardiology.</p>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>10 minutes ago</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-sign', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ backgroundColor: '#EFF6FF', color: '#1B68F6', padding: '8px', borderRadius: '8px', fontSize: '14px' }}>📅</span>
                <div>
                  <p style={{ fontWeight: '600', color: '#0F172A', margin: 0 }}>A patient booked an appointment.</p>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Consultation scheduled with Dr. Maya Bennett for General Medicine.</p>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>45 minutes ago</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ backgroundColor: '#EFF6FF', color: '#1B68F6', padding: '8px', borderRadius: '8px', fontSize: '14px' }}>👤</span>
                <div>
                  <p style={{ fontWeight: '600', color: '#0F172A', margin: 0 }}>A doctor profile was updated.</p>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Dr. Daniel Park adjusted consulting hours and room assignment.</p>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>2 hours ago</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}