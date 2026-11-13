'use strict';
const express = require('express');
const { HttpError } = require('../errors');
const { query: dbq, one, scalar, exec, Params } = require('../db');
const { ah, auth } = require('../middleware/auth');
const { query, pathInt } = require('../utils/params');

const router = express.Router();
const COLS = 'id, user_id, title, message, type, is_read, created_at';
const out = (n) => ({ id: n.id, title: n.title, message: n.message, type: n.type, is_read: n.is_read, created_at: n.created_at });

router.get('/', auth, ah(async (req, res) => {
  const q = query(req);
  const unreadOnly = q.bool('unread_only', { def: false });
  const limit = q.int('limit', { def: 30, ge: 1, le: 100 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();
  const p = new Params();
  const where = [`user_id = ${p.add(req.user.id)}`];
  if (unreadOnly) where.push('is_read = false');
  const rows = await dbq(`SELECT ${COLS} FROM notifications WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`, p.list);
  res.json(rows.map(out));
}));

router.get('/unread-count', auth, ah(async (req, res) => {
  const n = await scalar('SELECT COUNT(id) FROM notifications WHERE user_id = $1 AND is_read = false', [req.user.id]);
  res.json({ unread: n || 0 });
}));

router.patch('/read-all', auth, ah(async (req, res) => {
  await exec('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [req.user.id]);
  res.status(204).end();
}));

router.patch('/:notification_id/read', auth, ah(async (req, res) => {
  const id = pathInt(req, 'notification_id');
  const obj = await one(`SELECT ${COLS} FROM notifications WHERE id = $1`, [id]);
  if (!obj || obj.user_id !== req.user.id) throw new HttpError(404, 'Notification not found');
  await exec('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
  res.json(out({ ...obj, is_read: true }));
}));

router.delete('/:notification_id', auth, ah(async (req, res) => {
  const id = pathInt(req, 'notification_id');
  const obj = await one('SELECT id, user_id FROM notifications WHERE id = $1', [id]);
  if (!obj || obj.user_id !== req.user.id) throw new HttpError(404, 'Notification not found');
  await exec('DELETE FROM notifications WHERE id = $1', [id]);
  res.status(204).end();
}));

module.exports = router;
