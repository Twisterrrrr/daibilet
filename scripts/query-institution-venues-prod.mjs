import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const patterns = [
  'исаакиев',
  'петропавлов',
  'петергоф',
  'кунсткамер',
  'русск.*музе',
  'мариинск',
  'юсупов',
  'екатеринин',
  'царск.*сел',
  'павловск',
  'спас.*кров',
  'казанск.*собор',
  'михайловск.*замок',
  'шеремет',
  'кремл',
  'вднх',
  'зоопарк',
  'третьяков',
  'пушкин',
  'эрмитаж',
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

const { rows } = await pool.query(`
  select v.id, v.title, v.kind, v."pageStatus", c.title as city, v.address,
         count(distinct e.id)::int as events
  from "Venue" v
  left join "City" c on c.id = v."cityId"
  left join "Event" e on e."venueId" = v.id
  where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
    and (${patterns.map((_, i) => `v.title ~* $${i + 1}`).join(' or ')})
  group by v.id, c.title
  order by c.title, events desc, v.title
`, patterns);

console.log(JSON.stringify(rows, null, 2));
await pool.end();
