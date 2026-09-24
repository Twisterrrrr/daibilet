import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(new URL('../packages/db/package.json', import.meta.url));
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  const { rows } = await pool.query('SELECT id, slug, title AS name, kind::text AS type, "canonicalPath" FROM "Venue" ORDER BY id');
  writeFileSync(process.argv[2], JSON.stringify(rows));
  console.log(JSON.stringify({ exported: rows.length }));
} finally { await pool.end(); }
