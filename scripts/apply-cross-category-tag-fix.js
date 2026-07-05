const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
  max: 1,
});

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'fix-cross-category-event-tags.sql'), 'utf8');
  const client = await pool.connect();
  const result = await client.query(sql);
  console.log('Deleted cross-category EventTag rows:', result.rowCount);

  const check = await client.query(`
    select e.slug, c.title as category, array_agg(t.title order by t.title) as tags
    from "Event" e
    join "Category" c on c.id = e."categoryId"
    left join "EventTag" et on et."eventId" = e.id
    left join "Tag" t on t.id = et."tagId"
    where e.slug like '%6982271abd13bec4b245abc9%'
    group by e.slug, c.title
  `);
  console.log('Anna-Elza event:', JSON.stringify(check.rows[0] || null));

  client.release();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
