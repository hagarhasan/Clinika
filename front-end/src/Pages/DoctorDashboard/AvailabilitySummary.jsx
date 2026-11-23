import { useDoctorData, drName, initials, C, card, pill } from './DoctorDashboard';

const DAY_BARS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function AvailabilitySummary({ activeClinic, stats, duration }) {
  const { user, profile } = useDoctorData();
  const name = drName(user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Doctor');
  const specialty = profile?.specialty?.name || 'General Practice';
  const avatar = profile?.avatar_url || user?.avatar_url || '';
  const rating = profile?.rating ?? profile?.average_rating ?? '4.92';
  const reviewsCount = profile?.reviews_count ?? profile?.total_reviews ?? 1280;
  const maxSlots = Math.max(1, ...(stats?.perDay || []).map((d) => d.slots || 0));

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Doctor & Configuring Clinic Card */}
      <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatar ? (
              <img src={avatar} alt={name} style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: C.secondary, color: C.primary, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 16 }}>
                {initials(name) || 'DR'}
              </div>
            )}
            <span
              style={{
                position: 'absolute', right: -3, bottom: -3, width: 14, height: 14,
                borderRadius: '50%', backgroundColor: C.primary, border: `2px solid ${C.white}`,
              }}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{specialty}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, marginTop: 4 }}>
              <i className="fa-solid fa-star" style={{ color: '#f59e0b', fontSize: 11 }} />
              <strong style={{ color: C.text }}>{rating}</strong>
              <span style={{ color: C.muted }}>({Number(reviewsCount).toLocaleString()} reviews)</span>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: C.low, padding: '12px 14px', borderRadius: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
          }}
        >
          <div>
            <div style={{ color: C.muted, fontSize: 11 }}>Configuring Clinic</div>
            <strong style={{ color: C.text, fontSize: 13 }}>{activeClinic?.name}</strong>
          </div>
          <i className="fa-regular fa-building" style={{ color: C.primary, fontSize: 16 }} />
        </div>
      </div>

      {/* Live Schedule Capacity & Weekly Slot Allocation */}
      <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 15, color: C.text }}>
            <i className="fa-solid fa-gauge-high" style={{ color: C.primary, marginRight: 8 }} />
            Live Schedule Capacity
          </strong>
          <span style={pill(C.primaryFixed, C.primary)}>Calculated</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ backgroundColor: C.low, padding: 12, borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: C.muted }}>Weekly Consulting</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 4 }}>{stats.weeklyHrs} hrs</div>
            <div style={{ fontSize: 11, color: C.primary, fontWeight: 600, marginTop: 2 }}>Across {stats.activeCount} days</div>
          </div>
          <div style={{ backgroundColor: C.low, padding: 12, borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: C.muted }}>Available Daily</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 4 }}>~{stats.avgDailySlots} Slots</div>
            <div style={{ fontSize: 11, color: C.primary, fontWeight: 600, marginTop: 2 }}>At {duration}m / patient</div>
          </div>
        </div>

        <div style={{ backgroundColor: C.low, padding: 14, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
            <strong style={{ color: C.text }}>Weekly Slot Allocation</strong>
            <strong style={{ color: C.primary }}>{stats.totalSlots} Slots / Week</strong>
          </div>

          <div
            style={{
              height: 78, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8,
              alignItems: 'end', padding: '8px 4px', borderBottom: `1px dashed ${C.border}`,
            }}
          >
            {(stats?.perDay || []).map((d, idx) => {
              const pct = d.active && d.slots > 0 ? Math.max(14, Math.round((d.slots / maxSlots) * 100)) : 8;
              return (
                <div key={d.day_of_week ?? idx} style={{ height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div
                    style={{
                      width: '100%', maxWidth: 24, height: `${pct}%`, borderRadius: 5,
                      backgroundColor: d.active && d.slots > 0 ? C.primary : C.container,
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center', fontSize: 11, color: C.muted, fontWeight: 600 }}>
            {DAY_BARS.map((ch, i) => (
              <span key={i}>{ch}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Clinika Schedule Policies */}
      <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <strong style={{ fontSize: 15, color: C.text }}>
          <i className="fa-solid fa-shield-halved" style={{ color: C.primary, marginRight: 8 }} />
          Clinika Schedule Policies
        </strong>
        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          <i className="fa-solid fa-check" style={{ color: C.primary, marginTop: 3, flexShrink: 0 }} />
          <span>Patients cannot book within 2 hours of current time to prevent last-minute clinic disruption.</span>
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          <i className="fa-solid fa-check" style={{ color: C.primary, marginTop: 3, flexShrink: 0 }} />
          <span>Modifications to active slots take effect immediately for upcoming patient searches.</span>
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          <i className="fa-solid fa-check" style={{ color: C.primary, marginTop: 3, flexShrink: 0 }} />
          <span>Pre-existing patient appointments are preserved during slot reconfigurations.</span>
        </div>
      </div>
    </aside>
  );
}