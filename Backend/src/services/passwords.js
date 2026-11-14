'use strict';
const { query, exec, insert } = require('../db');
const { generateResetToken } = require('../security');

async function issueResetToken(c, user, minutes) {
  const now = new Date();
  await exec('UPDATE password_reset_tokens SET used_at = $1 WHERE user_id = $2 AND used_at IS NULL', [now, user.id], c);
  const [raw, hashed] = generateResetToken();
  await insert(
    'password_reset_tokens',
    { user_id: user.id, token_hash: hashed, expires_at: new Date(now.getTime() + minutes * 60000), created_at: now },
    c
  );
  return raw;
}

module.exports = { issueResetToken };
