import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    if (typeof message === 'object' && message !== null) {
      type = message.type || type;
      message = message.message || message.title || 'Notification';
    }
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, message, type }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);


  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 11000 }}>
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast show text-bg-${toast.type === 'error' ? 'danger' : toast.type}`} role="status">
            <div className="d-flex">
              <div className="toast-body">{toast.message}</div>
              <button className="btn-close btn-close-white me-2 m-auto" type="button" onClick={() => dismiss(toast.id)} aria-label="Close" />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
