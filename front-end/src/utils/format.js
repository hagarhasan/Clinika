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
  return `${String(hour % 12 || 12).padStart(2, '0')}:${minutes} ${hour < 12 ? 'AM' : 'PM'}`;
};

export const formatCurrency = (value, currency = 'EGP') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value) || 0);

export const formatName = (name = '') =>
  String(name).replace(/\b(dr\.?|doctor|prof\.?|professor)\b/i, '').replace(/\s+/g, ' ').trim();

export const getInitials = (name = '') =>
  String(name).trim().split(/\s+/).filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
