import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PrescriptionCard, RecordCard } from '../../Components/Patient/RecordCards';
import { EmptyState, ErrorState, LoadingState } from '../../Components/Patient/StateViews';
import { fetchMedicalRecords, fetchPrescriptions, getErrorMessage, isUnauthorized } from './patientApi';
import './patient-records.css';

const TABS = [
  { key: 'records', label: 'Medical records' },
  { key: 'prescriptions', label: 'Prescriptions' },
];

const LOADING = { status: 'loading', items: [], error: '', needsLogin: false };

export default function PatientMedicalRecords() {
  const [tab, setTab] = useState('records');
  const [state, setState] = useState(LOADING);
  const [attempt, setAttempt] = useState(0); // bump this number to reload the list

  // Load the list whenever the tab changes or we ask for a reload.
  useEffect(() => {
    let ignore = false;
    const load = tab === 'records' ? fetchMedicalRecords : fetchPrescriptions;
    load()
      .then((items) => {
        if (!ignore) setState({ status: 'ready', items, error: '', needsLogin: false });
      })
      .catch((err) => {
        if (!ignore) {
          setState({ status: 'error', items: [], error: getErrorMessage(err), needsLogin: isUnauthorized(err) });
        }
      });
    return () => {
      ignore = true;
    };
  }, [tab, attempt]);

  function changeTab(next) {
    if (next === tab) return;
    setState(LOADING);
    setTab(next);
  }

  function retry() {
    setState(LOADING);
    setAttempt((value) => value + 1);
  }

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
