import { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';

const API_BASE_URL = 'https://clinika-backend.vercel.app';
const PAGE_LIMIT = 5;

const normalizeDoctorStatus = (rawStatus) => {
  const s = String(rawStatus || '').trim().toLowerCase();
  if (s === 'active' || s === 'approved' || s === 'accepted') return 'Active';
  if (s === 'pending' || s === 'pending_approval' || s === 'pending approval' || s === 'review') {
    return 'Pending Approval';
  }
  if (s === 'rejected' || s === 'declined') return 'Rejected';
  if (s === 'inactive' || s === 'suspended' || s === 'disabled') return 'Inactive';
  return 'Pending Approval';
};

const getDoctorId = (doc) => {
  if (!doc || typeof doc !== 'object') return '';
  return doc.id ?? doc.doctor_id ?? doc._id ?? '';
};

const getDoctorName = (doc) => {
  if (!doc || typeof doc !== 'object') return '';
  return (
    doc.name ||
    doc.full_name ||
    doc.doctor_name ||
    doc.user?.full_name ||
    doc.user?.name ||
    [doc.first_name, doc.last_name].filter(Boolean).join(' ') ||
    ''
  );
};

const getDoctorNpi = (doc) => {
  if (!doc || typeof doc !== 'object') return '';
  return (
    doc.npi ||
    doc.npi_number ||
    doc.license_number ||
    doc.license ||
    doc.medical_license ||
    ''
  );
};

const getDoctorExperience = (doc) => {
  if (!doc || typeof doc !== 'object') return '';
  const exp =
    doc.experience ??
    doc.years_of_experience ??
    doc.experience_years ??
    doc.yearsOfExperience ??
    '';
  if (exp === '' || exp === null || exp === undefined) return '';
  return typeof exp === 'number' ? `${exp} years` : String(exp);
};

const getDoctorSpecialty = (doc) => {
  if (!doc || typeof doc !== 'object') return '';
  const spec = doc.specialty ?? doc.specialization ?? '';
  if (typeof spec === 'object' && spec !== null) {
    return spec.name || spec.title || '';
  }
  return String(spec || '');
};

const getDoctorEmail = (doc) => {
  if (!doc || typeof doc !== 'object') return '';
  return doc.email || doc.contact_email || doc.user?.email || '';
};

export default function ManageDoctors() {
  const navigate = useNavigate();

  const {
    doctors: contextDoctors,
    setDoctors: setContextDoctors,
    loading: contextLoading,
    errorMsg: contextErrorMsg,
    getToken,
    refreshDashboard,
  } = useDashboard();

  const [doctorsList, setDoctorsList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [localErrorMsg, setLocalErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [editStatus, setEditStatus] = useState('Pending Approval');

  const [newDoctor, setNewDoctor] = useState({
    name: '',
    npi: '',
    specialty: '',
    email: '',
    experience: '',
    status: 'Pending Approval',
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

  useEffect(() => {
    if (Array.isArray(contextDoctors) && contextDoctors.length > 0 && doctorsList.length === 0) {
      setDoctorsList(contextDoctors);
      setTotalCount((prev) => (prev > 0 ? prev : contextDoctors.length));
    }
  }, [contextDoctors, doctorsList.length]);

  const fetchDoctorsPaginated = useCallback(
    async ({ page = currentPage, status = filterStatus, query = searchQuery } = {}) => {
      const token = getToken();
      if (!token) return;

      const offset = (page - 1) * PAGE_LIMIT;
      setTableLoading(true);
      setLocalErrorMsg('');

      try {
        const params = new URLSearchParams();
        params.set('limit', String(PAGE_LIMIT));
        params.set('offset', String(offset));

        if (status && status !== 'All') {
          params.set('status', status);
        }
        if (query && query.trim()) {
          params.set('search', query.trim());
        }

        const res = await fetch(`${API_BASE_URL}/admin/doctors/?${params.toString()}`, {
          headers: getAuthHeaders(),
        });

        if (!res.ok) {
          throw new Error(`Failed to load doctors (${res.status})`);
        }

        const headerTotal =
          res.headers.get('x-total-count') ||
          res.headers.get('X-Total-Count') ||
          res.headers.get('total-count') ||
          res.headers.get('x-count');

        const data = await res.json();
        const rawList = Array.isArray(data)
          ? data
          : data?.items || data?.doctors || data?.data || [];

        const safeList = Array.isArray(rawList) ? rawList : [];
        setDoctorsList(safeList);

        const parsedHeaderTotal = headerTotal ? Number(headerTotal) : NaN;
        const bodyTotal =
          data?.total ?? data?.count ?? data?.totalCount ?? data?.total_count;

        if (!Number.isNaN(parsedHeaderTotal) && parsedHeaderTotal >= 0) {
          setTotalCount(parsedHeaderTotal);
        } else if (typeof bodyTotal === 'number') {
          setTotalCount(bodyTotal);
        } else {
          setTotalCount(safeList.length);
        }

        if (status === 'All' && !query.trim() && page === 1 && typeof setContextDoctors === 'function') {
          setContextDoctors(safeList);
        }
      } catch (err) {
        console.error('Error fetching doctors:', err);
        if (Array.isArray(contextDoctors) && contextDoctors.length > 0) {
          setDoctorsList(contextDoctors);
        } else {
          setLocalErrorMsg('Could not load doctors list from server.');
        }
      } finally {
        setTableLoading(false);
      }
    },
    [currentPage, filterStatus, searchQuery, getToken, getAuthHeaders, setContextDoctors, contextDoctors]
  );

  useEffect(() => {
    fetchDoctorsPaginated({ page: currentPage, status: filterStatus, query: searchQuery });
  }, [fetchDoctorsPaginated, currentPage, filterStatus, searchQuery]);

  const sourceDoctors = useMemo(() => {
    if (doctorsList.length > 0) return doctorsList;
    return Array.isArray(contextDoctors) ? contextDoctors : [];
  }, [doctorsList, contextDoctors]);

  const filteredDoctors = useMemo(() => {
    return sourceDoctors.filter((doc) => {
      const q = searchQuery.trim().toLowerCase();
      const docName = getDoctorName(doc).toLowerCase();
      const docSpecialty = getDoctorSpecialty(doc).toLowerCase();
      const docNpi = String(getDoctorNpi(doc)).toLowerCase();
      const docEmail = getDoctorEmail(doc).toLowerCase();
      const normalizedStatus = normalizeDoctorStatus(doc.status);

      const matchesSearch =
        !q ||
        docName.includes(q) ||
        docSpecialty.includes(q) ||
        docNpi.includes(q) ||
        docEmail.includes(q);

      const matchesFilter =
        filterStatus === 'All' ||
        normalizedStatus.toLowerCase() === filterStatus.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [sourceDoctors, searchQuery, filterStatus]);

  const handleAddDoctorSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLocalErrorMsg('');
    setStatusMsg('');

    try {
      const payload = {
        name: newDoctor.name.trim(),
        full_name: newDoctor.name.trim(),
        npi: newDoctor.npi.trim(),
        license_number: newDoctor.npi.trim(),
        specialty: newDoctor.specialty.trim(),
        email: newDoctor.email.trim(),
        experience: newDoctor.experience.trim(),
        status: newDoctor.status,
      };

      const res = await fetch(`${API_BASE_URL}/admin/doctors`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to add doctor on server');
      }

      setIsAddModalOpen(false);
      setNewDoctor({
        name: '',
        npi: '',
        specialty: '',
        email: '',
        experience: '',
        status: 'Pending Approval',
      });
      setStatusMsg('Doctor added successfully.');
      await fetchDoctorsPaginated({ page: currentPage, status: filterStatus, query: searchQuery });
      if (typeof refreshDashboard === 'function') {
        refreshDashboard({ silent: true });
      }
    } catch (err) {
      console.error('Error adding doctor:', err);
      setLocalErrorMsg('Could not add doctor. Please check admin permissions or try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (doc) => {
    setSelectedDoctor(doc);
    setEditStatus(normalizeDoctorStatus(doc.status));
    setIsEditModalOpen(true);
  };

  const handleUpdateDoctorStatus = async (nextStatus) => {
    if (!selectedDoctor) return;
    const docId = getDoctorId(selectedDoctor);
    if (!docId) {
      setLocalErrorMsg('Doctor ID is missing.');
      return;
    }

    const normalizedNext = normalizeDoctorStatus(nextStatus);
    const reviewPayload = {
      status: normalizedNext,
      decision:
        normalizedNext === 'Active'
          ? 'approve'
          : normalizedNext === 'Rejected'
          ? 'reject'
          : normalizedNext.toLowerCase(),
      action:
        normalizedNext === 'Active'
          ? 'approve'
          : normalizedNext === 'Rejected'
          ? 'reject'
          : normalizedNext.toLowerCase(),
    };

    setSubmitting(true);
    setLocalErrorMsg('');
    setStatusMsg('');

    try {
      let res = await fetch(`${API_BASE_URL}/admin/doctors/${docId}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(reviewPayload),
      });

      if (!res.ok && (res.status === 405 || res.status === 404)) {
        res = await fetch(`${API_BASE_URL}/admin/doctors/${docId}/review`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(reviewPayload),
        });
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.detail || errBody?.message || 'Failed to update doctor status');
      }

      const updateItem = (item) => {
        if (String(getDoctorId(item)) !== String(docId)) return item;
        return { ...item, status: normalizedNext };
      };

      setDoctorsList((prev) => prev.map(updateItem));
      if (typeof setContextDoctors === 'function') {
        setContextDoctors((prev) => (Array.isArray(prev) ? prev.map(updateItem) : prev));
      }

      setIsEditModalOpen(false);
      setSelectedDoctor(null);
      setStatusMsg(`Doctor status updated to "${normalizedNext}".`);

      await fetchDoctorsPaginated({ page: currentPage, status: filterStatus, query: searchQuery });
      if (typeof refreshDashboard === 'function') {
        refreshDashboard({ silent: true });
      }
    } catch (err) {
      console.error('Error updating doctor:', err);
      setLocalErrorMsg(err?.message || 'Could not update doctor status on server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportRoster = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        'Doctor ID,Name,NPI,Specialty,Email,Experience,Status',
        ...filteredDoctors.map((d) => {
          const id = getDoctorId(d);
          const name = getDoctorName(d);
          const npi = getDoctorNpi(d);
          const specialty = getDoctorSpecialty(d);
          const email = getDoctorEmail(d);
          const exp = getDoctorExperience(d);
          const st = normalizeDoctorStatus(d.status);
          return `"${id}","${name}","${npi}","${specialty}","${email}","${exp}","${st}"`;
        }),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'clinika_doctors_roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeError = localErrorMsg || contextErrorMsg;
  const isInitialLoading = (contextLoading || tableLoading) && filteredDoctors.length === 0;
  const totalPages = Math.max(1, Math.ceil((totalCount || filteredDoctors.length) / PAGE_LIMIT));
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
        <title>Manage Doctors | Clinika</title>
      </Helmet>

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#0F172A', margin: 0 }}>
            Manage Doctors
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '6px', marginBottom: 0 }}>
            View, verify, and orchestrate licensed medical practitioner credentials across Clinika networks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportRoster}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #CBD5E1',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa-solid fa-file-export" aria-hidden="true" />
            <span>Export Roster</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              backgroundColor: '#1B68F6',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa-solid fa-plus" aria-hidden="true" />
            <span>Add Doctor</span>
          </button>
        </div>
      </div>

      {activeError && (
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
          <span>{activeError}</span>
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

      {/* Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>All Doctors</span>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0', color: '#0F172A' }}>
            {totalCount || sourceDoctors.length}
          </h2>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Active</span>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0', color: '#1B68F6' }}>
            {sourceDoctors.filter((d) => normalizeDoctorStatus(d.status) === 'Active').length}
          </h2>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Pending Approval</span>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0', color: '#D97706' }}>
            {sourceDoctors.filter((d) => normalizeDoctorStatus(d.status) === 'Pending Approval').length}
          </h2>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Rejected</span>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0', color: '#DC2626' }}>
            {sourceDoctors.filter((d) => normalizeDoctorStatus(d.status) === 'Rejected').length}
          </h2>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Inactive</span>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0', color: '#64748B' }}>
            {sourceDoctors.filter((d) => normalizeDoctorStatus(d.status) === 'Inactive').length}
          </h2>
        </div>
      </div>

      {/* Directory Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <span style={{ fontWeight: '600', fontSize: '16px' }}>Directory</span>

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
              placeholder="Search by doctor name, specialty, NPI..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '9px 14px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                width: '100%',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '24px',
            padding: '0 24px',
            borderBottom: '1px solid #F1F5F9',
            flexWrap: 'wrap',
          }}
        >
          {['All', 'Active', 'Pending Approval', 'Rejected', 'Inactive'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setFilterStatus(status);
                setCurrentPage(1);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 0',
                cursor: 'pointer',
                fontWeight: filterStatus === status ? '600' : '400',
                color: filterStatus === status ? '#1B68F6' : '#64748B',
                borderBottom:
                  filterStatus === status
                    ? '2px solid #1B68F6'
                    : '2px solid transparent',
                fontSize: '14px',
              }}
            >
              {status}
            </button>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  color: '#64748B',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                }}
              >
                <th style={{ padding: '14px 24px' }}>Doctor &amp; Credentials</th>
                <th style={{ padding: '14px 24px' }}>Specialty</th>
                <th style={{ padding: '14px 24px' }}>Contact Email</th>
                <th style={{ padding: '14px 24px' }}>Experience</th>
                <th style={{ padding: '14px 24px' }}>System Status</th>
                <th style={{ padding: '14px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isInitialLoading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }} aria-hidden="true" />
                    Loading network data...
                  </td>
                </tr>
              ) : filteredDoctors.length > 0 ? (
                filteredDoctors.map((doc, index) => {
                  const docId = getDoctorId(doc);
                  const docName = getDoctorName(doc) || 'Unnamed Doctor';
                  const docNpi = getDoctorNpi(doc);
                  const docSpecialty = getDoctorSpecialty(doc);
                  const docEmail = getDoctorEmail(doc);
                  const docExp = getDoctorExperience(doc);
                  const statusVal = normalizeDoctorStatus(doc.status);
                  const isActiveStatus = statusVal === 'Active';
                  const isPendingStatus = statusVal === 'Pending Approval';
                  const isRejectedStatus = statusVal === 'Rejected';

                  return (
                    <tr key={docId || index} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: '#EFF6FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#1B68F6',
                              fontWeight: '600',
                              flexShrink: 0,
                            }}
                          >
                            {docName ? docName.replace(/^Dr\.?\s*/i, '')[0]?.toUpperCase() || 'D' : 'D'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: '#0F172A', fontSize: '14px' }}>
                              {docName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                              NPI: {docNpi || '—'} {docId ? `• ID: ${docId}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>
                        {docSpecialty || '-'}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>
                        {docEmail || '—'}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '14px', color: '#334155' }}>
                        {docExp || '—'}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span
                          style={{
                            backgroundColor: isActiveStatus
                              ? '#EFF6FF'
                              : isPendingStatus
                              ? '#FFEDD5'
                              : isRejectedStatus
                              ? '#FEF2F2'
                              : '#F1F5F9',
                            color: isActiveStatus
                              ? '#1B68F6'
                              : isPendingStatus
                              ? '#EA580C'
                              : isRejectedStatus
                              ? '#DC2626'
                              : '#64748B',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <i className="fa-solid fa-circle" style={{ fontSize: '7px' }} aria-hidden="true" />
                          <span>{statusVal}</span>
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(doc)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#1B68F6',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <i
                            className={isPendingStatus ? 'fa-solid fa-clipboard-check' : 'fa-solid fa-pen-to-square'}
                            aria-hidden="true"
                          />
                          <span>{isPendingStatus ? 'Review' : 'Edit'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    No doctors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '13px',
            color: '#64748B',
          }}
        >
          <span>
            Showing {filteredDoctors.length} of {totalCount || filteredDoctors.length} doctors (limit={PAGE_LIMIT}, offset={(currentPage - 1) * PAGE_LIMIT})
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={currentPage <= 1 || tableLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: currentPage <= 1 ? '#F8FAFC' : '#FFFFFF',
                color: '#0F172A',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <span style={{ fontWeight: '600', color: '#0F172A' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages || tableLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: currentPage >= totalPages ? '#F8FAFC' : '#FFFFFF',
                color: '#0F172A',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {/* Bottom Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
        }}
      >
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Regulatory Review</h3>
            <i className="fa-solid fa-shield-halved" style={{ color: '#1B68F6' }} aria-hidden="true" />
          </div>
          <span style={{ fontSize: '12px', color: '#64748B' }}>NPI &amp; State Licenses</span>
          <div style={{ fontSize: '30px', fontWeight: 'bold', margin: '12px 0 6px', color: '#0F172A' }}>
            {sourceDoctors.length > 0
              ? `${Math.round(
                  (sourceDoctors.filter((d) => normalizeDoctorStatus(d.status) === 'Active').length /
                    sourceDoctors.length) *
                    100
                )}%`
              : '0%'}
          </div>
          <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: '500' }}>
            Verified active practitioners ratio
          </span>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Specialty Breakdown</h3>
            <i className="fa-solid fa-chart-pie" style={{ color: '#1B68F6' }} aria-hidden="true" />
          </div>
          <span style={{ fontSize: '12px', color: '#64748B' }}>Network Capacity</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px', fontSize: '13px' }}>
            <div>
              <i className="fa-solid fa-circle" style={{ color: '#1B68F6', fontSize: '8px', marginRight: '8px' }} aria-hidden="true" />
              Total Specialties:{' '}
              <strong>
                {new Set(sourceDoctors.map((d) => getDoctorSpecialty(d)).filter(Boolean)).size}
              </strong>
            </div>
            <div>
              <i className="fa-solid fa-circle" style={{ color: '#16A34A', fontSize: '8px', marginRight: '8px' }} aria-hidden="true" />
              Active Doctors:{' '}
              <strong>
                {sourceDoctors.filter((d) => normalizeDoctorStatus(d.status) === 'Active').length}
              </strong>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#1B68F6',
            color: '#FFFFFF',
            padding: '24px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', opacity: 0.9, fontWeight: '600' }}>FAST ONBOARDING</span>
            <h3 style={{ margin: '6px 0 8px', fontSize: '18px' }}>Hospital EHR Integration</h3>
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
              Streamline credential verification and onboarding for new specialists.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#1B68F6',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: 'fit-content',
            }}
          >
            <i className="fa-solid fa-user-plus" aria-hidden="true" />
            <span>Onboard Doctor</span>
          </button>
        </div>
      </div>

      {/* Add Doctor Modal */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
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
              padding: '28px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '450px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 18px', fontSize: '19px', color: '#0F172A' }}>
              Add New Doctor
            </h3>
            <form onSubmit={handleAddDoctorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>Doctor Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. John Doe"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>NPI Number</label>
                <input
                  type="text"
                  required
                  placeholder="12345678"
                  value={newDoctor.npi}
                  onChange={(e) => setNewDoctor({ ...newDoctor, npi: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>Specialty</label>
                <input
                  type="text"
                  required
                  placeholder="Cardiology"
                  value={newDoctor.specialty}
                  onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>Contact Email</label>
                <input
                  type="email"
                  required
                  placeholder="doctor@clinika.com"
                  value={newDoctor.email}
                  onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>Experience</label>
                <input
                  type="text"
                  required
                  placeholder="5 years"
                  value={newDoctor.experience}
                  onChange={(e) => setNewDoctor({ ...newDoctor, experience: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ backgroundColor: '#F1F5F9', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: '#1B68F6', color: '#FFFFFF', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
                >
                  {submitting ? 'Saving...' : 'Save Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review / Edit Doctor Modal */}
      {isEditModalOpen && selectedDoctor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
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
              padding: '28px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '19px', color: '#0F172A' }}>
              Review / Edit: {getDoctorName(selectedDoctor) || 'Doctor'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
              Current Status:{' '}
              <strong style={{ color: '#1B68F6' }}>
                {normalizeDoctorStatus(selectedDoctor.status)}
              </strong>
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>Update Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '6px', backgroundColor: '#FFFFFF' }}
              >
                <option value="Active">Active</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Rejected">Rejected</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleUpdateDoctorStatus('Active')}
                style={{ backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
              >
                Approve Doctor
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleUpdateDoctorStatus('Rejected')}
                style={{ backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
              >
                Reject Doctor
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleUpdateDoctorStatus(editStatus)}
                style={{ backgroundColor: '#1B68F6', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsEditModalOpen(false)}
                style={{ backgroundColor: '#F1F5F9', color: '#475569', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}