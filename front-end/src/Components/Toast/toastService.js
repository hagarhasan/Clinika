/**
 * Helper to dispatch toast notifications throughout the application.
 */
export const showToast = ({ type = "success", title = "Notification", message = "" }) => {
  const payload = {
    id: Date.now() + Math.random(),
    type,
    title,
    message,
  };
  window.dispatchEvent(new CustomEvent("app-toast", { detail: payload }));
};

export const setPendingToast = ({ type = "success", title = "Notification", message = "" }) => {
  try {
    sessionStorage.setItem(
      "pending_toast",
      JSON.stringify({ type, title, message, id: Date.now() + Math.random() })
    );
  } catch {
    // ignore sessionStorage errors
  }
};
