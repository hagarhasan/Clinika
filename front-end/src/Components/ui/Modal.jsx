import { useEffect } from 'react';

/** Shared centered modal (Bootstrap look). Closes on Escape / backdrop click unless `busy`. */
export default function Modal({ title, onClose, children, footer, size = '', busy = false }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, busy]);

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 10500 }} />
      <div
        className="modal fade show d-block"
        style={{ zIndex: 10510 }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) onClose?.();
        }}
      >
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5">{title}</h2>
              <button type="button" className="btn-close" onClick={onClose} disabled={busy} aria-label="Close" />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
