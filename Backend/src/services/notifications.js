'use strict';
const { insert, query } = require('../db');

const notify = (c, userId, title, message, type = 'general') =>
  insert('notifications', { user_id: userId, title, message, type, is_read: false, created_at: new Date() }, c);

const audit = (c, user, action, entityType, entityId) =>
  insert('audit_logs', { user_id: user.id, action, entity_type: entityType, entity_id: entityId ?? null, created_at: new Date() }, c);

const logActivity = (c, actorUserId, action, entityType, entityId, description) =>
  insert(
    'activity_logs',
    {
      actor_user_id: actorUserId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      description: String(description).slice(0, 255),
      created_at: new Date(),
    },
    c
  );

async function notifyAdmins(c, title, message, type = 'general') {
  const admins = await query("SELECT id FROM users WHERE role = 'admin' AND is_active = true", [], c);
  for (const a of admins) await notify(c, a.id, title, message, type);
}

module.exports = { notify, audit, logActivity, notifyAdmins };
