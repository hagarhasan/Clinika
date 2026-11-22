import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://clinika-backend.vercel.app';

export default function AdminOverview() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    pendingRequests: 0,
  });

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const getToken = () =>
    localStorage.getItem('token') || localStorage.getItem('access_token');

  const loadOverviewData = useCallback(
    async () => {
      const token = getToken();

      if (!token) {
        
          setLoading(false);
          navigate('/login', { replace: true });
    
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      try {
       const [statsRes, activityRes, patientsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/stats`, { headers }),
          fetch(`${API_BASE_URL}/admin/activity?limit=10&offset=0`, { headers }),
          fetch(`${API_BASE_URL}/admin/users?role=patient`, { headers }),
        ]);

        if (
          statsRes.status === 401 ||
          statsRes.status === 403 ||
          activityRes.status === 401 ||
          activityRes.status === 403
        ) {
          
            setErrorMsg('You are not authorized to view admin data.');
            setLoading(false);
          
          return;
        }
let patientsCountFromUsers = null;
      if (patientsRes && patientsRes.ok) {
        const patientsData = await patientsRes.json();
        const pList = Array.isArray(patientsData)
          ? patientsData
          : patientsData?.items || patientsData?.users || patientsData?.patients || patientsData?.data || [];
        if (Array.isArray(pList)) {
          patientsCountFromUsers = pList.length;
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData) {
          const statsPatients = statsData.totalPatients ?? statsData.total_patients ?? 0;
          setStats({
            totalDoctors: statsData.totalDoctors ?? statsData.total_doctors ?? 0,
            totalPatients:
              patientsCountFromUsers !== null && Number(statsPatients) === 0
                ? patientsCountFromUsers
                : statsPatients,
            totalAppointments: statsData.totalAppointments ?? statsData.total_appointments ?? 0,
            pendingRequests: statsData.pendingRequests ?? statsData.pending_requests ?? 0,
          });
        }
      } else if (patientsCountFromUsers !== null) {
        setStats((prev) => ({
          ...prev,
          totalPatients: patientsCountFromUsers,
        }));
      }

        if (activityRes.ok) {
          const activityData = await activityRes.json();
          const list = Array.isArray(activityData)
            ? activityData
            : activityData?.items ||
              activityData?.activities ||
              activityData?.data ||
              [];

          
            setActivities(Array.isArray(list) ? list : []);
          
        }
      } catch (err) {
        console.error('Error fetching overview data:', err);
       
          setErrorMsg('Failed to load dashboard data from server.');
        
      } finally {
        
          setLoading(false);
        
      }
    },
    [navigate]
  );

  useEffect(() => {
    let isActive = true;

    const fetchData = async () => {
      await loadOverviewData();
    };

    if (isActive) {
      fetchData();
    }

    return () => {
      isActive = false;
    };
  }, [loadOverviewData]);
  return (
    <div
      style={{
        backgroundColor: '#F8FAFC',
        padding: '24px',
        boxSizing: 'border-box',
        fontFamily: 'sans-serif',
        width: '100%',
      }}
    >
      <Helmet>
        <title>Admin Overview | Clinika</title>
      </Helmet>

      {/* Top Bar / Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          padding: '14px 20px',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 'bold',
              color: '#0F172A',
            }}
          >
            Clinika Platform Admin Network
          </span>
          <span style={{ color: '#CBD5E1' }}>•</span>
          <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: '500' }}>
            <i className="fa-solid fa-circle" style={{ fontSize: '8px', marginRight: '6px' }} aria-hidden="true" />
            Operational: Online
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A' }}>
              System Admin
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Platform Administrator
            </div>
          </div>
          <span
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              backgroundColor: '#1B68F6',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
            }}
          >
            <i className="fa-solid fa-user-shield" aria-hidden="true" />
          </span>
        </div>
      </div>

      {/* Welcome Banner */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #F1F5F9',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#0F172A',
              margin: 0,
            }}
          >
            Welcome back, Admin
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#64748B',
              margin: '4px 0 0 0',
            }}
          >
            Here is an overview of your Clinika platform.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            to="manage-doctors"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              padding: '9px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa-solid fa-user-doctor" style={{ color: '#1B68F6' }} aria-hidden="true" />
            <span>Manage Doctors</span>
          </Link>

          <Link
            to="manage-users-and-appointments"
            style={{
              backgroundColor: '#1B68F6',
              color: '#FFFFFF',
              padding: '9px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa-solid fa-calendar-check" aria-hidden="true" />
            <span>Manage Users &amp; Appointments</span>
          </Link>
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
            marginBottom: '20px',
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

      {/* Stats Grid - 4 Columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #F1F5F9',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                color: '#64748B',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}
            >
              Total Doctors
            </span>
            <span
              style={{
                color: '#1B68F6',
                backgroundColor: '#EFF6FF',
                padding: '8px',
                borderRadius: '8px',
              }}
            >
              <i className="fa-solid fa-user-doctor" aria-hidden="true" />
            </span>
          </div>
          <p
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#0F172A',
              margin: '12px 0 4px 0',
            }}
          >
            {loading ? '...' : stats.totalDoctors}
          </p>
          <span style={{ fontSize: '12px', color: '#16A34A' }}>
            Verified medical practitioners
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #F1F5F9',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                color: '#64748B',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}
            >
              Total Patients
            </span>
            <span
              style={{
                color: '#1B68F6',
                backgroundColor: '#EFF6FF',
                padding: '8px',
                borderRadius: '8px',
              }}
            >
              <i className="fa-solid fa-users" aria-hidden="true" />
            </span>
          </div>
          <p
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#0F172A',
              margin: '12px 0 4px 0',
            }}
          >
            {loading ? '...' : stats.totalPatients}
          </p>
          <span style={{ fontSize: '12px', color: '#16A34A' }}>
            Registered patient accounts
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #F1F5F9',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                color: '#64748B',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}
            >
              Total Appointments
            </span>
            <span
              style={{
                color: '#1B68F6',
                backgroundColor: '#EFF6FF',
                padding: '8px',
                borderRadius: '8px',
              }}
            >
              <i className="fa-solid fa-calendar-check" aria-hidden="true" />
            </span>
          </div>
          <p
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#0F172A',
              margin: '12px 0 4px 0',
            }}
          >
            {loading ? '...' : stats.totalAppointments}
          </p>
          <span style={{ fontSize: '12px', color: '#16A34A' }}>
            Completed &amp; scheduled sessions
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #F1F5F9',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                color: '#64748B',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}
            >
              Pending Requests
            </span>
            <span
              style={{
                color: '#EA580C',
                backgroundColor: '#FFEDD5',
                padding: '8px',
                borderRadius: '8px',
              }}
            >
              <i className="fa-solid fa-clock" aria-hidden="true" />
            </span>
          </div>
          <p
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#0F172A',
              margin: '12px 0 4px 0',
            }}
          >
            {loading ? '...' : stats.pendingRequests}
          </p>
          <span style={{ fontSize: '12px', color: '#EA580C' }}>
            Applications awaiting review
          </span>
        </div>
      </div>
      {/* Quick Navigation Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #F1F5F9',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span
                style={{
                  backgroundColor: '#EFF6FF',
                  color: '#1B68F6',
                  padding: '8px',
                  borderRadius: '8px',
                }}
              >
                <i className="fa-solid fa-user-doctor" aria-hidden="true" />
              </span>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#0F172A',
                  margin: 0,
                }}
              >
                Manage Doctors
              </h2>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: '#64748B',
                margin: '0 0 20px 0',
              }}
            >
              View, verify, and orchestrate licensed medical practitioner credentials across Clinika network.
            </p>
          </div>
          <Link
            to="manage-doctors"
            style={{
              color: '#1B68F6',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              width: 'fit-content',
            }}
          >
            <span>Access Directory</span>
            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #F1F5F9',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span
                style={{
                  backgroundColor: '#EFF6FF',
                  color: '#1B68F6',
                  padding: '8px',
                  borderRadius: '8px',
                }}
              >
                <i className="fa-solid fa-calendar-check" aria-hidden="true" />
              </span>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#0F172A',
                  margin: 0,
                }}
              >
                Manage Users &amp; Appointments
              </h2>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: '#64748B',
                margin: '0 0 20px 0',
              }}
            >
              Oversee patient registrations, monitor bookings, and manage schedule logs.
            </p>
          </div>
          <Link
            to="manage-users-and-appointments"
            style={{
              color: '#1B68F6',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              width: 'fit-content',
            }}
          >
            <span>Open Bookings</span>
            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #F1F5F9',
        }}
      >
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#0F172A',
            margin: '0 0 4px 0',
          }}
        >
          Recent Activity
        </h2>
        <p
          style={{
            fontSize: '13px',
            color: '#64748B',
            margin: '0 0 16px 0',
          }}
        >
          Latest operations and lifecycle events across the platform.
        </p>

        {loading ? (
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Loading recent activity...
          </p>
        ) : activities.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            No recent activity available.
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              fontSize: '13px',
            }}
          >
            {activities.map((item, idx) => (
              <div
                key={item.id ?? idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom:
                    idx < activities.length - 1 ? '1px solid #F1F5F9' : 'none',
                  paddingBottom: idx < activities.length - 1 ? '12px' : 0,
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      backgroundColor: '#EFF6FF',
                      color: '#1B68F6',
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  >
                    <i className="fa-solid fa-bell" aria-hidden="true" />
                  </span>
                  <div>
                    <p style={{ fontWeight: '600', color: '#0F172A', margin: 0 }}>
                      {item.title || item.action || item.event || 'Platform Activity'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                      {item.description || item.details || ''}
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#94A3B8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.created_at || item.timestamp || item.time || ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}