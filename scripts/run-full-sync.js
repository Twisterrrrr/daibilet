const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

const steps = [
  { name: "Ticketscloud gRPC full sync", fn: runTcFullSync },
  { name: "Build TC SQL seed", fn: runBuildSeedSqlAsync },
  { name: "Apply TC SQL seed", fn: runApplySeedSql },
  { name: "Teplohod import", fn: runTeplohodImport },
];

async function main() {
  const startedAt = Date.now();
  console.log(`[full-sync] started at ${new Date().toISOString()}`);

  for (const step of steps) {
    const stepStartedAt = Date.now();
    console.log(`[full-sync] → ${step.name}`);
    await step.fn();
    console.log(`[full-sync] ✓ ${step.name} (${Math.round((Date.now() - stepStartedAt) / 1000)}s)`);
  }

  console.log(`[full-sync] finished in ${Math.round((Date.now() - startedAt) / 1000)}s`);
}

function runTcFullSync() {
  runNodeScript("tc-full-sync.js");
}

function runBuildSeedSql() {
  const mapPath = path.join(rootDir, "data", "db", "existing-city-slugs.json");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet",
    max: 1,
  });
  return pool
    .query('SELECT id, slug FROM "City"')
    .then((result) => {
      const slugMap = Object.fromEntries(result.rows.map((row) => [row.slug, row.id]));
      fs.mkdirSync(path.dirname(mapPath), { recursive: true });
      fs.writeFileSync(mapPath, JSON.stringify(slugMap), "utf8");
      runNodeScript("db-build-tc-seed-sql.js", {
        EXISTING_CITY_SLUG_MAP: JSON.stringify(slugMap),
      });
    })
    .finally(() => pool.end());
}

async function runBuildSeedSqlAsync() {
  await runBuildSeedSql();
}

async function runApplySeedSql() {
  const sqlPath = path.join(rootDir, "data", "db", "ticketscloud-seed.sql");
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Missing seed file: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet",
    max: 1,
  });

  try {
    console.log(`[full-sync] applying ${Math.round(sql.length / 1024 / 1024)} MB SQL...`);
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

function runTeplohodImport() {
  runNodeScript("tep-import-fixtures.js");
}

function runNodeScript(scriptName, extraEnv = {}) {
  const result = spawnSync(process.execPath, [path.join(__dirname, scriptName)], {
    cwd: rootDir,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${scriptName} failed with exit code ${result.status}`);
  }
}

function loadRootEnv(baseDir) {
  for (const name of [".env", "apps/backend/.env"]) {
    const filePath = path.join(baseDir, name);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

main().catch((error) => {
  console.error("[full-sync] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
