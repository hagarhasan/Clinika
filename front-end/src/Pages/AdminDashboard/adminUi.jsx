import { useEffect, useState } from 'react';
import SharedAvatar from '../../Components/ui/Avatar';

// Small pieces shared by the admin pages.

export function Avatar({ name, src }) {
  return <SharedAvatar name={name} src={src} />;
}

export function Banner({ banner, onClose }) {
  if (!banner?.text) return null;
  return (
    <div className={`cl-ad-banner ${banner.type === 'error' ? 'cl-ad-banner--error' : ''}`} role={banner.type === 'error' ? 'alert' : 'status'}>
      <span>{banner.text}</span>
      <button type="button" aria-label="Dismiss" onClick={onClose}>×</button>
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="cl-ad-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="cl-ad-modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

// 1 2 3 … 12 style page list.
function pageList(current, last) {
  if (last <= 6) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set([1, 2, 3, last, current]);
  const list = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out = [];
  list.forEach((p, i) => {
    if (i && p - list[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

export function Pager({ page, pageSize, total, onChange }) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="cl-ad-pager" aria-label="Pagination">
      <button type="button" className="cl-ad-page" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      {pageList(page, last).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`cl-ad-page ${p === page ? 'is-active' : ''}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button type="button" className="cl-ad-page" disabled={page >= last} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}

export const showingRange = (page, pageSize, total, shown) => {
  if (!total || !shown) return [0, 0];
  const from = (page - 1) * pageSize + 1;
  return [from, from + shown - 1];
};

// Small debounce hook for search boxes.
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatShortDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
