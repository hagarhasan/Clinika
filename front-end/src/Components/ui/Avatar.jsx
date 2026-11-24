import { getInitials } from '../../utils/format.js';

export default function Avatar({ src, name, size = 40 }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.32) };
  if (src) return <img src={src} alt={name || 'User'} className="rounded-circle object-fit-cover" style={style} />;
  return (
    <span className="rounded-circle d-inline-flex align-items-center justify-content-center bg-primary text-white fw-bold" style={style}>
      {getInitials(name) || 'U'}
    </span>
  );
}
