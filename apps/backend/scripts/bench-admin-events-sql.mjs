/**
 * Bench: admin events SQL read-model vs legacy full grouped cache path.
 * Usage: DATABASE_URL=... node apps/backend/scripts/bench-admin-events-sql.mjs
 */
import pg from 'pg';
import { buildAdminEventsList, invalidateAdminGroupedEventsCache } from '../src/dto.js';
import {
  invalidateAdminEventsSqlReadModelCache,
  queryAdminEventGroupsPage,
} from '../src/admin-events-sql-read-model.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = { query: (text, params) => pool.query(text, params) };

async function timed(label, fn) {
  const started = Date.now();
  const memBefore = process.memoryUsage().heapUsed;
  const result = await fn();
  const ms = Date.now() - started;
  const memAfter = process.memoryUsage().heapUsed;
  const payload = {
    label,
    ms,
    heapDeltaMb: Number(((memAfter - memBefore) / 1024 / 1024).toFixed(2)),
    total: result.total,
    rows: result.rows?.length ?? result.pageGroups?.length,
    rowsLoaded: result.metrics?.rowsLoaded ?? result.rowsLoaded,
    readModel: result.metrics?.readModel ?? result.readModel,
    sourceEvents: result.metrics?.sourceEvents ?? result.sourceCount,
    groupedEvents: result.metrics?.groupedEvents ?? result.groupedEvents,
    cacheHit: result.cacheHit,
  };
  console.log(JSON.stringify(payload));
  return result;
}

invalidateAdminGroupedEventsCache();
invalidateAdminEventsSqlReadModelCache();

await timed('sql-page-cold', () => queryAdminEventGroupsPage(db, new URLSearchParams('limit=80&page=1')));
await timed('sql-page-warm', () => queryAdminEventGroupsPage(db, new URLSearchParams('limit=80&page=1')));
await timed('events-list-cold', () => {
  invalidateAdminEventsSqlReadModelCache();
  return buildAdminEventsList(db, new URLSearchParams('limit=80&page=1'));
});
await timed('events-list-warm', () => buildAdminEventsList(db, new URLSearchParams('limit=80&page=1')));
await timed('events-list-page2', () => buildAdminEventsList(db, new URLSearchParams('limit=80&page=2')));

await pool.end();
