'use strict';
const { Pool, types } = require('pg');
const settings = require('./config');

types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1083, (v) => v);
types.setTypeParser(1700, (v) => parseFloat(v));

function poolConfig(rawUrl) {
  let url = rawUrl;
  if (url.startsWith('postgres://')) url = 'postgresql://' + url.slice('postgres://'.length);
  const u = new URL(url);
  const sslmode = u.searchParams.get('sslmode');
  u.searchParams.delete('sslmode');
  u.searchParams.delete('channel_binding');
  const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname);
  const ssl = sslmode === 'disable' ? false : sslmode || !local ? true : false;
  return {
    connectionString: u.toString(),
    ssl,
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  };
}

let _pool;
function getPool() {
  if (!_pool) {
    if (!settings.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    _pool = new Pool(poolConfig(settings.DATABASE_URL));
    _pool.on('error', (e) => console.error('pg pool error:', e.message));
  }
  return _pool;
}

async function query(sql, params = [], c) {
  const r = await (c || getPool()).query(sql, params);
  return r.rows;
}
async function one(sql, params = [], c) {
  return (await query(sql, params, c))[0] || null;
}
async function scalar(sql, params = [], c) {
  const r = await one(sql, params, c);
  return r ? Object.values(r)[0] : null;
}

async function exec(sql, params = [], c) {
  return (c || getPool()).query(sql, params);
}

async function tx(fn) {
  const c = await getPool().connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    try {
      await c.query('ROLLBACK');
    } catch (_) {
      /* ignore */
    }
    throw e;
  } finally {
    c.release();
  }
}

async function insert(table, data, c) {
  const cols = Object.keys(data);
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`;
  return (await query(sql, cols.map((k) => data[k]), c))[0];
}

async function update(table, id, data, c) {
  const cols = Object.keys(data);
  if (!cols.length) return one(`SELECT * FROM ${table} WHERE id = $1`, [id], c);
  const sets = cols.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const sql = `UPDATE ${table} SET ${sets} WHERE id = $${cols.length + 1} RETURNING *`;
  return (await query(sql, [...cols.map((k) => data[k]), id], c))[0];
}

class Params {
  constructor() {
    this.list = [];
  }
  add(v) {
    this.list.push(v);
    return `$${this.list.length}`;
  }
}

const isUniqueViolation = (e) => e && e.code === '23505';
const json = (v) => (v === undefined || v === null ? null : JSON.stringify(v));

module.exports = { getPool, query, one, scalar, exec, tx, insert, update, Params, isUniqueViolation, json, poolConfig };
