export const formatDate = (value, options = {}) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...options });
};

export const formatTime = (value) => {
  if (!value) return '';
  const [hours = '00', minutes = '00'] = String(value).slice(0, 5).split(':');
  const hour = Number(hours);
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${hour < 12 ? 'AM' : 'PM'}`;
};

export const formatAvailability = (nextAvailable) => {
  if (!nextAvailable) {
    return 'Available upon request';
  }

  if (typeof nextAvailable === 'string') {
    return nextAvailable;
  }

  const appointment_date =
    nextAvailable.appointment_date ||
    nextAvailable.appointmentDate ||
    nextAvailable.date;

  const start_time =
    nextAvailable.start_time ||
    nextAvailable.startTime ||
    nextAvailable.time;

  if (!appointment_date && !start_time) {
    return 'Available upon request';
  }

  let dateText = '';

  if (appointment_date) {
    try {
      const today = new Date();
      const [year, month, day] = String(appointment_date).slice(0, 10).split('-').map(Number);
      const apptDate = new Date(year, month - 1, day);
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diffDays = Math.round((apptDate - todayDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        dateText = 'Today';
      } else if (diffDays === 1) {
        dateText = 'Tomorrow';
      } else if (diffDays > 1 && diffDays < 7) {
        dateText = apptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      } else {
        dateText = apptDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: apptDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        });
      }
    } catch {
      dateText = String(appointment_date);
    }
  }

  const timeText = start_time ? formatTime(start_time) : '';

  if (dateText && timeText) {
    return `${dateText} · ${timeText}`;
  }
  return dateText || timeText || 'Available upon request';
};

export const formatCurrency = (value, currency = 'EGP') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value) || 0);

export const formatName = (name = '') =>
  String(name)
    .replace(/^(?:\s*(?:dr|doctor|prof|professor)\.?)+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

export const getInitials = (name = '') =>
  String(name).trim().split(/\s+/).filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
