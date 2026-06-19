import { createRequire } from 'node:module';
import path from 'node:path';

let pool;

export function createDb(rootDir) {
  const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
  const { Pool } = requireFromDbPackage('pg');
  const connectionString = process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

  pool ??= new Pool({ connectionString, max: 3 });

  return {
    query(text, params) {
      return pool.query(text, params);
    },

    async stats() {
      const result = await pool.query(`
        select 'events' as key, count(*)::int as value from "Event"
        union all select 'venues', count(*)::int from "Venue"
        union all select 'cities', count(*)::int from "City"
        union all select 'tags', count(*)::int from "Tag"
        union all select 'sessions', count(*)::int from "EventSession"
        union all select 'offers', count(*)::int from "EventOffer"
        union all select 'sources', count(*)::int from "Source"
      `);
      return Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
    },

    async recentEvents(limit = 20) {
      const result = await pool.query(
        `
          select
            e.id,
            e.title,
            e.slug,
            e."priceFromRub",
            e."ticketsVacant",
            e.status,
            e.kind,
            c.title as city,
            v.title as venue,
            s."startsAt"
          from "Event" e
          left join "City" c on c.id = e."primaryCityId"
          left join "Venue" v on v.id = e."venueId"
          left join "EventSession" s on s."eventId" = e.id
          order by s."startsAt" asc nulls last
          limit $1
        `,
        [limit],
      );
      return result.rows;
    },
  };
}
