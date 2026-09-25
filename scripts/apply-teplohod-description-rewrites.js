/**
 * Apply reviewed AI/editorial rewrites into EventOverride.description.
 *
 * Input: tmp/teplohod-rewrites.json
 *   [{ "id": "evt_tep_...", "rewrittenDescription": "..." }, ...]
 *
 * Usage:
 *   1) pwsh scripts/mcp-postgres-tunnel.ps1 -Background
 *   2) set DATABASE_URL=postgresql://USER:PASS@127.0.0.1:5433/daibilet
 *   3) node scripts/apply-teplohod-description-rewrites.js --dry-run
 *   4) node scripts/apply-teplohod-description-rewrites.js --apply
 *
 * Does NOT touch Event.source description. Upserts override.description only.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
const requireFromDb = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDb("pg");

const INPUT = process.env.REWRITE_INPUT || path.join(rootDir, "tmp", "teplohod-rewrites.json");
const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--apply");

function loadRootEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}

async function main() {
  loadRootEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required (tunnel to MSK Postgres recommended)");
  }
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Missing input ${INPUT}`);
  }

  const rows = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  const items = Array.isArray(rows) ? rows : rows.items || [];
  const ready = items
    .map((x) => ({
      id: String(x.id || "").trim(),
      text: String(x.rewrittenDescription || x.description || "").trim(),
      title: x.title || null,
      slug: x.slug || null,
    }))
    .filter((x) => x.id && x.text);

  console.log(JSON.stringify({ mode: dryRun ? "dry-run" : "apply", input: INPUT, count: ready.length }, null, 2));
  if (!ready.length) throw new Error("No rewrites to apply");

  if (dryRun) {
    for (const row of ready.slice(0, 5)) {
      console.log(`- ${row.id} ${row.slug || ""} chars=${row.text.length}`);
    }
    if (ready.length > 5) console.log(`... +${ready.length - 5} more`);
    return;
  }

  const pool = new Pool({ connectionString, max: 2, application_name: "teplohod_rewrite_apply" });
  const client = await pool.connect();
  let updated = 0;
  try {
    await client.query("begin");
    for (const row of ready) {
      const exists = await client.query(`select id from "Event" where id = $1`, [row.id]);
      if (!exists.rowCount) {
        console.warn("skip missing event", row.id);
        continue;
      }
      // Prisma @default(cuid()) is client-side only - DB has no default on id.
      const overrideId = `eov_${crypto.randomBytes(12).toString("hex")}`;
      await client.query(
        `
        insert into "EventOverride" (id, "eventId", description, "createdAt", "updatedAt")
        values ($1, $2, $3, now(), now())
        on conflict ("eventId") do update
          set description = excluded.description,
              "updatedAt" = now()
        `,
        [overrideId, row.id, row.text],
      );
      updated += 1;
      console.log("upsert", row.id, row.slug || "");
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
  console.log(JSON.stringify({ updated }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
