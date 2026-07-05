const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

async function main() {
  const stats = await pool.query(`
    select
      count(*)::int as total,
      count(*) filter (
        where coalesce(trim(description), '') = ''
          and coalesce(trim("shortDescription"), '') = ''
      )::int as without_description
    from "Venue"
    where coalesce("pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
  `);

  const result = await pool.query(`
    select
      v.id,
      v.title,
      v.kind,
      c.title as city,
      v.address,
      count(distinct e.id)::int as events
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    left join "Event" e on e."venueId" = v.id
    where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
      and coalesce(trim(v.description), '') = ''
      and coalesce(trim(v."shortDescription"), '') = ''
    group by v.id, c.title
    order by events desc, c.title nulls last, v.title
  `);

  const payload = {
    generatedAt: new Date().toISOString(),
    total: stats.rows[0].total,
    withoutDescription: stats.rows[0].without_description,
    items: result.rows.map((row) => ({
      id: row.id,
      name: row.title,
      city: row.city,
      address: row.address,
      events: row.events,
      type: row.kind,
    })),
  };

  console.log(JSON.stringify(payload, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => pool.end());
