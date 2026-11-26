import { formatDate, getInitials } from '../../utils/format';

function DoctorLine({ doctor, date }) {
  return (
    <div className="cl-pd-rec__head">
      {doctor.photo_url ? (
        <img className="cl-pd-avatar" src={doctor.photo_url} alt="" />
      ) : (
        <span className="cl-pd-avatar" aria-hidden="true">{getInitials(doctor.full_name)}</span>
      )}
      <div>
        <h3 className="cl-pd-rec__doctor">{doctor.full_name}</h3>
        <p className="cl-pd-muted">{[doctor.specialty_name, formatDate(date)].filter(Boolean).join(' · ')}</p>
      </div>
    </div>
  );
}

// Shows a label + text, or nothing when the doctor left the field empty.
function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="cl-pd-rec__field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function RecordCard({ record }) {
  return (
    <article className="cl-pd-card cl-pd-rec">
      <DoctorLine doctor={record.doctor} date={record.created_at} />
      <dl className="cl-pd-rec__fields">
        <Field label="Diagnosis" value={record.diagnosis} />
        <Field label="Symptoms" value={record.symptoms} />
        <Field label="Treatment plan" value={record.treatment_plan} />
        <Field label="Notes" value={record.notes} />
        <Field label="Follow-up" value={record.follow_up_date ? formatDate(record.follow_up_date) : ''} />
      </dl>
    </article>
  );
}

export function PrescriptionCard({ prescription }) {
  const { doctor, items, notes, created_at: createdAt } = prescription;
  return (
    <article className="cl-pd-card cl-pd-rec">
      <DoctorLine doctor={doctor} date={createdAt} />

      {items.length === 0 ? (
        <p className="cl-pd-muted">No medications listed.</p>
      ) : (
        <ul className="cl-pd-rx">
          {items.map((item) => (
            <li key={item.id} className="cl-pd-rx__item">
              <span className="material-symbols-outlined" aria-hidden="true">medication</span>
              <div>
                <p className="cl-pd-rx__name">{item.medication_name}</p>
                <p className="cl-pd-muted">
                  {[item.dosage, item.frequency, item.duration].filter(Boolean).join(' · ')}
                </p>
                {item.instructions && <p className="cl-pd-muted">{item.instructions}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {notes && (
        <dl className="cl-pd-rec__fields">
          <Field label="Doctor's notes" value={notes} />
        </dl>
      )}
    </article>
  );
}
