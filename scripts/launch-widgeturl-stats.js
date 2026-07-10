/**
 * Count TC offers without widgetUrl and related launch metrics.
 * Usage: node scripts/launch-widgeturl-stats.js
 */
const path = require("path");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

const connectionString = process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet";

async function main() {
  const pool = new Pool({ connectionString, max: 2 });
  const client = await pool.connect();
  try {
    const stats = {};

    const tcOffers = await client.query(`
      select
        count(*)::int as total,
        count(*) filter (where coalesce("widgetUrl", '') = '')::int as without_widget_url,
        count(*) filter (where coalesce("widgetUrl", '') <> '')::int as with_widget_url
      from "EventOffer"
      where "sourceCode" = 'TICKETSCLOUD' and active is not false
    `);
    stats.tcOffers = tcOffers.rows[0];

    const publishedBroken = await client.query(`
      select count(distinct e.id)::int as count
      from "Event" e
      join "EventOffer" o on o."eventId" = e.id and o."sourceCode" = 'TICKETSCLOUD'
      where e.status::text in ('READY', 'PUBLISHED')
        and coalesce(o."widgetUrl", '') = ''
    `);
    stats.publishedTcEventsWithoutWidgetUrl = publishedBroken.rows[0]?.count ?? 0;

    const tepOrphans = await client.query(`
      select count(*)::int as count
      from (
        select l."eventId"
        from "EventSourceLink" l
        left join "EventSession" s on s."eventId" = l."eventId"
        where l."sourceId" = 'src_teplohod'
        group by l."eventId"
        having count(s.id) = 0
      ) x
    `);
    stats.tepEventsWithoutSessions = tepOrphans.rows[0]?.count ?? 0;

    const lastSync = await client.query(`
      select id, status, stats, "finishedAt"
      from "SourceSyncRun"
      where "sourceId" = 'src_ticketscloud'
      order by "startedAt" desc
      limit 1
    `);
    stats.lastTcSync = lastSync.rows[0] || null;

    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), ...stats }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

function loadRootEnv(projectRoot) {
  const fs = require("fs");
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
