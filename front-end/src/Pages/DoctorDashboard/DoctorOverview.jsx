import { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../Components/ui/Avatar';
import { useDoctorData, to12, hhmm, C, card, pill, btn, STATUS_UI } from './DoctorDashboard';

export default function DoctorOverview() {
  const { today, appointments, profile, loading } = useDoctorData();
  const [demoView, setDemoView] = useState(false);

  const list = demoView
    ? [
        { id: 'd1', patient_name: 'Omar Khaled', start_time: '09:30', duration_minutes: 30, consultation_type: 'in_person', status: 'confirmed', note: 'Consultation Room 3B' },
        { id: 'd2', patient_name: 'Mona Hassan', start_time: '11:00', duration_minutes: 30, consultation_type: 'online', status: 'confirmed', note: 'Tele-consult Link Prepared' },
        { id: 'd3', patient_name: 'Karim Youssef', start_time: '14:15', duration_minutes: 45, consultation_type: 'in_person', status: 'pending', note: 'Routine Checkup Request' },
      ]
    : (today.length ? today : appointments.slice(0, 5));

  const bookedCount = list.length;
  const totalSlots = Math.max(8, bookedCount + 5);
  const remaining = Math.max(0, totalSlots - bookedCount);
  const pct = Math.min(100, Math.round((bookedCount / totalSlots) * 100));

  return (
    <div className="cl-doctor-overview-grid">
      {/* Left: Today's Appointments */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Today&apos;s Appointments</h2>
            <span style={pill(C.primaryFixed, C.primary)}>{bookedCount} Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => setDemoView((v) => !v)}
              style={btn(C.low, C.text, { border: `1px solid ${C.border}`, padding: '6px 12px', fontSize: 12 })}
            >
              {demoView ? 'Live Data' : 'Toggle Demo View'}
            </button>
            <Link to="/doctor-dashboard/manage-appointments" style={{ fontSize: 13, fontWeight: 700, color: C.primary, textDecoration: 'none' }}>
              View All →
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={card}>Loading appointments...</div>
        ) : list.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: C.muted }}>No appointments scheduled for today.</div>
        ) : (
          list.map((a, idx) => {
            const pName = a.patient_name || a.patient?.full_name || `Patient #${a.id ?? idx + 1}`;
            const stKey = (a.status || 'pending').toLowerCase();
            const st = STATUS_UI[stKey] || STATUS_UI.pending;
            const isOnline = a.consultation_type === 'online';
            const tStr = a.start_time ? to12(hhmm(a.start_time)) : '09:30 AM';
            return (
              <div key={a.id ?? idx} style={{ ...card, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar
                    bare
                    src={a.patient?.avatar_url}
                    name={pName}
                    style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: C.primaryFixed, color: C.primary, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0, objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 15, color: C.text }}>{pName}</strong>
                      <span style={pill(C.low, C.muted)}>{isOnline ? 'Online' : 'In-person'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                      <i className="fa-regular fa-clock" /> {tStr} • {a.duration_minutes || profile?.slot_duration_minutes || 30} mins • {a.note || a.reason || (isOnline ? 'Tele-consult Link Prepared' : 'Consultation Room')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={pill(st.bg, st.color)}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: st.dot }} />
                    {stKey}
                  </span>
                  <Link to="/doctor-dashboard/manage-appointments" style={{ ...btn(C.low, C.text, { border: `1px solid ${C.border}`, textDecoration: 'none', padding: '8px 14px', fontSize: 13 }) }}>
                    {stKey === 'pending' ? 'Review' : 'View Details'}
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Right: Daily Capacity & Clinic */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong style={{ fontSize: 16, color: C.text }}>Daily Capacity</strong>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.primary }}>{bookedCount} / {totalSlots} SLOTS</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 58, height: 58, borderRadius: '50%', border: `5px solid ${C.primary}`, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, color: C.text, flexShrink: 0 }}>
              {pct}%
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{remaining} Slots Remaining</div>
              <div style={{ fontSize: 12, color: C.muted }}>Synchronized with active schedule</div>
            </div>
          </div>

          <div style={{ backgroundColor: C.low, padding: '10px 12px', borderRadius: 10, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, color: C.text }}>09:00 AM - 12:00 PM</span>
            <span style={{ color: C.muted }}>Morning Block</span>
          </div>
          <div style={{ backgroundColor: C.low, padding: '10px 12px', borderRadius: 10, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, color: C.text }}>02:00 PM - 05:00 PM</span>
            <span style={{ color: C.muted }}>Afternoon Block</span>
          </div>
        </div>

        <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.primaryFixed, color: C.primary, display: 'grid', placeItems: 'center', fontWeight: 700 }}>+</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{profile?.clinic?.name || 'Clinika Medical Center'}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{profile?.clinic?.address || profile?.room || 'Consultation Suite'}</div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            Need to adjust working days or consultation durations? Updates sync with booking slots.
          </p>
          <Link to="/doctor-dashboard/manage-availability" style={{ ...btn(C.low, C.primary, { border: `1px solid ${C.border}`, textDecoration: 'none', textAlign: 'center', fontSize: 13 }) }}>
            <i className="fa-regular fa-clock" /> Update Time Slots
          </Link>
        </div>
      </aside>
    </div>
  );
}