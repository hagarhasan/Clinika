'use strict';

const fs = require('fs');
const path = require('path');

function buildMigration(sqlText) {
  const creates = [];
  const alters = [];
  const indexes = [];
  for (const raw of sqlText.split(/;\s*\n/)) {
    const stmt = raw.replace(/^(\s*--.*\n)+/g, '').trim();
    if (!stmt) continue;
    if (/^CREATE TABLE/i.test(stmt)) {
      creates.push(stmt);
      const table = /CREATE TABLE IF NOT EXISTS (\w+)/i.exec(stmt)[1];
      const body = stmt.slice(stmt.indexOf('(') + 1, stmt.lastIndexOf(')'));
      for (const line of body.split('\n')) {
        const l = line.trim().replace(/,$/, '');
        if (!l || /^(CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN)\b/i.test(l)) continue;
        const col = l.split(/\s+/)[0];
        if (col === 'id') continue;
        const def = /NOT NULL/i.test(l) && !/DEFAULT/i.test(l) ? l.replace(/\s*NOT NULL/i, '') : l;
        alters.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${def}`);
      }
    } else if (/^CREATE (UNIQUE )?INDEX/i.test(stmt)) indexes.push(stmt);
  }
  return { creates, alters, indexes };
}

async function run() {
  const { getPool } = require('../db');
  const sql = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
  const { creates, alters, indexes } = buildMigration(sql);
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const s of creates) await client.query(s);
    let added = 0;
    for (const s of alters) {
      const col = /ADD COLUMN IF NOT EXISTS (\w+)/.exec(s)[1];
      const table = /ALTER TABLE (\w+)/.exec(s)[1];
      const before = await client.query('SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2', [table, col]);
      await client.query(s);
      if (!before.rowCount) {
        added++;
        console.log(`  + added column ${table}.${col}`);
      }
    }
    for (const s of indexes) {
      try {
        await client.query('SAVEPOINT idx');
        await client.query(s);
        await client.query('RELEASE SAVEPOINT idx');
      } catch (e) {
        await client.query('ROLLBACK TO SAVEPOINT idx');
        console.log(`  ! skipped index: ${e.message}`);
      }
    }
    await client.query('COMMIT');
    console.log(added ? `Done. ${added} column(s) added.` : 'Database is already up to date.');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  run().catch((e) => {
    console.error('Migration failed:', e.message);
    process.exit(1);
  });
}
module.exports = { buildMigration };
