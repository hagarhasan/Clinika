'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const settings = require('./config');

const hashPassword = (password) => bcrypt.hashSync(password, 12);
function verifyPassword(password, hashed) {
  try {
    return bcrypt.compareSync(password, hashed);
  } catch (_) {
    return false;
  }
}

function createAccessToken(userId, role, tokenVersion = 0, expiresMinutes) {
  const minutes = expiresMinutes || settings.ACCESS_TOKEN_EXPIRE_MINUTES;
  return jwt.sign({ sub: String(userId), role, tv: tokenVersion }, settings.SECRET_KEY, {
    algorithm: settings.JWT_ALGORITHM,
    expiresIn: minutes * 60,
  });
}
function decodeAccessToken(token) {
  try {
    return jwt.verify(token, settings.SECRET_KEY, { algorithms: [settings.JWT_ALGORITHM] });
  } catch (_) {
    return null;
  }
}

const hashToken = (raw) => crypto.createHash('sha256').update(raw, 'utf8').digest('hex');

function generateResetToken() {
  const raw = crypto.randomBytes(32).toString('base64url');
  return [raw, hashToken(raw)];
}

module.exports = { hashPassword, verifyPassword, createAccessToken, decodeAccessToken, hashToken, generateResetToken };
