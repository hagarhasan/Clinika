'use strict';
const express = require('express');
const { HttpError } = require('../errors');
const { query: dbq, scalar, exec, insert, update, Params } = require('../db');
const { ah, requireRoles } = require('../middleware/auth');
const { parseBody } = require('../utils/validate');
const { query, pathInt } = require('../utils/params');
const { pick } = require('../utils/helpers');
const S = require('../schemas');
const { CLINIC_FIELDS, clinicOut } = require('../repo');
const { validateImageUrl } = require('../services/storage');

const router = express.Router();
const adminOnly = requireRoles('admin');
const COLS = CLINIC_FIELDS.join(', ');
const FIELDS = ['address', 'city', 'district', 'phone', 'email', 'description', 'latitude', 'longitude', 'photo_url', 'parking_info'];
const notFound = () => new HttpError(404, 'Clinic not found');

router.get('/', ah(async (req, res) => {
  const q = query(req);
  const city = q.str('city');
  const district = q.str('district');
  const search = q.str('q');
  const limit = q.int('limit', { def: 50, ge: 1, le: 100 });
  const offset = q.int('offset', { def: 0, ge: 0 });
  q.done();

  const p = new Params();
  const where = ['is_active = true'];
  if (city) where.push(`city ILIKE ${p.add(`%${city}%`)}`);
  if (district) where.push(`district ILIKE ${p.add(`%${district}%`)}`);
  if (search) where.push(`name ILIKE ${p.add(`%${search}%`)}`);
  const rows = await dbq(`SELECT ${COLS} FROM clinics WHERE ${where.join(' AND ')} ORDER BY name LIMIT ${limit} OFFSET ${offset}`, p.list);
  res.json(rows.map(clinicOut));
}));

router.get('/:clinic_id', ah(async (req, res) => {
  const rows = await dbq(`SELECT ${COLS} FROM clinics WHERE id = $1`, [pathInt(req, 'clinic_id')]);
  if (!rows.length) throw notFound();
  res.json(clinicOut(rows[0]));
}));

router.post('/', adminOnly, ah(async (req, res) => {
  const p = parseBody(S.ClinicIn, req.body);
  const data = { name: p.name, is_active: true };
  for (const f of FIELDS) data[f] = p[f] ?? null;
  data.photo_url = validateImageUrl(p.photo_url);
  res.status(201).json(clinicOut(await insert('clinics', data)));
}));

router.put('/:clinic_id', adminOnly, ah(async (req, res) => {
  const id = pathInt(req, 'clinic_id');
  const p = parseBody(S.ClinicUpdate, req.body);
  if (!(await scalar('SELECT id FROM clinics WHERE id = $1', [id]))) throw notFound();
  const patch = pick(p, ['name', 'is_active', ...FIELDS]);
  // name / is_active مينفعش يبقوا null (NOT NULL)
  for (const k of ['name', 'is_active']) if (patch[k] === null) delete patch[k];
  if ('photo_url' in patch) patch.photo_url = validateImageUrl(patch.photo_url);
  res.json(clinicOut(await update('clinics', id, patch)));
}));

router.delete('/:clinic_id', adminOnly, ah(async (req, res) => {
  const id = pathInt(req, 'clinic_id');
  if (!(await scalar('SELECT id FROM clinics WHERE id = $1', [id]))) throw notFound();
  if (await scalar('SELECT id FROM doctors WHERE clinic_id = $1 LIMIT 1', [id])) {
    await exec('UPDATE clinics SET is_active = false WHERE id = $1', [id]);
  } else {
    await exec('DELETE FROM clinics WHERE id = $1', [id]);
  }
  res.status(204).end();
}));

module.exports = router;
