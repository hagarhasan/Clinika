// The backend sends dates as "YYYY-MM-DD" and times as "HH:MM:SS" (plain strings).
// We split them by hand instead of using new Date("YYYY-MM-DD"), which can show the
// wrong day depending on the visitor's timezone.

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return String(dateStr);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return String(timeStr);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export function getInitials(fullName) {
  if (!fullName) return '?';
  return fullName
    .replace(/^dr\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
