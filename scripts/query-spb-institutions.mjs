const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

async function main() {
  const { rows } = await pool.query(`
    select v.id, v.title, v.kind, v."pageStatus", c.title as city, v.address,
           count(distinct e.id)::int as events
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    left join "Event" e on e."venueId" = v.id
    where c.title in ('Санкт-Петербург', 'Пушкин', 'Петергоф', 'Павловск', 'Гатчина', 'Петродворец')
      and v.kind in ('MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'ATTRACTION', 'OTHER')
      and coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
    group by v.id, c.title
    order by events desc nulls last, v.title
    limit 50
  `);
  console.log(JSON.stringify(rows, null, 2));
}

main().finally(() => pool.end());
