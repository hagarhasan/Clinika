import { formatTime } from "../../utils/format";

export default function SlotPicker({ slots = [], value, onChange, loading = false }) {
  if (loading) return <div className="placeholder-glow"><span className="placeholder col-12" /></div>;
  if (!slots.length) return <p className="cl-pd-muted">No available slots for this date.</p>;
  return (
    <div className="d-flex flex-wrap gap-2" role="radiogroup" aria-label="Available appointment slots">
      {slots.filter((slot) => slot.is_available !== false).map((slot) => {
        const key = `${slot.start_time}-${slot.end_time}`;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={value === key}
            key={key}
            className={`cl-pd-tab ${value === key ? 'is-active' : ''}`}
            onClick={() => onChange(slot)}
          >
            {formatTime(slot.start_time)}
          </button>
        );
      })}
    </div>
  );
}
