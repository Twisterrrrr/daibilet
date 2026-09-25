import pg from 'pg';
import type { DbClient, QueryResult } from './types/db.js';

interface PgPool {
  query<Row = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<QueryResult<Row>>;
}

export interface DbStatsRow {
  key: string;
  value: number;
}

export interface RecentEventRow {
  id: string;
  title: string;
  slug: string;
  priceFromRub?: number | null;
  ticketsVacant?: number | null;
  status?: string | null;
  kind?: string | null;
  city?: string | null;
  venue?: string | null;
  startsAt?: Date | string | null;
}

let pool: PgPool | undefined;

export function createDb(_rootDir?: string): DbClient {
  const { Pool } = pg;
  const connectionString = process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

  pool ??= new Pool({ connectionString, max: 3 });

  return {
    query<Row = Record<string, unknown>>(text: string, params?: readonly unknown[]) {
      return getPool().query<Row>(text, params);
    },

    async stats() {
      const result = await getPool().query<DbStatsRow>(`
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
      const result = await getPool().query<RecentEventRow>(
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

function getPool(): PgPool {
  if (!pool) throw new Error('Database pool is not initialized');
  return pool;
}

