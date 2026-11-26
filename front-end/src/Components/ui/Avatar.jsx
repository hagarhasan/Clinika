import { useEffect, useState } from 'react';

// "Dr. Ahmed Hassan" and "د. أحمد حسن" should give "AH" / "أح", not "DA".
const TITLE = /^(dr|doctor|prof|mr|mrs|ms|د|دكتور|دكتورة)\.?\s+/i;

/** Two letters for people without a photo: first letters of the first two words, or the first two letters of a single word. */
export function avatarInitials(name = '') {
  const words = String(name || '').trim().replace(TITLE, '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const letters = (word) => Array.from(word);
  const pair = words.length === 1
    ? letters(words[0]).slice(0, 2)
    : [letters(words[0])[0], letters(words[1])[0]];
  return pair.join('').toUpperCase();
}

/**
 * One avatar for the whole app: the user's photo when there is one (and it loads),
 * otherwise their initials.
 *
 * - `size`: '' (40px) | 'sm' | 'lg' (uses the cl-pd-avatar classes)
 * - `bare`: skip the cl-pd-avatar classes and use only `className` / `style` (for custom layouts)
 */
export default function Avatar({ src, name = '', size = '', bare = false, className = '', style, alt = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  const classes = bare
    ? className
    : ['cl-pd-avatar', size ? `cl-pd-avatar--${size}` : '', className].filter(Boolean).join(' ');

  if (src && !failed) {
    return <img className={classes} src={src} alt={alt} style={style} onError={() => setFailed(true)} />;
  }
  return <span className={classes} style={style} aria-hidden="true">{avatarInitials(name)}</span>;
}
