/** Clickable 1-5 star input. Use `readOnly` to just display a value. */
export default function StarRating({ value = 0, onChange, readOnly = false, size = 22 }) {
  return (
    <div className="d-inline-flex gap-1" role={readOnly ? 'img' : 'radiogroup'} aria-label={`Rating: ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const icon = <i className={`${filled ? 'fa-solid' : 'fa-regular'} fa-star`} style={{ fontSize: size, color: filled ? '#f5a524' : '#9aa3b2' }} />;
        return readOnly ? (
          <span key={n}>{icon}</span>
        ) : (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="btn btn-link p-0 border-0"
            onClick={() => onChange?.(n)}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
