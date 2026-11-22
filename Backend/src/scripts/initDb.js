'use strict';

const fs = require('fs');
const path = require('path');
const { getPool } = require('../db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
  await getPool().query(sql);
  console.log('Tables created successfully.');
  await getPool().end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
