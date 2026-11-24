export default function EmptyState({ title = 'Nothing to show', message = '', action }) {
  return (
    <div className="text-center py-5 px-3">
      <h3 className="h6 mb-2">{title}</h3>
      {message && <p className="text-secondary mb-3">{message}</p>}
      {action}
    </div>
  );
}
