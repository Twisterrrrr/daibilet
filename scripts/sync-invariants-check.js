const path = require("path");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

const connectionString = process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet";
const TC_SOURCE = "src_ticketscloud";
const TEP_SOURCE = "src_teplohod";
const MISSING_FROM_CATALOG_WARN = Number(process.env.SYNC_MISSING_WARN_THRESHOLD || 50);

async function main() {
  const pool = new Pool({ connectionString, max: 2 });
  const client = await pool.connect();
  const checks = [];

  try {
    checks.push(await checkNamed(client, "tc_events_without_source_link", `
      select count(*)::int as count
      from "Event" e
      join "EventOffer" o on o."eventId" = e.id and o."sourceCode" = 'TICKETSCLOUD'
      left join "EventSourceLink" l on l."eventId" = e.id and l."sourceId" = $1
      where l.id is null
    `, [TC_SOURCE]));

    checks.push(await checkNamed(client, "tep_events_without_source_link", `
      select count(*)::int as count
      from "Event" e
      join "EventOffer" o on o."eventId" = e.id and o."sourceCode" = 'TEPLOHOD'
      left join "EventSourceLink" l on l."eventId" = e.id and l."sourceId" = $1
      where l.id is null
    `, [TEP_SOURCE]));

    checks.push(await checkNamed(client, "tc_offers_without_widget_url", `
      select count(*)::int as count
      from "EventOffer"
      where "sourceCode" = 'TICKETSCLOUD'
        and active is not false
        and ("widgetUrl" is null or "widgetUrl" = '')
    `));

    checks.push(await checkNamed(client, "tep_offers_without_deeplink", `
      select count(*)::int as count
      from "EventOffer"
      where "sourceCode" = 'TEPLOHOD'
        and active is not false
        and ("deeplinkUrl" is null or "deeplinkUrl" = '')
        and ("widgetUrl" is null or "widgetUrl" = '')
    `));

    checks.push(await checkNamed(client, "tc_provider_links", `
      select count(*)::int as count
      from "ProviderLink"
      where "sourceId" = $1
    `, [TC_SOURCE], { min: 1 }));

    checks.push(await checkNamed(client, "tep_provider_links", `
      select count(*)::int as count
      from "ProviderLink"
      where "sourceId" = $1
    `, [TEP_SOURCE], { min: 1 }));

    checks.push(await checkNamed(client, "tc_sessions_without_external_id", `
      select count(*)::int as count
      from "EventSession" s
      join "EventSourceLink" l on l."eventId" = s."eventId" and l."sourceId" = $1
      where s."externalId" is null or s."externalId" = ''
    `, [TC_SOURCE]));

    checks.push(await checkNamed(client, "tep_events_without_sessions", `
      select count(*)::int as count
      from (
        select l."eventId"
        from "EventSourceLink" l
        left join "EventSession" s on s."eventId" = l."eventId"
        where l."sourceId" = $1
        group by l."eventId"
        having count(s.id) = 0
      ) orphan_events
    `, [TEP_SOURCE]));

    checks.push(await checkLastSyncFailed(client, TC_SOURCE, "tc_last_sync_failed"));
    checks.push(await checkLastSyncFailed(client, TEP_SOURCE, "tep_last_sync_failed"));
    checks.push(await checkMissingFromCatalog(client, TC_SOURCE, "tc_missing_from_catalog"));
    checks.push(await checkMissingFromCatalog(client, TEP_SOURCE, "tep_missing_from_catalog"));

    checks.push(await checkNamed(client, "hidden_events_with_ready_status_conflict", `
      select count(*)::int as count
      from "Event" e
      join "EventOverride" o on o."eventId" = e.id
      where e.status::text <> 'HIDDEN'
        and o."editorStatus"::text = 'HIDDEN'
    `));

    const failed = checks.filter((check) => !check.ok).length;
    const report = {
      checkedAt: new Date().toISOString(),
      database: connectionString.replace(/:[^:@/]+@/, ":***@"),
      ok: failed === 0,
      failed,
      checks,
    };

    console.log(JSON.stringify(report, null, 2));
    process.exitCode = failed > 0 ? 1 : 0;
  } finally {
    client.release();
    await pool.end();
  }
}

async function checkNamed(client, id, sql, params = [], options = {}) {
  const result = await client.query(sql, params);
  let count = 0;
  if (options.aggregate === "groups") {
    count = result.rowCount ?? result.rows.length;
  } else {
    count = result.rows[0]?.count ?? 0;
  }

  const max = options.max ?? 0;
  const min = options.min ?? null;
  let ok = count <= max;
  if (min != null) ok = count >= min;

  return {
    id,
    ok,
    count,
    max: min != null ? undefined : max,
    min: min ?? undefined,
    severity: ok ? "ok" : count > max * 10 && max === 0 ? "critical" : "warn",
  };
}

async function checkLastSyncFailed(client, sourceId, id) {
  const result = await client.query(
    `
      select status, "finishedAt", error
      from "SourceSyncRun"
      where "sourceId" = $1
      order by "startedAt" desc
      limit 1
    `,
    [sourceId],
  );
  const row = result.rows[0];
  if (!row) {
    return { id, ok: true, count: 0, note: "no sync runs" };
  }
  const ok = row.status !== "FAILED";
  return {
    id,
    ok,
    count: ok ? 0 : 1,
    lastStatus: row.status,
    finishedAt: row.finishedAt,
    error: row.error ? String(row.error).slice(0, 200) : null,
  };
}

async function checkMissingFromCatalog(client, sourceId, id) {
  const result = await client.query(
    `
      select stats, "finishedAt"
      from "SourceSyncRun"
      where "sourceId" = $1 and status = 'SUCCESS'
      order by "startedAt" desc
      limit 1
    `,
    [sourceId],
  );
  const stats = result.rows[0]?.stats || {};
  const missing = Number(stats.missingFromCatalog || 0);
  const ok = missing <= MISSING_FROM_CATALOG_WARN;
  return {
    id,
    ok,
    count: missing,
    max: MISSING_FROM_CATALOG_WARN,
    finishedAt: result.rows[0]?.finishedAt || null,
    severity: missing > MISSING_FROM_CATALOG_WARN ? "warn" : "ok",
  };
}

function loadRootEnv(projectRoot) {
  const fs = require("fs");
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
