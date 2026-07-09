const fs = require('fs');
const { createRequire } = require('module');
const requireFromDb = createRequire('/opt/daibilet/packages/db/package.json');
const { Pool } = requireFromDb('pg');
for (const l of fs.readFileSync('/opt/daibilet/.env', 'utf8').split('\n')) {
  const m = l.match(/^DATABASE_URL=(.*)/);
  if (m) process.env.DATABASE_URL = m[1].replace(/^['"]|['"]$/g, '');
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BLOCKED = new Set(['paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden']);
function isBlocked(s) {
  const st = [s.sourceStatus, s.eventSourceStatus].map((v) => String(v || '').toLowerCase());
  if (st.some((x) => BLOCKED.has(x))) return true;
  if (s.purchaseReady === false) return true;
  if (s.vacant === 0) return true;
  if (!s.purchaseUrl && s.purchaseReady !== true) return true;
  return false;
}

function canBuy(session) {
  const variants = [session, ...(session.upcomingSlots || []).map((slot) => ({
    ...session,
    purchaseUrl: slot.purchaseUrl || session.purchaseUrl,
    purchaseReady: slot.purchaseReady ?? session.purchaseReady,
    vacant: slot.vacant ?? session.vacant,
    sourceStatus: slot.sourceStatus ?? session.sourceStatus,
  }))];
  return variants.some((v) => {
    if (isBlocked(v)) return false;
    return Boolean(v.purchaseUrl || v.widgetUrl);
  });
}

(async () => {
  const dto = await import('/opt/daibilet/apps/backend/src/dto.js');
  const db = { query: (...args) => pool.query(...args) };
  const rows = await db.query(`
    select v.slug, v.title, v."pageStatus", v.kind, count(e.id)::int as events
    from "Venue" v
    left join "Event" e on e."venueId" = v.id and e."sourceStatus" not in ('HIDDEN','DRAFT')
    where coalesce(v."pageStatus"::text, 'NONE') not in ('HIDDEN')
    group by v.id
    having count(e.id) > 0
    order by events desc
    limit 200
  `);

  const summary = { checked: 0, noPage: 0, noSessions: 0, allBlocked: 0, samples: [] };
  for (const row of rows.rows) {
    summary.checked += 1;
    const page = await dto.buildPublicVenuePage(db, row.slug);
    if (!page) {
      summary.noPage += 1;
      if (summary.samples.length < 10) summary.samples.push({ slug: row.slug, title: row.title, issue: 'no_page', dbEvents: row.events });
      continue;
    }
    const sessions = page.sessions || [];
    if (!sessions.length) {
      summary.noSessions += 1;
      if (summary.samples.length < 10) summary.samples.push({ slug: row.slug, title: row.title, issue: 'no_sessions', dbEvents: row.events });
      continue;
    }
    const blocked = sessions.filter((s) => !canBuy(s));
    if (blocked.length === sessions.length) {
      summary.allBlocked += 1;
      if (summary.samples.length < 15) summary.samples.push({ slug: row.slug, title: row.title, issue: 'all_blocked', count: sessions.length });
    }
  }
  console.log(JSON.stringify(summary, null, 2));
  await pool.end();
})();
