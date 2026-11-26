import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PrescriptionCard, RecordCard } from '../../Components/Patient/RecordCards';
import { EmptyState, ErrorState, LoadingState } from '../../Components/Patient/StateViews';
import { useMyMedicalRecords, useMyPrescriptions } from '../../hooks/usePatientData';
import { getErrorMessage, isUnauthorized } from '../../api/client';
import './patient-records.css';

const TABS = [
  { key: 'records', label: 'Medical records' },
  { key: 'prescriptions', label: 'Prescriptions' },
];

export default function PatientMedicalRecords() {
  const [tab, setTab] = useState('records');
  // Both lists are loaded when the dashboard opens, so switching tabs is instant.
  const recordsQuery = useMyMedicalRecords();
  const prescriptionsQuery = useMyPrescriptions();
  const query = tab === 'records' ? recordsQuery : prescriptionsQuery;
  const state = {
    status: query.isLoading ? 'loading' : query.isError ? 'error' : 'ready',
    items: query.data || [],
    error: query.isError ? getErrorMessage(query.error) : '',
    needsLogin: query.isError && isUnauthorized(query.error),
  };

  const changeTab = (next) => setTab(next);
  const retry = () => query.refetch();

  return (
    <>
      <Helmet>
        <title>Medical Records | Clinika</title>
      </Helmet>

      <header className="cl-pd-page-head">
        <h1>Medical Records</h1>
        <p className="cl-pd-muted">Diagnoses and prescriptions your doctors added to your file.</p>
      </header>

      <div className="cl-pd-tabs" role="tablist" aria-label="Medical records sections">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`cl-pd-tab ${tab === key ? 'is-active' : ''}`}
            onClick={() => changeTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {state.status === 'loading' && <LoadingState label="Loading your records…" />}

      {state.status === 'error' && (
        <ErrorState message={state.error} onRetry={retry} needsLogin={state.needsLogin} />
      )}

      {state.status === 'ready' && state.items.length === 0 && (
        <EmptyState
          icon={tab === 'records' ? 'folder_shared' : 'medication'}
          title={tab === 'records' ? 'No medical records yet' : 'No prescriptions yet'}
          text={
            tab === 'records'
              ? 'After a visit, your doctor can add a record to your file.'
              : 'Prescriptions from your doctors will appear here.'
          }
        />
      )}

      {state.status === 'ready' && state.items.length > 0 && (
        <div className="cl-pd-list">
          {state.items.map((item) =>
            tab === 'records' ? (
              <RecordCard key={item.id} record={item} />
            ) : (
              <PrescriptionCard key={item.id} prescription={item} />
            )
          )}
        </div>
      )}

      <aside className="cl-pd-card cl-pd-policy">
        <h2>Coming soon</h2>
        <p className="cl-pd-muted">
          Lab results, scans, document uploads and downloads are not available yet.
        </p>
      </aside>
    </>
  );
}
