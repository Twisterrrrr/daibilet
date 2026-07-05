const { Pool } = require('pg');
const fs = require('fs');

for (const line of fs.readFileSync('/opt/daibilet/.env', 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq <= 0) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
  if (!process.env[key]) process.env[key] = value;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const terms = ['К2', 'Arbat', 'Арбат', 'Круиз', 'Владимирский', 'ученых'];

(async () => {
  for (const term of terms) {
    const { rows } = await pool.query(
      `select id, title, kind, address from "Venue" where title ilike $1 limit 5`,
      [`%${term}%`],
    );
    if (rows.length) {
      console.log(`\n${term}:`);
      for (const row of rows) console.log(`  ${row.id} | ${row.kind} | ${row.title} | ${row.address || ''}`);
    }
  }
  await pool.end();
})();
