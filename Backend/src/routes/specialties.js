'use strict';
const express = require('express');
const { HttpError } = require('../errors');
const { query, one, scalar, exec, insert, update, isUniqueViolation } = require('../db');
const { ah, requireRoles } = require('../middleware/auth');
const { parseBody } = require('../utils/validate');
const { pathInt } = require('../utils/params');
const S = require('../schemas');

const router = express.Router();
const adminOnly = requireRoles('admin');
const out = (s) => ({ id: s.id, name: s.name, description: s.description ?? null });
const notFound = () => new HttpError(404, 'Specialty not found');

router.get('/', ah(async (_req, res) => {
  res.json((await query('SELECT id, name, description FROM specialties ORDER BY name')).map(out));
}));

router.get('/:specialty_id', ah(async (req, res) => {
  const s = await one('SELECT id, name, description FROM specialties WHERE id = $1', [pathInt(req, 'specialty_id')]);
  if (!s) throw notFound();
  res.json(out(s));
}));

router.post('/', adminOnly, ah(async (req, res) => {
  const p = parseBody(S.SpecialtyIn, req.body);
  try {
    res.status(201).json(out(await insert('specialties', { name: p.name, description: p.description ?? null })));
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'Specialty already exists');
    throw e;
  }
}));

router.put('/:specialty_id', adminOnly, ah(async (req, res) => {
  const id = pathInt(req, 'specialty_id');
  const p = parseBody(S.SpecialtyIn, req.body);
  if (!(await scalar('SELECT id FROM specialties WHERE id = $1', [id]))) throw notFound();
  try {
    res.json(out(await update('specialties', id, { name: p.name, description: p.description ?? null })));
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'Specialty name already exists');
    throw e;
  }
}));

router.delete('/:specialty_id', adminOnly, ah(async (req, res) => {
  const id = pathInt(req, 'specialty_id');
  if (!(await scalar('SELECT id FROM specialties WHERE id = $1', [id]))) throw notFound();
  if (await scalar('SELECT id FROM doctors WHERE specialty_id = $1 LIMIT 1', [id])) {
    throw new HttpError(400, 'Cannot delete a specialty that has doctors');
  }
  await exec('DELETE FROM specialties WHERE id = $1', [id]);
  res.status(204).end();
}));

module.exports = router;
