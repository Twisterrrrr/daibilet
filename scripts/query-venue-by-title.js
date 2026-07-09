const { Pool } = require('pg');

const terms = ['русск', 'юсупов', 'мариин', 'крови', 'кунсткамер', 'спас на', 'казанск', 'михайловск', 'аничков', 'юсупов', 'эрарта', 'фаберже'];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

async function main() {
  const { rows } = await pool.query(`
    select v.id, v.title, v.kind, c.title as city, count(distinct e.id)::int as events
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    left join "Event" e on e."venueId" = v.id
    where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
      and (${terms.map((_, i) => `v.title ~* $${i + 1}`).join(' or ')})
    group by v.id, c.title
    order by events desc
    limit 30
  `, terms);
  console.log(JSON.stringify(rows, null, 2));
}

main().finally(() => pool.end());
