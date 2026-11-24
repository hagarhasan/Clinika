import { useState, useEffect, useCallback } from "react";

let toastCounter = 0;

export default function ToastNotification() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = toast.id || (++toastCounter);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  useEffect(() => {
    // Check for pending toast stored before navigation (e.g., from Login)
    try {
      const stored = sessionStorage.getItem("pending_toast");
      if (stored) {
        sessionStorage.removeItem("pending_toast");
        const parsed = JSON.parse(stored);
        addToast(parsed);
      }
    } catch {
      // ignore
    }

    // Listen for custom app-toast events
    const handleToastEvent = (e) => {
      if (e.detail) {
        addToast(e.detail);
      }
    };

    window.addEventListener("app-toast", handleToastEvent);
    return () => {
      window.removeEventListener("app-toast", handleToastEvent);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container position-fixed top-0 end-0 p-3"
      style={{ zIndex: 999999, pointerEvents: "none" }}
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isDanger = toast.type === "danger" || toast.type === "error";
        const accentColor = isSuccess ? "#059669" : isDanger ? "#dc2626" : "#2164f5";
        const bgIconColor = isSuccess ? "#ecfdf5" : isDanger ? "#fef2f2" : "#eff6ff";

        return (
          <div
            key={toast.id}
            className="toast show shadow-lg border-0 mb-3"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            style={{
              pointerEvents: "auto",
              minWidth: "320px",
              maxWidth: "400px",
              borderRadius: "14px",
              backgroundColor: "#ffffff",
              borderLeft: `5px solid ${accentColor}`,
              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.15)",
            }}
          >
            <div className="toast-header bg-white border-bottom-0 pt-3 pb-1 px-3 d-flex align-items-center">
              <span
                className="d-inline-flex align-items-center justify-content-center me-2 flex-shrink-0"
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  backgroundColor: bgIconColor,
                  color: accentColor,
                }}
              >
                {isSuccess ? (
                  <i className="fa-solid fa-check" style={{ fontSize: "12px" }}></i>
                ) : isDanger ? (
                  <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "12px" }}></i>
                ) : (
                  <i className="fa-solid fa-arrow-right-from-bracket" style={{ fontSize: "12px" }}></i>
                )}
              </span>

              <strong
                className="me-auto"
                style={{
                  color: "#0f172a",
                  fontSize: "14px",
                  fontWeight: "700",
                }}
              >
                {toast.title}
              </strong>

              <small className="text-muted" style={{ fontSize: "11px" }}>
                Just now
              </small>

              <button
                type="button"
                className="btn-close ms-2"
                onClick={() => removeToast(toast.id)}
                aria-label="Close"
                style={{ fontSize: "11px" }}
              ></button>
            </div>

            <div
              className="toast-body bg-white pt-1 pb-3 px-3"
              style={{
                color: "#475569",
                fontSize: "13.5px",
                lineHeight: "1.45",
              }}
            >
              {toast.message}
            </div>
          </div>
        );
      })}
    </div>
  );
}
