'use strict';
// رفع الصور على Cloudinary (Vercel مفيهوش تخزين ثابت)
const crypto = require('crypto');
const settings = require('../config');
const { HttpError } = require('../errors');

function detectImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

async function uploadImage(buf, folder) {
  if (!settings.cloudinaryEnabled) throw new HttpError(503, 'Image uploads are not configured');
  if (buf.length > settings.MAX_UPLOAD_MB * 1024 * 1024) throw new HttpError(413, `Image is larger than ${settings.MAX_UPLOAD_MB} MB`);
  if (!detectImageType(buf)) throw new HttpError(400, 'Only JPEG, PNG or WebP images are allowed');

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${settings.CLOUDINARY_API_SECRET}`, 'utf8')
    .digest('hex');
  const form = new FormData();
  form.append('api_key', settings.CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);
  form.append('file', new Blob([buf]), 'upload');

  let r;
  try {
    r = await fetch(`https://api.cloudinary.com/v1_1/${settings.CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(20000),
    });
  } catch (_) {
    throw new HttpError(502, 'Image upload failed');
  }
  if (r.status >= 300) throw new HttpError(502, 'Image upload failed');
  const body = await r.json();
  return { url: body.secure_url, public_id: body.public_id ?? null };
}

function validateImageUrl(url) {
  if (!url) return null;
  if (!settings.cloudinaryEnabled) throw new HttpError(400, 'Image uploads are not configured');
  if (!url.startsWith(`https://res.cloudinary.com/${settings.CLOUDINARY_CLOUD_NAME}/`)) {
    throw new HttpError(400, 'Image URL must come from the Clinika image upload');
  }
  return url;
}

module.exports = { detectImageType, uploadImage, validateImageUrl };
