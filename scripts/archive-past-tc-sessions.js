const path = require("path");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet",
  max: 1,
});

const SOURCE_ID = "src_ticketscloud";
const graceHours = resolveGraceHours(process.env.TICKETSCLOUD_SESSION_ARCHIVE_GRACE_HOURS);
const dryRun = !process.argv.includes("--apply") || process.argv.includes("--dry-run");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => pool.end());

async function main() {
  const client = await pool.connect();
  try {
    await client.query(dryRun ? "BEGIN READ ONLY" : "BEGIN");
    const query = dryRun
      ? `
          select count(*)::int as count
          from "EventSession" session
          where session."archivedAt" is null
            and session."startsAt" is not null
            and session."startsAt" <= session."endsAt"
            and session."endsAt" < now() - ($2 * interval '1 hour')
            and exists (
              select 1 from "EventSourceLink" link
              where link."eventId" = session."eventId" and link."sourceId" = $1
            )
        `
      : `
          update "EventSession" session
          set "isActive" = false,
              "archivedAt" = now(),
              "archiveReason" = 'session_ended'
          where session."archivedAt" is null
            and session."startsAt" is not null
            and session."startsAt" <= session."endsAt"
            and session."endsAt" < now() - ($2 * interval '1 hour')
            and exists (
              select 1 from "EventSourceLink" link
              where link."eventId" = session."eventId" and link."sourceId" = $1
            )
          returning session.id
        `;
    const result = await client.query(query, [SOURCE_ID, graceHours]);
    if (dryRun) {
      await client.query("ROLLBACK");
      console.log(JSON.stringify({ mode: "dry-run", source: "TICKETSCLOUD", graceHours, eligible: result.rows[0]?.count ?? 0 }, null, 2));
      return;
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ mode: "archive", source: "TICKETSCLOUD", graceHours, archived: result.rowCount || 0 }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function resolveGraceHours(value) {
  const parsed = value == null || value === "" ? 2 : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 72) {
    throw new Error("TICKETSCLOUD_SESSION_ARCHIVE_GRACE_HOURS must be between 0 and 72");
  }
  return parsed;
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
